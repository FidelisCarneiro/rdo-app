-- SKIC RDO — Supabase schema (COMPLETO)
create extension if not exists "uuid-ossp";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  role text default 'user',
  created_at timestamptz default now()
);

create table public.contractors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  cnpj text,
  phone text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

create table public.works (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  manager text,
  scope text,
  contract_number text,
  start_date date,
  signature_date date,
  planned_end_date date,
  value numeric,
  responsible text,
  art_number text,
  contractor_id uuid references public.contractors (id) on delete set null,
  latitude numeric,
  longitude numeric,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

create table public.activities (
  id uuid primary key default uuid_generate_v4(),
  work_id uuid references public.works(id) on delete cascade,
  name text not null,
  schedule_id text,
  deadline_days integer,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

create table public.collaborators (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  role text,
  email text,
  phone text,
  active boolean default true,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

create table public.teams (
  id uuid primary key default uuid_generate_v4(),
  work_id uuid references public.works(id) on delete cascade,
  name text not null,
  discipline text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

create table public.team_members (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references public.teams(id) on delete cascade,
  collaborator_id uuid references public.collaborators(id) on delete cascade,
  start_date date default now(),
  end_date date
);

create table public.equipment (
  id uuid primary key default uuid_generate_v4(),
  work_id uuid references public.works(id) on delete cascade,
  name text not null,
  brand text,
  model text,
  meter_type text check (meter_type in ('horimeter','odometer')) default 'horimeter',
  meter_value numeric,
  driver_collaborator_id uuid references public.collaborators(id),
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

create table public.rdos (
  id uuid primary key,
  work_id uuid references public.works(id) on delete cascade,
  rdo_number integer,
  rdo_date date,
  weekday text,
  weather_morning jsonb,
  weather_afternoon jsonb,
  weather_night jsonb,
  day_shift_effective integer default 0,
  night_shift_effective integer default 0,
  contractual_deadline_days integer,
  elapsed_days integer,
  extension_days integer default 0,
  remaining_days integer,
  summary jsonb,
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

create table public.rdo_collaborator_entries (
  id uuid primary key,
  rdo_id uuid references public.rdos(id) on delete cascade,
  collaborator_id uuid references public.collaborators(id),
  team_id uuid references public.teams(id),
  activity_id uuid references public.activities(id),
  hours numeric,
  shift text check (shift in ('day','night')) default 'day',
  status text check (status in ('ok','absent','sick','late','changed_team','other')) default 'ok',
  status_note text
);

create table public.rdo_equipment_entries (
  id uuid primary key,
  rdo_id uuid references public.rdos(id) on delete cascade,
  equipment_id uuid references public.equipment(id),
  start_meter numeric,
  end_meter numeric,
  hours numeric,
  operator_id uuid references public.collaborators(id)
);

create table public.rdo_occurrences (
  id uuid primary key,
  rdo_id uuid references public.rdos(id) on delete cascade,
  category text check (category in ('climate','materials','resources','safety','impediment','execution','strike','lightning','other')) default 'other',
  description text,
  affected_activity_id uuid references public.activities(id),
  affected_team_id uuid references public.teams(id),
  lost_hours numeric,
  start_time time,
  end_time time,
  severity integer
);

create table public.materials (
  id uuid primary key default uuid_generate_v4(),
  rdo_id uuid references public.rdos(id) on delete cascade,
  name text,
  quantity numeric,
  unit text,
  supplier text
);

create table public.attachments (
  id uuid primary key default uuid_generate_v4(),
  rdo_id uuid references public.rdos(id) on delete cascade,
  storage_path text,
  mime text,
  meta jsonb default '{}',
  created_at timestamptz default now(),
  created_by uuid references auth.users(id) default auth.uid()
);

create table public.weather_cache (
  id bigserial primary key,
  work_id uuid references public.works(id) on delete cascade,
  rdo_date date,
  morning jsonb,
  afternoon jsonb,
  night jsonb,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.contractors enable row level security;
alter table public.works enable row level security;
alter table public.activities enable row level security;
alter table public.collaborators enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.equipment enable row level security;
alter table public.rdos enable row level security;
alter table public.rdo_collaborator_entries enable row level security;
alter table public.rdo_equipment_entries enable row level security;
alter table public.rdo_occurrences enable row level security;
alter table public.materials enable row level security;
alter table public.attachments enable row level security;
alter table public.weather_cache enable row level security;

create policy "own_read_profiles" on public.profiles for select using (id = auth.uid());
create policy "own_insert_profiles" on public.profiles for insert with check (id = auth.uid());
create policy "own_update_profiles" on public.profiles for update using (id = auth.uid());

create policy "contractors_select" on public.contractors for select using (created_by = auth.uid());
create policy "contractors_insert" on public.contractors for insert with check (created_by = auth.uid());
create policy "contractors_update" on public.contractors for update using (created_by = auth.uid());
create policy "contractors_delete" on public.contractors for delete using (created_by = auth.uid());

create policy "works_select" on public.works for select using (created_by = auth.uid());
create policy "works_insert" on public.works for insert with check (created_by = auth.uid());
create policy "works_update" on public.works for update using (created_by = auth.uid());
create policy "works_delete" on public.works for delete using (created_by = auth.uid());

create policy "activities_select" on public.activities for select using (created_by = auth.uid());
create policy "activities_insert" on public.activities for insert with check (created_by = auth.uid());
create policy "activities_update" on public.activities for update using (created_by = auth.uid());
create policy "activities_delete" on public.activities for delete using (created_by = auth.uid());

create policy "collab_select" on public.collaborators for select using (created_by = auth.uid());
create policy "collab_insert" on public.collaborators for insert with check (created_by = auth.uid());
create policy "collab_update" on public.collaborators for update using (created_by = auth.uid());
create policy "collab_delete" on public.collaborators for delete using (created_by = auth.uid());

create policy "teams_select" on public.teams for select using (created_by = auth.uid());
create policy "teams_insert" on public.teams for insert with check (created_by = auth.uid());
create policy "teams_update" on public.teams for update using (created_by = auth.uid());
create policy "teams_delete" on public.teams for delete using (created_by = auth.uid());

create policy "equip_select" on public.equipment for select using (created_by = auth.uid());
create policy "equip_insert" on public.equipment for insert with check (created_by = auth.uid());
create policy "equip_update" on public.equipment for update using (created_by = auth.uid());
create policy "equip_delete" on public.equipment for delete using (created_by = auth.uid());

create policy "rdos_select" on public.rdos for select using (created_by = auth.uid());
create policy "rdos_insert" on public.rdos for insert with check (created_by = auth.uid());
create policy "rdos_update" on public.rdos for update using (created_by = auth.uid());
create policy "rdos_delete" on public.rdos for delete using (created_by = auth.uid());

create policy "rdocollab_select" on public.rdo_collaborator_entries for select using (exists(select 1 from public.rdos r where r.id = rdo_id and r.created_by = auth.uid()));
create policy "rdocollab_modify" on public.rdo_collaborator_entries for all using (exists(select 1 from public.rdos r where r.id = rdo_id and r.created_by = auth.uid())) with check (exists(select 1 from public.rdos r where r.id = rdo_id and r.created_by = auth.uid()));

create policy "rdoequip_select" on public.rdo_equipment_entries for select using (exists(select 1 from public.rdos r where r.id = rdo_id and r.created_by = auth.uid()));
create policy "rdoequip_modify" on public.rdo_equipment_entries for all using (exists(select 1 from public.rdos r where r.id = rdo_id and r.created_by = auth.uid())) with check (exists(select 1 from public.rdos r where r.id = rdo_id and r.created_by = auth.uid()));

create policy "rdoocc_select" on public.rdo_occurrences for select using (exists(select 1 from public.rdos r where r.id = rdo_id and r.created_by = auth.uid()));
create policy "rdoocc_modify" on public.rdo_occurrences for all using (exists(select 1 from public.rdos r where r.id = rdo_id and r.created_by = auth.uid())) with check (exists(select 1 from public.rdos r where r.id = rdo_id and r.created_by = auth.uid()));

create policy "materials_select" on public.materials for select using (exists(select 1 from public.rdos r where r.id = rdo_id and r.created_by = auth.uid()));
create policy "materials_modify" on public.materials for all using (exists(select 1 from public.rdos r where r.id = rdo_id and r.created_by = auth.uid())) with check (exists(select 1 from public.rdos r where r.id = rdo_id and r.created_by = auth.uid()));

create policy "weather_select" on public.weather_cache for select using (true);
create policy "weather_insert" on public.weather_cache for insert with check (true);
