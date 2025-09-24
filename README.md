# RDO - Fidel (v4)

**Novidades desta versão**
- **Dashboard** com mais visões: HH acumuladas, HH por obra, polar de ocorrências, radar de status, taxa de presença por encarregado e bolhas *HH × Ocorrências/dia*.
- **Presenças**: seção renomeada para **Confirmação de Presença**. Lista todos os colaboradores e, à medida que lê o **NFC** ou confirma por **Face**, marca **Presente** e grava a **hora** do período selecionado (Início, Saída/Volta do almoço, Saída). Continua salvando **GPS** silencioso por confirmação.
- **Cadastro → Colaboradores**: leitura/gravação de **NFC** e **captura de face** com **pré‑visualização**. As faces ficam no bucket `colab_bio` (`faces/<colaborador_id>.jpg`) e registro em `colab_faces`.

## Supabase
Crie (se ainda não existirem) os buckets públicos:
- `rdo_fotos`
- `colab_bio`

Rode também os SQLs em `sql/`:
- `colab_faces.sql` – tabela para associar a foto de referência a cada colaborador.
- (opcional) `biometrics_and_presence.sql` – tabelas de presença (GPS/Face) por batida.

## Rodar localmente
- Servidor estático (ex.: `python3 -m http.server 5173`) e abra `http://localhost:5173`.
- Para NFC/Câmera, use **HTTPS** em produção.
