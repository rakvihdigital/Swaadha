-- =====================================================================
-- SWAADHA MIGRATION 004: COUPONS, BANNERS & STORAGE BUCKETS
-- Run this in your Supabase SQL Editor
-- =====================================================================

begin;

-- 1. Ensure public.admins table exists first
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Kitchen admin',
  email text not null default '',
  role text not null default 'owner' check (role in ('owner','staff')),
  permissions text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.admins add column if not exists name text not null default 'Kitchen admin';
alter table public.admins add column if not exists email text not null default '';
alter table public.admins add column if not exists role text not null default 'owner' check (role in ('owner','staff'));
alter table public.admins add column if not exists permissions text[] not null default '{}';
alter table public.admins add column if not exists created_at timestamptz not null default now();

alter table public.admins enable row level security;

-- 2. Extend has_tab() function
create or replace function public.has_tab(tab_name text) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(
   select 1 from public.admins a 
   where a.user_id = auth.uid() 
     and (
       a.role = 'owner' 
       or (
         tab_name in ('dashboard','categories','products','banners','coupons','orders','reports') 
         and tab_name = any(a.permissions)
       )
     )
 );
$$;
revoke all on function public.has_tab(text) from public;
grant execute on function public.has_tab(text) to anon, authenticated;

-- 3. Storage buckets (banners, products, media)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('banners', 'banners', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']),
  ('products', 'products', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']),
  ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view images in public buckets" on storage.objects;
create policy "Public can view images in public buckets"
on storage.objects for select to public
using (bucket_id in ('banners', 'products', 'media'));

drop policy if exists "Admins can upload images" on storage.objects;
create policy "Admins can upload images"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('banners', 'products', 'media')
  and (
    exists (select 1 from public.admins where user_id = auth.uid())
    or auth.role() = 'service_role'
  )
);

drop policy if exists "Admins can update images" on storage.objects;
create policy "Admins can update images"
on storage.objects for update to authenticated
using (
  bucket_id in ('banners', 'products', 'media')
  and (
    exists (select 1 from public.admins where user_id = auth.uid())
    or auth.role() = 'service_role'
  )
);

drop policy if exists "Admins can delete images" on storage.objects;
create policy "Admins can delete images"
on storage.objects for delete to authenticated
using (
  bucket_id in ('banners', 'products', 'media')
  and (
    exists (select 1 from public.admins where user_id = auth.uid())
    or auth.role() = 'service_role'
  )
);

-- 4. Banners table
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  tag text not null default 'THE SWAADHA FAMILY KITCHEN',
  title text not null check (char_length(title) between 1 and 150),
  em text not null default '',
  text text not null default '',
  image text not null,
  label text not null default '',
  href text not null default '/products',
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_banners_order on public.banners (display_order asc, created_at desc);

alter table public.banners enable row level security;

drop policy if exists "Public reads active banners" on public.banners;
create policy "Public reads active banners"
on public.banners for select to anon, authenticated
using (is_active = true or public.has_tab('banners'));

drop policy if exists "Staff can manage banners" on public.banners;
create policy "Staff can manage banners"
on public.banners for all to authenticated
using (public.has_tab('banners'))
with check (public.has_tab('banners'));

grant select on public.banners to anon;
grant select, insert, update, delete on public.banners to authenticated;

insert into public.banners (tag, title, em, text, image, label, href, display_order, is_active)
values
  ('THE SWAADHA FAMILY KITCHEN', 'Rooted in tradition,', 'made with love.', 'Bringing authentic flavors and fresh ingredients from our family kitchen to yours.', '/images/hero.webp', 'Family favorites', '/products', 1, true),
  ('THE CELEBRATION COLLECTION', 'Little sweets,', 'lasting memories.', 'Beautifully packed laddoos for family gatherings, festive moments, and the people you love.', '/images/banner-sweets.jpg', 'Sweet celebrations', '/products?category=Sweets', 2, true),
  ('YOUR EVERYDAY RITUAL', 'A little crunch,', 'a lot of comfort.', 'Traditional Chakkuli and Nippattu. Familiar favorites for slow afternoons and a warm cup of tea.', '/images/banner-snacks.jpg', 'Tea-time favorites', '/products?category=Snacks', 3, true),
  ('A SPOONFUL OF HOME', 'Familiar spices,', 'unforgettable flavor.', 'From fragrant sambar powder to bold masalas. Bring a little of our kitchen into your everyday cooking.', '/images/banner-spices.jpg', 'The spice pantry', '/products?category=Pantry', 4, true)
on conflict do nothing;

-- 5. Coupons table
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (char_length(code) between 2 and 30),
  description text not null default '',
  discount_type text not null default 'percentage' check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  min_order_value numeric(10,2) not null default 0 check (min_order_value >= 0),
  max_discount numeric(10,2) check (max_discount is null or max_discount > 0),
  expiry_date timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  times_used integer not null default 0 check (times_used >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_coupons_code on public.coupons (upper(code));

alter table public.coupons enable row level security;

drop policy if exists "Public reads active coupons" on public.coupons;
create policy "Public reads active coupons"
on public.coupons for select to anon, authenticated
using (
  (is_active = true and (expiry_date is null or expiry_date > now()))
  or public.has_tab('coupons')
);

drop policy if exists "Staff can manage coupons" on public.coupons;
create policy "Staff can manage coupons"
on public.coupons for all to authenticated
using (public.has_tab('coupons'))
with check (public.has_tab('coupons'));

grant select on public.coupons to anon;
grant select, insert, update, delete on public.coupons to authenticated;

insert into public.coupons (code, description, discount_type, discount_value, min_order_value, max_discount, usage_limit, is_active)
values
  ('WELCOME10', '10% off on your first homemade order', 'percentage', 10, 300, 150, 1000, true),
  ('FESTIVE50', 'Flat ₹50 off on orders above ₹500', 'fixed', 50, 500, null, 500, true),
  ('SWEET20', '20% off on festive sweets & family packs', 'percentage', 20, 600, 200, 500, true)
on conflict (code) do nothing;

-- 6. Add coupon columns to orders
alter table public.orders add column if not exists coupon_code text default '';
alter table public.orders add column if not exists discount numeric(10,2) not null default 0;

-- 7. Validate coupon RPC
create or replace function public.validate_coupon(p_code text, p_cart_total numeric)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_coupon public.coupons%rowtype;
  v_discount numeric := 0;
begin
  if p_code is null or trim(p_code) = '' then
    return jsonb_build_object('valid', false, 'message', 'Please enter a coupon code.');
  end if;

  select * into v_coupon from public.coupons
  where upper(code) = upper(trim(p_code)) and is_active = true;

  if not found then
    return jsonb_build_object('valid', false, 'message', 'Coupon code is invalid or inactive.');
  end if;

  if v_coupon.expiry_date is not null and v_coupon.expiry_date < now() then
    return jsonb_build_object('valid', false, 'message', 'This coupon has expired.');
  end if;

  if v_coupon.usage_limit is not null and v_coupon.times_used >= v_coupon.usage_limit then
    return jsonb_build_object('valid', false, 'message', 'Coupon usage limit has been reached.');
  end if;

  if p_cart_total < v_coupon.min_order_value then
    return jsonb_build_object(
      'valid', false,
      'message', format('Add items worth ₹%s more to use this coupon (min order ₹%s).',
        round(v_coupon.min_order_value - p_cart_total, 2),
        round(v_coupon.min_order_value, 2))
    );
  end if;

  if v_coupon.discount_type = 'percentage' then
    v_discount := round((p_cart_total * v_coupon.discount_value / 100), 2);
    if v_coupon.max_discount is not null and v_discount > v_coupon.max_discount then
      v_discount := v_coupon.max_discount;
    end if;
  else
    v_discount := least(v_coupon.discount_value, p_cart_total);
  end if;

  return jsonb_build_object(
    'valid', true,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'discount_amount', v_discount,
    'final_total', greatest(0, p_cart_total - v_discount),
    'message', format('Coupon %s applied! Saved ₹%s', v_coupon.code, v_discount)
  );
end $$;

revoke all on function public.validate_coupon(text, numeric) from public;
grant execute on function public.validate_coupon(text, numeric) to anon, authenticated;

-- 8. Place order function
create or replace function public.place_order(
  p_name text,
  p_phone text,
  p_address text,
  p_city text,
  p_state text,
  p_pincode text,
  p_date date,
  p_items jsonb,
  p_checkout_key uuid,
  p_coupon_code text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  entry record;
  product public.products%rowtype;
  qty integer;
  subtotal numeric := 0;
  discount_amount numeric := 0;
  final_total numeric := 0;
  snapshot jsonb := '[]';
  new_id uuid;
  buyer_email text;
  v_coupon public.coupons%rowtype;
  clean_coupon text := upper(trim(coalesce(p_coupon_code, '')));
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

  for entry in select (x->>'product_id')::uuid product_id,sum((x->>'quantity')::integer)::integer quantity from jsonb_array_elements(p_items) x group by 1 order by 1 loop
    qty:=entry.quantity;
    if qty not between 1 and 100 then raise exception 'Quantity must be between 1 and 100 per product.'; end if;
    select * into product from public.products where id=entry.product_id for update;
    if not found or not product.available or not exists(select 1 from public.categories c where c.name=product.category and c.enabled) then raise exception 'A cart item is no longer available.'; end if;
    if product.stock<qty then raise exception 'Insufficient stock for %. Only % packs remain.',product.name,product.stock; end if;
    subtotal := subtotal + product.price * qty;
    snapshot := snapshot || jsonb_build_array(jsonb_build_object('product_id',product.id,'name',product.name,'sku',product.sku,'weight',product.weight,'net_weight_grams',product.net_weight_grams,'price',product.price,'quantity',qty));
    update public.products set stock=stock-qty where id=product.id;
  end loop;

  if clean_coupon <> '' then
    select * into v_coupon from public.coupons where upper(code) = clean_coupon and is_active = true for update;
    if found and (v_coupon.expiry_date is null or v_coupon.expiry_date > now()) and (v_coupon.usage_limit is null or v_coupon.times_used < v_coupon.usage_limit) and subtotal >= v_coupon.min_order_value then
      if v_coupon.discount_type = 'percentage' then
        discount_amount := round((subtotal * v_coupon.discount_value / 100), 2);
        if v_coupon.max_discount is not null and discount_amount > v_coupon.max_discount then
          discount_amount := v_coupon.max_discount;
        end if;
      else
        discount_amount := least(v_coupon.discount_value, subtotal);
      end if;
      update public.coupons set times_used = times_used + 1 where id = v_coupon.id;
    else
      clean_coupon := '';
      discount_amount := 0;
    end if;
  end if;

  final_total := greatest(0, subtotal - discount_amount);
  new_id := gen_random_uuid();
  insert into public.orders(
    id, customer_id, customer_name, phone, address, city, state, pincode, email, requested_date,
    total, items, checkout_key, inventory_reserved, payment_method, invoice_number, coupon_code, discount
  )
  values(
    new_id, auth.uid(), trim(p_name), p_phone, trim(p_address), trim(p_city), trim(p_state), p_pincode, buyer_email, p_date,
    final_total, snapshot, p_checkout_key, true, 'COD', 'SW-'||upper(replace(new_id::text,'-','')), clean_coupon, discount_amount
  );
  return new_id;
end $$;

revoke all on function public.place_order(text,text,text,text,text,text,date,jsonb,uuid,text) from public,anon;
grant execute on function public.place_order(text,text,text,text,text,text,date,jsonb,uuid,text) to authenticated;

-- Overload for backwards compatibility (9 parameters)
create or replace function public.place_order(
  p_name text,
  p_phone text,
  p_address text,
  p_city text,
  p_state text,
  p_pincode text,
  p_date date,
  p_items jsonb,
  p_checkout_key uuid
) returns uuid language sql security definer set search_path='' as $$
  select public.place_order(p_name, p_phone, p_address, p_city, p_state, p_pincode, p_date, p_items, p_checkout_key, null);
$$;
revoke all on function public.place_order(text,text,text,text,text,text,date,jsonb,uuid) from public,anon;
grant execute on function public.place_order(text,text,text,text,text,text,date,jsonb,uuid) to authenticated;

commit;
