-- Biometrics & GPS: criação/ajustes de schema
begin;
  -- para gen_random_uuid()
  create extension if not exists pgcrypto;

  -- coluna de flag para cadastro facial
  do $$ begin
    if not exists(select 1 from information_schema.columns where table_name='colaboradores' and column_name='face_enrolled') then
      alter table colaboradores add column face_enrolled boolean default false;
    end if;
  end $$;

  -- pontos de confirmação por GPS
  create table if not exists rdo_colab_pontos (
    id uuid primary key default gen_random_uuid(),
    rdo_id uuid not null references rdo(id) on delete cascade,
    colaborador_id uuid not null references colaboradores(id),
    periodo text not null check (periodo in ('ini','almoco_s','almoco_v','fim')),
    lat double precision,
    lon double precision,
    acc double precision,
    ts timestamptz default now(),
    via text
  );

  create index if not exists rdo_colab_pontos_rdo_idx on rdo_colab_pontos (rdo_id);
  create index if not exists rdo_colab_pontos_colab_idx on rdo_colab_pontos (colaborador_id);
  create index if not exists rdo_colab_pontos_ts_idx on rdo_colab_pontos (ts);
commit;

/* Observações
 - A API de geolocalização do navegador exige permissão do usuário; não é possível capturar local "às escondidas".
 - Mantenha aviso/consentimento expresso dos colaboradores para coleta de imagens e dados de localização, conforme LGPD e política interna.
 - Armazene imagens faciais em bucket com controle de acesso e defina prazos de retenção.
*/
