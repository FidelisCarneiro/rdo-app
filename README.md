# SKIC RDO — MVP COMPLETO
Gerado em 2025-09-04T23:52:59.153465

## O que vem pronto
- PWA offline, Supabase (auth/DB/Storage), Open-Meteo (ou Edge Function)
- Upload de fotos/vídeos (bucket `attachments`) + galeria
- Assinaturas (responsável e cliente) com canvas + inclusão no PDF
- Cadastros, RDO completo, clima por turno, prazos, HH por colaborador/equipamento/ocorrências

## Passos
1) Rodar `supabase_schema.sql` (1x).
2) Rodar `supabase_storage_policies.sql` **como Owner** (Run as owner).
3) (Opcional) `supabase functions deploy weather`.
4) Servir a pasta com um servidor estático (ou publicar no GitHub Pages).
5) Criar conta, cadastros básicos, criar RDO, anexar arquivos, assinar e gerar PDF.
