# RDO — GitHub Pages ready
Gerado em 2025-09-05T00:50:25.061099

## Publicar no GitHub Pages
1. Crie um repositório e suba **todo o conteúdo da pasta `rdo-app/`** na raiz.
2. Vá em **Settings → Pages → Deploy from a branch**: escolha `main` e `/ (root)`.
3. Acesse a URL do Pages. O app é 100% estático.

## Supabase Auth
Em **Authentication → URL Configuration**:
- Site URL: sua URL do GitHub Pages
- Redirect URLs: adicione sua URL do GitHub Pages e também http://localhost:5173 (para dev)

## Desenvolvimento local
```bash
npm run dev
# abre http://localhost:5173
```

## NFC (Web NFC)
- Android + Chrome + HTTPS (ou localhost). iOS não suporta Web NFC no Safari.
- Crachá com NDEF texto: `email@empresa.com`, um UUID, ou JSON `{"id":"..."}`.

## Clima
- `USE_EDGE_WEATHER=false` por padrão (usa Open‑Meteo direto). Se fizer `supabase functions deploy weather`, mude para `true` em `config.js`.

