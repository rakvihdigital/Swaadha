-- Run AFTER schema.sql. Re-runnable migration for dashboard, roles, categories and customer orders.
begin;
alter table public.admins add column if not exists name text not null default 'Kitchen admin';
alter table public.admins add column if not exists email text not null default '';
alter table public.admins add column if not exists role text not null default 'owner' check (role in ('owner','staff'));
alter table public.admins add column if not exists permissions text[] not null default '{}';
create or replace function public.has_tab(tab_name text) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.admins a where a.user_id=auth.uid() and (a.role='owner' or (tab_name in ('dashboard','categories','products','orders','reports') and tab_name=any(a.permissions))));
$$;
revoke all on function public.has_tab(text) from public;
grant execute on function public.has_tab(text) to anon, authenticated;
drop policy if exists "Admins can read own membership" on public.admins;
drop policy if exists "Staff membership visibility" on public.admins;
create policy "Staff membership visibility" on public.admins for select to authenticated using (user_id=auth.uid() or public.has_tab('team'));
create table if not exists public.categories(id uuid primary key default gen_random_uuid(),name text unique not null check(char_length(name) between 1 and 80),description text not null default '',enabled boolean not null default true);
insert into public.categories(name) select distinct category from public.products on conflict(name) do nothing;
insert into public.categories(name) values('Pickles'),('Snacks'),('Sweets'),('Pantry') on conflict(name) do nothing;
alter table public.categories enable row level security;
drop policy if exists "Read categories" on public.categories;
create policy "Read categories" on public.categories for select to anon,authenticated using(enabled or public.has_tab('categories') or public.has_tab('products'));
drop policy if exists "Manage categories" on public.categories;
create policy "Manage categories" on public.categories for all to authenticated using(public.has_tab('categories')) with check(public.has_tab('categories'));
alter table public.products drop constraint if exists products_category_check;
do $$ begin if not exists(select 1 from pg_constraint where conname='products_category_fk' and conrelid='public.products'::regclass) then alter table public.products add constraint products_category_fk foreign key(category) references public.categories(name) on update cascade; end if; end $$;
drop policy if exists "Admins manage products" on public.products;
drop policy if exists "Public reads available products" on public.products;
create policy "Public reads available products" on public.products for select to anon,authenticated using(available and exists(select 1 from public.categories c where c.name=category and c.enabled));
drop policy if exists "Product staff access" on public.products;
create policy "Product staff access" on public.products for all to authenticated using(public.has_tab('products')) with check(public.has_tab('products'));
create table if not exists public.orders(
 id uuid primary key default gen_random_uuid(),customer_id uuid references auth.users(id) on delete set null,
 customer_name text not null check(char_length(customer_name) between 1 and 100),phone text not null check(char_length(phone) between 8 and 20),address text not null check(char_length(address) between 10 and 1000),requested_date date not null,
 status text not null default 'pending' check(status in ('pending','confirmed','preparing','dispatched','delivered','cancelled')),
 total numeric(12,2) not null check(total>=0),items jsonb not null,created_at timestamptz not null default now());
create index if not exists orders_customer_idx on public.orders(customer_id);
create index if not exists orders_created_idx on public.orders(created_at);
alter table public.orders enable row level security;
drop policy if exists "Read permitted orders" on public.orders;
create policy "Read permitted orders" on public.orders for select to authenticated using(customer_id=auth.uid() or public.has_tab('orders'));
-- All writes use validated RPCs. Clients cannot supply prices or alter other order fields.
create or replace function public.create_customer_order(p_name text,p_phone text,p_address text,p_date date,p_items jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare entry jsonb; product public.products%rowtype; qty integer; amount numeric:=0; snapshot jsonb:='[]'; new_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to request an order.'; end if;
 if p_date is null or p_date < (now() at time zone 'Asia/Kolkata')::date + 6 then raise exception 'Please allow at least 6 days for a fresh batch.'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Choose between 1 and 30 products.'; end if;
 for entry in select value from jsonb_array_elements(p_items) loop
  qty:=(entry->>'quantity')::integer;
  if qty is null or qty not between 1 and 100 then raise exception 'Quantity must be between 1 and 100.'; end if;
  select p.* into product from public.products p join public.categories c on c.name=p.category where p.id=(entry->>'product_id')::uuid and p.available and c.enabled;
  if not found then raise exception 'A selected product is no longer available.'; end if;
  amount:=amount+product.price*qty;
  snapshot:=snapshot||jsonb_build_array(jsonb_build_object('product_id',product.id,'name',product.name,'weight',product.weight,'price',product.price,'quantity',qty));
 end loop;
 insert into public.orders(customer_id,customer_name,phone,address,requested_date,total,items) values(auth.uid(),trim(p_name),trim(p_phone),trim(p_address),p_date,amount,snapshot) returning id into new_id;
 return new_id;
end $$;
create or replace function public.set_order_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.has_tab('orders') then raise exception 'Order tab access required.'; end if;
 if p_status not in ('pending','confirmed','preparing','dispatched','delivered','cancelled') then raise exception 'Invalid status.'; end if;
 update public.orders set status=p_status where id=p_id;
 if not found then raise exception 'Order not found.'; end if;
end $$;
-- Owners can grant tabs only to an existing Supabase Auth user. Never expose service keys.
create or replace function public.save_staff(p_email text,p_name text,p_permissions text[]) returns void language plpgsql security definer set search_path='' as $$
declare target_id uuid;
begin
 if not public.has_tab('team') then raise exception 'Owner access required.'; end if;
 if p_permissions is null or not (p_permissions <@ array['dashboard','categories','products','orders','reports']::text[]) then raise exception 'Invalid tab permissions.'; end if;
 select id into target_id from auth.users where lower(email)=lower(trim(p_email));
 if target_id is null then raise exception 'Ask this person to create a customer account first, then grant access here.'; end if;
 if target_id=auth.uid() or exists(select 1 from public.admins where user_id=target_id and role='owner') then raise exception 'Owner permissions must be managed in the SQL editor.'; end if;
 insert into public.admins(user_id,email,name,role,permissions) values(target_id,lower(trim(p_email)),left(trim(p_name),100),'staff',p_permissions)
 on conflict(user_id) do update set name=excluded.name,email=excluded.email,permissions=excluded.permissions;
end $$;
create or replace function public.revoke_staff(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.has_tab('team') then raise exception 'Owner access required.'; end if;
 delete from public.admins where user_id=p_id and role='staff';
 if not found then raise exception 'Staff member not found. Owners cannot be removed here.'; end if;
end $$;
create or replace function public.admin_metrics(p_from date,p_to date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not(public.has_tab('dashboard') or public.has_tab('reports')) then raise exception 'Dashboard or report access required.'; end if;
 if p_from is null or p_to is null or p_from>p_to then raise exception 'Choose a valid date range.'; end if;
 with filtered as (select * from public.orders where (created_at at time zone 'Asia/Kolkata')::date between p_from and p_to),
 daily as (select (created_at at time zone 'Asia/Kolkata')::date day,count(*) orders,coalesce(sum(total) filter(where status<>'cancelled'),0) value from filtered group by 1 order by 1),
 status_counts as(select status,count(*) count from filtered group by status),
 product_counts as(select item->>'name' name,sum((item->>'quantity')::integer) quantity,sum((item->>'quantity')::integer*(item->>'price')::numeric) value from filtered cross join lateral jsonb_array_elements(items) item where status<>'cancelled' group by 1 order by 2 desc limit 10)
 select jsonb_build_object('total_orders',(select count(*) from filtered),'pending',(select count(*) from filtered where status='pending'),'order_value',(select coalesce(sum(total),0) from filtered where status<>'cancelled'),'active_products',(select count(*) from public.products p join public.categories c on c.name=p.category where p.available and c.enabled),'daily',coalesce((select jsonb_agg(to_jsonb(daily)) from daily),'[]'::jsonb),'by_status',coalesce((select jsonb_agg(to_jsonb(status_counts)) from status_counts),'[]'::jsonb),'top_products',coalesce((select jsonb_agg(to_jsonb(product_counts)) from product_counts),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.create_customer_order(text,text,text,date,jsonb),public.set_order_status(uuid,text),public.save_staff(text,text,text[]),public.revoke_staff(uuid),public.admin_metrics(date,date) from public;
grant execute on function public.create_customer_order(text,text,text,date,jsonb),public.set_order_status(uuid,text),public.save_staff(text,text,text[]),public.revoke_staff(uuid),public.admin_metrics(date,date) to authenticated;
grant select,insert,update on public.categories to authenticated;
grant select on public.categories to anon;
revoke insert,update,delete on public.orders from anon,authenticated;
grant select on public.orders to authenticated;
revoke insert,update,delete on public.admins from anon,authenticated;
commit;
