create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'operator' check (role in ('operator', 'admin')),
  is_authorized boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (
    type in (
      'collision',
      'breakdown',
      'roadworks',
      'debris',
      'weather',
      'medical',
      'congestion'
    )
  ),
  description text,
  latitude double precision not null check (latitude between 37.85 and 38.2),
  longitude double precision not null check (longitude between 23.55 and 23.9),
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists incidents_created_at_idx on public.incidents (created_at desc);
create index if not exists incidents_type_idx on public.incidents (type);
create index if not exists incidents_location_idx on public.incidents (latitude, longitude);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists incidents_set_updated_at on public.incidents;
create trigger incidents_set_updated_at
  before update on public.incidents
  for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.incidents enable row level security;

create or replace function public.is_authorized_user(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and is_authorized = true
  );
$$;

create or replace function public.is_admin_user(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'admin'
      and is_authorized = true
  );
$$;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Admins can manage profiles" on public.profiles;
create policy "Admins can manage profiles"
on public.profiles for all
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "Authorized users can read incidents" on public.incidents;
create policy "Authorized users can read incidents"
on public.incidents for select
to authenticated
using (public.is_authorized_user(auth.uid()));

drop policy if exists "Authorized users can create incidents" on public.incidents;
create policy "Authorized users can create incidents"
on public.incidents for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_authorized_user(auth.uid())
);

drop policy if exists "Authorized users can update incidents" on public.incidents;
create policy "Authorized users can update incidents"
on public.incidents for update
to authenticated
using (public.is_authorized_user(auth.uid()))
with check (public.is_authorized_user(auth.uid()));
