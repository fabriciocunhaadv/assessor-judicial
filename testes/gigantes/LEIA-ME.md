# Processos gigantes (leitura em lotes, em segundo plano)

Fase 1: até 3.000 páginas, com a aba do app aberta.

**Como funciona**
1. O texto dos PDFs vai para um banco local do navegador (IndexedDB); nada fica na memória.
2. Triagem sem IA (palavras-chave do cabeçalho): peças essenciais inteiras, documentos sem relevância só pelo cabeçalho, páginas idênticas uma vez só.
3. Lotes de ~88 mil tokens → `/api/gigante-lote` devolve uma ficha estruturada (com a página de cada item).
4. Fusão das fichas em níveis (`/api/gigante-fusao`) até caberem na minuta final.
5. Minuta final em `/api/generate-minute` (dossiê + peças essenciais), salva no Histórico com a tarja azul (`AvisoGigante`).
6. A pista normal (análises comuns, Turbo, Lupa, Mesa) tem prioridade: o gigante espera ela terminar (`pistaNormal.ts`, observa o `fetch`).
7. Estado salvo a cada lote: pausar, recarregar a página e retomar não refaz lotes.

**Testes** (Chromium + servidor real + Google simulado, sem gastar cota):
- `python3 teste_gigante.py` — 700 páginas de ponta a ponta (4 fatos plantados em páginas distantes têm de chegar à minuta; injeção agregada; páginas sem texto).
- `python3 teste_gigante_extra.py` — prioridade da análise normal, pausar, recarregar a página e retomar.
- `python3 teste_gigante_app.py` — o app completo: PDF pequeno segue a análise normal; PDF enorme abre a pergunta e processa em lotes.
