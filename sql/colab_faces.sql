-- Face cadastrada por colaborador
begin;
  create table if not exists public.colab_faces (
    colaborador_id uuid primary key references public.colaboradores(id) on delete cascade,
    image_path text not null,
    created_at timestamptz default now()
  );
commit;
