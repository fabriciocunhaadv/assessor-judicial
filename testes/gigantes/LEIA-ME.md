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

**Acima de 3.000 páginas** a janela oferece: dividir automaticamente em partes (lidas uma de cada vez, cada uma gera a sua minuta com aviso de quais páginas cobre), remover os PDFs para anexar uma versão reduzida, ou tentar a análise normal (a janela estima o que será cortado e a minuta informa exatamente o que ficou de fora). Testes: `teste_gigante_app.py` (D1/D2), `teste_corte_servidor.py`.

**Fila:** um processo gigante por vez. Os outros ficam "Na fila (posição N)" e começam na ordem em que chegaram (`teste_gigante_fila.py`). As análises normais continuam passando na frente.

## Fase 2
- **OCR em lotes das páginas sem texto:** antes da leitura, o trabalho lê por OCR (IA) as páginas escaneadas, 5 por vez, em segundo plano (botão “Pular o OCR” no painel). As páginas lidas entram no índice e nos lotes. Se o arquivo original não estiver mais disponível (página recarregada), elas ficam como “sem leitura” e a minuta traz o aviso.
- **Dossiê reaproveitável:** a Lupa e a Mesa, quando os autos passam do limite de leitura delas, oferecem preparar o **dossiê** (mesma leitura em lotes, sem redigir minuta). Quando fica pronto, a Lupa audita com ele (clique em Auditar de novo) e a Mesa roda o briefing sozinha. Um dossiê pronto de um processo é reaproveitado sempre que o mesmo número CNJ aparecer.
- **Turbo:** acima do limite do Turbo, oferece a leitura em lotes; a minuta vai para o Histórico.
- **Pesquisa no índice:** “🔎 Pesquisar nos autos deste processo” em cada trabalho (todas as páginas, sem diferenciar acentos).
- **Conferência de “ausência de prova”:** depois da minuta, o sistema acha frases como “não foi juntado laudo pericial” e procura o termo no índice completo; se achar, mostra um aviso âmbar com as páginas.
- **Esteira (extensão 1.0.23):** Turbo e análise principal com processo gigante viram o estado “processo gigante”; a fila segue e a minuta é pega no Histórico quando fica pronta.
- **Esteira (auto):** acima de 3.000 págs a esteira divide em partes que só geram dossiê e o sistema une tudo numa minuta única sozinho (`teste_gigante_auto_partes.py`).
- **Unir as partes:** quando todas as partes de um processo terminam, a última mostra “Unir as partes numa só minuta” (reaproveita fichas e páginas, sem reler; teste D3 em `teste_gigante_app.py`).
- OCR: o PDF é aberto uma só vez, cada etapa tem prazo, e se a IA falha 2 lotes seguidos o OCR é interrompido com o motivo visível (`teste_gigante_ocr_falha.py`).
- Testes: `teste_gigante.py` (OCR, pesquisa, conferência), `teste_gigante_modulos.py [turbo|lupa|mesa]`.
