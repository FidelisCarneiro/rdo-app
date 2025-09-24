-- Reset total das tabelas de RDO e contador automático + unicidade do número
begin;
  delete from ocorrencias_env;
  delete from ocorrencias;
  delete from rdo_hh;
  delete from rdo_equip;
  delete from rdo_materiais;
  delete from rdo_colab_status;
  delete from rdo_atividades;
  delete from rdo;

  do $$
  begin
    if not exists(select 1 from pg_class where relname='rdo_num_seq') then
      create sequence rdo_num_seq start 1;
    end if;
  end$$;

  create or replace function public.rdo_next_num() returns text
  language plpgsql as $$
  declare n bigint;
  begin
    select nextval('rdo_num_seq') into n;
    return lpad(n::text,8,'0');
  end$$;

  create or replace function public.rdo_set_numero() returns trigger
  language plpgsql as $$
  begin
    if new.numero is null then
      new.numero := public.rdo_next_num();
    end if;
    return new;
  end$$;

  drop trigger if exists trg_rdo_set_numero on public.rdo;
  create trigger trg_rdo_set_numero before insert on public.rdo
  for each row execute function public.rdo_set_numero();

  do $$
  begin
    if not exists(select 1 from pg_class where relname='rdo_numero_key') then
      create unique index rdo_numero_key on public.rdo (numero);
    end if;
  end$$;
commit;
