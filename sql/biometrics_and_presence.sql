-- Presenças (GPS e Face) para confirmações por período
begin;
  create table if not exists public.rdo_presenca_gps (
    id uuid primary key default gen_random_uuid(),
    rdo_id uuid references public.rdo(id) on delete set null,
    rdo_numero_preview text,
    obra_id uuid references public.obras(id),
    data date,
    colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
    periodo text not null check (periodo in ('ini','almoco_s','almoco_v','fim')),
    latitude numeric,
    longitude numeric,
    accuracy numeric,
    method text default 'nfc',
    captured_at timestamptz default now()
  );
  create index if not exists rdo_presenca_gps_rdo_idx on public.rdo_presenca_gps(rdo_id);
  create index if not exists rdo_presenca_gps_colab_idx on public.rdo_presenca_gps(colaborador_id);

  create table if not exists public.rdo_presenca_bio (
    id uuid primary key default gen_random_uuid(),
    rdo_id uuid references public.rdo(id) on delete set null,
    rdo_numero_preview text,
    colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
    periodo text not null check (periodo in ('ini','almoco_s','almoco_v','fim')),
    image_path text not null,
    method text default 'face',
    created_at timestamptz default now()
  );
  create index if not exists rdo_presenca_bio_rdo_idx on public.rdo_presenca_bio(rdo_id);
commit;
