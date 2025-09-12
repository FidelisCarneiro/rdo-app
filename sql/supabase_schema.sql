
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  telefone text,
  created_at timestamp default now()
);

create table if not exists obras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  gestor text,
  escopo text,
  numero_contrato text,
  data_inicio date,
  data_assinatura date,
  previsao_conclusao date,
  valor numeric,
  responsavel_tecnico text,
  numero_art text,
  created_at timestamp default now()
);

create table if not exists colaboradores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  funcao text,
  email text,
  telefone text,
  nfc_tag text,
  created_at timestamp default now()
);

create table if not exists atividades (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references obras(id) on delete cascade,
  nome text not null,
  cronograma_id text,
  prazo int,
  created_at timestamp default now()
);

create table if not exists rdo (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references obras(id) on delete cascade,
  numero text,
  data date,
  clima_manha text,
  clima_tarde text,
  clima_noite text,
  resumo text,
  created_by uuid references auth.users(id),
  created_at timestamp default now(),
  hora_chegada time,
  teve_pts boolean,
  pts_numero text,
  pts_abertura time,
  inicio_trabalho time,
  atividades_dia text
);

create table if not exists rdo_hh (
  id uuid primary key default gen_random_uuid(),
  rdo_id uuid references rdo(id) on delete cascade,
  colaborador_id uuid references colaboradores(id),
  atividade_id uuid references atividades(id),
  horas numeric
);

create table if not exists equipamentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  marca text,
  modelo text,
  data date,
  horimetro_km numeric,
  motorista_id uuid references colaboradores(id),
  created_at timestamp default now()
);

create table if not exists materiais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  unidade text,
  created_at timestamp default now()
);

create table if not exists rdo_equip (
  id uuid primary key default gen_random_uuid(),
  rdo_id uuid references rdo(id) on delete cascade,
  equipamento_id uuid references equipamentos(id),
  motorista_id uuid references colaboradores(id),
  h_inicial numeric,
  h_final numeric
);

create table if not exists rdo_materiais (
  id uuid primary key default gen_random_uuid(),
  rdo_id uuid references rdo(id) on delete cascade,
  material_id uuid references materiais(id),
  acao text,
  quantidade numeric,
  unidade text
);

create table if not exists ocorrencias (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references obras(id) on delete cascade,
  rdo_id uuid references rdo(id) on delete set null,
  tipo text,
  descricao text,
  impacto_prazo_h numeric,
  impacto_custo numeric,
  data date default now(),
  created_at timestamp default now()
);

create table if not exists ocorrencias_env (
  id uuid primary key default gen_random_uuid(),
  ocorrencia_id uuid references ocorrencias(id) on delete cascade,
  colaborador_id uuid references colaboradores(id),
  prazo_impactado_h numeric
);

alter table profiles enable row level security;
alter table obras enable row level security;
alter table colaboradores enable row level security;
alter table atividades enable row level security;
alter table rdo enable row level security;
alter table rdo_hh enable row level security;
alter table equipamentos enable row level security;
alter table materiais enable row level security;
alter table rdo_equip enable row level security;
alter table rdo_materiais enable row level security;
alter table ocorrencias enable row level security;
alter table ocorrencias_env enable row level security;

do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='rw_all') then create policy rw_all on profiles for all using (true) with check (true); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='obras' and policyname='rw_all') then create policy rw_all on obras for all using (true) with check (true); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='colaboradores' and policyname='rw_all') then create policy rw_all on colaboradores for all using (true) with check (true); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='atividades' and policyname='rw_all') then create policy rw_all on atividades for all using (true) with check (true); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='rdo' and policyname='rw_all') then create policy rw_all on rdo for all using (true) with check (true); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='rdo_hh' and policyname='rw_all') then create policy rw_all on rdo_hh for all using (true) with check (true); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='equipamentos' and policyname='rw_all') then create policy rw_all on equipamentos for all using (true) with check (true); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='materiais' and policyname='rw_all') then create policy rw_all on materiais for all using (true) with check (true); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='rdo_equip' and policyname='rw_all') then create policy rw_all on rdo_equip for all using (true) with check (true); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='rdo_materiais' and policyname='rw_all') then create policy rw_all on rdo_materiais for all using (true) with check (true); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='ocorrencias' and policyname='rw_all') then create policy rw_all on ocorrencias for all using (true) with check (true); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='ocorrencias_env' and policyname='rw_all') then create policy rw_all on ocorrencias_env for all using (true) with check (true); end if; end $$;
