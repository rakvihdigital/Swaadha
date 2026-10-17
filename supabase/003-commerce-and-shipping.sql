-- Apply after schema.sql and 002-admin-and-orders.sql.
begin;
alter table public.products add column if not exists stock integer not null default 0 check(stock>=0);
alter table public.products add column if not exists sku text not null default '';
alter table public.products add column if not exists long_description text not null default '';
alter table public.products add column if not exists ingredients text not null default '';
alter table public.products add column if not exists allergens text not null default '';
alter table public.products add column if not exists shelf_life text not null default '';
alter table public.products add column if not exists storage text not null default '';
alter table public.products add column if not exists net_weight_grams integer not null default 250 check(net_weight_grams>0);
alter table public.orders add column if not exists email text not null default '';
alter table public.orders add column if not exists city text not null default '';
alter table public.orders add column if not exists state text not null default '';
alter table public.orders add column if not exists pincode text not null default '';
alter table public.orders add column if not exists payment_method text not null default 'Manual';
alter table public.orders add column if not exists payment_status text not null default 'unpaid';
alter table public.orders add column if not exists invoice_number text not null default '';
alter table public.orders add column if not exists checkout_key uuid;
alter table public.orders add column if not exists inventory_reserved boolean not null default false;
alter table public.orders add column if not exists shiprocket_order_id bigint;
alter table public.orders add column if not exists shipment_id bigint;
alter table public.orders add column if not exists awb_code text;
alter table public.orders add column if not exists courier_name text;
alter table public.orders add column if not exists tracking_url text;
alter table public.orders add column if not exists shipping_state text;
create unique index if not exists orders_checkout_key on public.orders(customer_id,checkout_key);
-- Disable the previous request endpoint so it cannot bypass inventory checks.
revoke all on function public.create_customer_order(text,text,text,date,jsonb) from public,anon,authenticated;
create or replace function public.place_order(p_name text,p_phone text,p_address text,p_city text,p_state text,p_pincode text,p_date date,p_items jsonb,p_checkout_key uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare entry record; product public.products%rowtype; qty integer; amount numeric:=0; snapshot jsonb:='[]'; new_id uuid; buyer_email text;
begin
 if auth.uid() is null then raise exception 'Sign in to place your order.'; end if;
 if p_checkout_key is null then raise exception 'Checkout key required.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_checkout_key::text,0));
 select id into new_id from public.orders where customer_id=auth.uid() and checkout_key=p_checkout_key;
 if found then return new_id; end if;
 if p_date is null or p_date<(now() at time zone 'Asia/Kolkata')::date+6 then raise exception 'Please allow 6-7 days for preparation.'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'Your cart is invalid.'; end if;
 if jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Choose 1 to 30 products.'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) x where (x->>'quantity') is null or (x->>'quantity') !~ '^[1-9][0-9]{0,2}$' or (x->>'product_id') is null) then raise exception 'Invalid quantity or product.'; end if;
 if trim(p_city)='' or char_length(p_city)>100 or trim(p_state)='' or char_length(p_state)>100 or p_pincode !~ '^[1-9][0-9]{5}$' or p_phone !~ '^[6-9][0-9]{9}$' then raise exception 'Enter a valid Indian delivery address, pincode and 10-digit mobile number.'; end if;
 select email into buyer_email from auth.users where id=auth.uid();
 -- Lock product rows in a consistent order; duplicate cart lines are merged.
 for entry in select (x->>'product_id')::uuid product_id,sum((x->>'quantity')::integer)::integer quantity from jsonb_array_elements(p_items) x group by 1 order by 1 loop
  qty:=entry.quantity;if qty not between 1 and 100 then raise exception 'Quantity must be between 1 and 100 per product.'; end if;
  select * into product from public.products where id=entry.product_id for update;
  if not found or not product.available or not exists(select 1 from public.categories c where c.name=product.category and c.enabled) then raise exception 'A cart item is no longer available.'; end if;
  if product.stock<qty then raise exception 'Insufficient stock for %. Only % packs remain.',product.name,product.stock; end if;
  amount:=amount+product.price*qty;
  snapshot:=snapshot||jsonb_build_array(jsonb_build_object('product_id',product.id,'name',product.name,'sku',product.sku,'weight',product.weight,'net_weight_grams',product.net_weight_grams,'price',product.price,'quantity',qty));
  update public.products set stock=stock-qty where id=product.id;
 end loop;
 new_id:=gen_random_uuid();
 insert into public.orders(id,customer_id,customer_name,phone,address,city,state,pincode,email,requested_date,total,items,checkout_key,inventory_reserved,payment_method,invoice_number)
 values(new_id,auth.uid(),trim(p_name),p_phone,trim(p_address),trim(p_city),trim(p_state),p_pincode,buyer_email,p_date,amount,snapshot,p_checkout_key,true,'COD','SW-'||upper(replace(new_id::text,'-','')));
 return new_id;
end $$;
create or replace function public.set_order_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare current_order public.orders%rowtype; item record;
begin
 if not public.has_tab('orders') then raise exception 'Order tab access required.'; end if;
 if p_status is null or p_status not in ('pending','confirmed','preparing','dispatched','delivered','cancelled') then raise exception 'Invalid status.'; end if;
 select * into current_order from public.orders where id=p_id for update;
 if not found then raise exception 'Order not found.'; end if;
 if current_order.status='cancelled' and p_status<>'cancelled' then raise exception 'Cancelled orders cannot be reopened. Place a new order.'; end if;
 if p_status='cancelled' and current_order.status<>'cancelled' then
  if current_order.status in ('dispatched','delivered') or current_order.shipping_state in ('creating','created','needs_review') then raise exception 'Resolve the shipment before cancelling this order.'; end if;
  if current_order.inventory_reserved then
   for item in select (x->>'product_id')::uuid product_id,(x->>'quantity')::integer quantity from jsonb_array_elements(current_order.items) x order by 1 loop
    update public.products set stock=stock+item.quantity where id=item.product_id;
   end loop;
  end if;
 end if;
 update public.orders set status=p_status,inventory_reserved=case when p_status='cancelled' then false else inventory_reserved end where id=p_id;
end $$;
-- Only the server service client may record shipping-provider results.
create or replace function public.claim_shipment(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.orders set shipping_state='creating' where id=p_id and status in ('confirmed','preparing') and shiprocket_order_id is null and (shipping_state is null or shipping_state='failed');
 return found;
end $$;
revoke all on function public.claim_shipment(uuid) from public,anon,authenticated;
grant execute on function public.claim_shipment(uuid) to service_role;
revoke all on function public.place_order(text,text,text,text,text,text,date,jsonb,uuid) from public,anon;
grant execute on function public.place_order(text,text,text,text,text,text,date,jsonb,uuid) to authenticated;
revoke all on public.orders from anon;
revoke insert,update,delete,truncate on public.orders from authenticated;
grant select on public.orders to authenticated;
grant select,insert,update on public.orders to service_role;
alter table public.orders add column if not exists shipment_status text;
commit;
