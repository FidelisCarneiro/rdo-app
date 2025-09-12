# RDO - Fidel (SPA + Supabase + PWA)

Este pacote é a versão multi-arquivo do app da lousa, pronto para publicar no GitHub Pages.

## Rodar localmente
- Suba um servidor estático (ex.: `python3 -m http.server 5173`), depois abra `http://localhost:5173`.

## Publicar no GitHub Pages
1) Faça commit deste conteúdo em `FidelisCarneiro/rdo-app` (na raiz).
2) Settings → Pages → Deploy from a branch → `main` / root.

## Supabase
- Rode o SQL em `sql/supabase_schema.sql` para criar as tabelas.
- Crie o bucket público `rdo_fotos` no Storage.
- `js/app.js` já aponta para seu Project URL e Anon Key.
