-- =====================================================================
-- SWAADHA KITCHEN — MIGRATION 005
-- POS Billing Tab, Product Barcodes, and Category Images
-- =====================================================================

begin;

-- 1. Add image column to categories if not exists
alter table public.categories add column if not exists image text not null default '';

-- 2. Add barcode column to products if not exists
alter table public.products add column if not exists barcode text not null default '';

-- 3. Populate default images for standard categories if empty
update public.categories set image = '/images/pickle.webp' where name = 'Pickles' and (image is null or image = '');
update public.categories set image = '/images/banner-snacks.jpg' where name = 'Snacks' and (image is null or image = '');
update public.categories set image = '/images/banner-sweets.jpg' where name = 'Sweets' and (image is null or image = '');
update public.categories set image = '/images/banner-spices.jpg' where name = 'Pantry' and (image is null or image = '');

-- 4. Update has_tab helper to include 'pos' in permitted staff tabs
create or replace function public.has_tab(tab_name text) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(
   select 1 from public.admins a 
   where a.user_id = auth.uid() 
     and (
       a.role = 'owner' 
       or (
         tab_name in ('dashboard','pos','categories','products','banners','coupons','orders','reports') 
         and tab_name = any(a.permissions)
       )
     )
 );
$$;
revoke all on function public.has_tab(text) from public;
grant execute on function public.has_tab(text) to anon, authenticated;

-- 5. Ensure owners have 'pos' in their permissions array
update public.admins 
set permissions = array_append(permissions, 'pos')
where role = 'owner' and not ('pos' = any(permissions));

commit;
