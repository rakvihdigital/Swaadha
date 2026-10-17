-- Run once in the Supabase SQL editor.
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
create policy "Admins can read own membership" on public.admins for select to authenticated using (user_id = auth.uid());
-- No browser writes to membership: provision admins in the SQL editor only.
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  category text not null check (category in ('Pickles','Snacks','Sweets','Pantry')),
  description text not null check (char_length(description) <= 1000),
  price numeric(10,2) not null check (price >= 0),
  weight text not null,
  image text not null check (image like 'https://%'),
  available boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "Public reads available products" on public.products for select to anon, authenticated using (available = true);
create policy "Admins manage products" on public.products for all to authenticated
using (exists (select 1 from public.admins where user_id = auth.uid()))
with check (exists (select 1 from public.admins where user_id = auth.uid()));
grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
grant select on public.admins to authenticated;
-- After creating a user in Authentication > Users, substitute their UUID:
-- insert into public.admins (user_id) values ('YOUR-ADMIN-USER-UUID');
