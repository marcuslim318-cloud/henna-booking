create table if not exists public.orders (
  id bigint primary key,
  device_id uuid not null,
  appointment_date date not null,
  product_id text,
  product_name text,
  price text,
  custom_image_path text,
  name text not null,
  phone text not null,
  status text not null default 'booked' check (status in ('booked', 'completed', 'cancelled', 'no_show')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_active_booking_per_device_date
  on public.orders (device_id, appointment_date)
  where status <> 'cancelled';

alter table public.orders enable row level security;

create table if not exists public.booking_settings (
  singleton boolean primary key default true check (singleton),
  is_open boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.booking_settings (singleton, is_open)
values (true, true)
on conflict (singleton) do nothing;

alter table public.booking_settings enable row level security;

create table if not exists public.booking_sequence (
  singleton boolean primary key default true check (singleton),
  last_number bigint not null default 0
);

insert into public.booking_sequence (singleton, last_number)
values (true, 0)
on conflict (singleton) do nothing;

create or replace function public.create_booking(
  p_device_id uuid,
  p_appointment_date date,
  p_product_id text,
  p_product_name text,
  p_price text,
  p_custom_image_path text,
  p_name text,
  p_phone text
)
returns setof public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number bigint;
  channel_is_open boolean;
begin
  select is_open into channel_is_open
  from public.booking_settings
  where singleton = true
  for share;

  if channel_is_open is distinct from true then
    raise exception 'booking_channel_closed';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_device_id::text || p_appointment_date::text, 0));
  if exists (
    select 1 from public.orders
    where device_id = p_device_id
      and appointment_date = p_appointment_date
      and status <> 'cancelled'
  ) then
    raise exception 'one_active_booking_per_device_date' using errcode = '23505';
  end if;

  update public.booking_sequence
  set last_number = last_number + 1
  where singleton = true
  returning last_number into next_number;

  return query
  insert into public.orders (id, device_id, appointment_date, product_id, product_name, price, custom_image_path, name, phone)
  values (next_number, p_device_id, p_appointment_date, p_product_id, p_product_name, p_price, p_custom_image_path, p_name, p_phone)
  returning *;
end;
$$;

revoke all on function public.create_booking(uuid, date, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_booking(uuid, date, text, text, text, text, text, text) to service_role;

insert into storage.buckets (id, name, public)
values ('henna-orders', 'henna-orders', false)
on conflict (id) do update set public = false;
