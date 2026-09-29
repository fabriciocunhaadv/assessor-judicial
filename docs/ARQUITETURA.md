# Assessor Judicial IA — Arquitetura, Diagnóstico e Plano de Desenvolvimento

> Documento de arquitetura. **Não altera código.** Toda execução deste plano segue o `AGENTS.md`
> (edições cirúrgicas, proibição de sobrescrita de dados e de seeds em produção, atualização
> obrigatória de `SystemManualModal.tsx` e `SystemTour.tsx` a cada entrega).

---

## 0. Premissa: evoluir, não reescrever

O repositório **já implementa a maior parte da especificação** (≈69 mil linhas em React + Express +
Firestore). Recriar o sistema do zero violaria a Regra 5 do `AGENTS.md` e colocaria em risco dados
reais de gabinetes. A estratégia é o padrão **Strangler Fig**: novos módulos nascem na estrutura-alvo
e as rotas de `server.ts` são extraídas **uma por vez, somente quando autorizadas**, mantendo o
contrato HTTP idêntico (mesma URL, mesmo payload, mesma resposta).

---

## 1. Diagnóstico: Especificação × Código Atual

| Módulo da especificação | Situação | Onde está hoje |
|---|---|---|
| **M1** Esteira em duas etapas (Assessor Fático → Juiz Revisor) | ✅ Implementado | `server.ts` `POST /api/generate-minute` (≈L2452); `stage1SystemInstruction` (≈L2640) e `stage2SystemInstruction` (≈L2710) |
| M1 — Temperatura 0.0 na Etapa 1 | 🟡 Verificar | há chamadas com `temperature: 0.0` (≈L3158, L3467) e outras com `0.1`; confirmar qual se aplica à Etapa 1 |
| M1 — Tríplice localização Mov./Arq./Pág. | ✅ Nos prompts | instruções da Etapa 1 |
| M1 — Lei 14.905/2024 no dispositivo | ✅ | prompts + `ConsectariosCalculator.tsx` + `ComplianceChecklist.tsx` |
| **M2** Limpeza de PDFs forenses | ✅ | `src/utils/judicialTextCleaner.ts`, `src/utils/pdfExtractor.ts`, `src/utils/documentDeduplicator.ts`, `POST /api/extract-pdf-text` |
| M2 — pdf-parse no servidor | 🟡 Parcial | extração é majoritariamente no cliente (PDF.js) |
| **M3** Lupa do Magistrado / Tripla Conferência | ✅ | `TripleConferenceBench.tsx`, `MinuteAuditorModal.tsx`, `PdfViewerPane.tsx`, `POST /api/audit-assessor-draft` |
| **M4** Repositório vinculante + importador em chunks | ✅ | `src/utils/bindingPrecedents.ts`, `BindingPrecedentsModal.tsx`, `POST /api/parse-precedents-pdf` (lotes paralelos), `POST /api/sync-precedents-weekly` |
| M4 — Persistência dos precedentes customizados | 🟡 | `localStorage` + `data/custom_precedents.json` (arquivo local no servidor — não sobrevive a redeploy em Cloud Run) |
| **M5** Mesa de Audiência (5 pilares, perguntas, termo) | ✅ | `HearingWorkbenchModal.tsx`, `POST /api/hearing-copilot`, `src/utils/hearingsDb.ts` |
| **M6** Chat de refino com Resumo Executivo | ✅ | `POST /api/chat-agaia` (usa `executiveSummary`), `POST /api/generate-synopsis` |
| **M7** Paradigmas, Caderno de Teses, Super Admin, custos | ✅ | `ParadigmSelector.tsx`, `CabinetTesesModal.tsx`, `SuperAdminPanel.tsx`, `src/utils/apiUsageTracker.ts` |
| Orquestrador multi-modelo, pool de chaves, fallback 503/429 | ✅ (só Gemini) | `server.ts` ≈L1262–1640 |
| Suporte a Claude / GPT como provedores | ❌ Ausente | apenas `@google/genai` |
| RBAC Juiz Titular / Assessor / Estagiário / Super Admin | 🟡 Parcial | `UserRole = "admin" \| "user"` em `src/types.ts`; regras usam `admin`, `judge`, `magistrado`, `super_admin` |
| Rotas stub | ❌ | `/api/lookup-legislation`, `/api/map-decision-documents`, `/api/scan-cabinet-theses` retornam "Not implemented" |
| Testes automatizados / CI | ❌ Ausente | somente `tsc --noEmit` |

---

## 2. Riscos Críticos (prioridade máxima — antes de qualquer feature)

1. **Escalada de privilégio no Firestore.** Em `firestore.rules`, `match /users/{userId}` tem
   `allow update: if isSignedIn();` — qualquer usuário autenticado pode alterar **qualquer** documento
   de usuário, inclusive o campo `role` para `super_admin`. `invites/{email}` também está aberto para
   leitura/escrita de qualquer autenticado.
   *Correção proposta:* o próprio usuário edita apenas campos não sensíveis do próprio documento;
   `role` e `tenantId` só por admin do tenant/super admin (`request.resource.data.diff(resource.data).affectedKeys()`).
2. **API sem autenticação.** O Express não valida o ID Token do Firebase (não há `firebase-admin`).
   Qualquer pessoa com a URL consome a `GEMINI_API_KEY` nativa via `/api/generate-minute` etc.
   *Correção proposta:* middleware `requireAuth` com `firebase-admin.verifyIdToken` + rate limit por uid.
3. **Dados processuais versionados no Git (LGPD / sigilo).** `history.json`, `data/history.json`,
   `backup_*.tar(.gz)` estão commitados e contêm números de processo, nomes e e-mails reais.
   *Correção proposta (requer autorização expressa):* mover para armazenamento seguro, adicionar ao
   `.gitignore` e avaliar purga do histórico. **Nada será apagado sem ordem do usuário.**
4. **Persistência efêmera.** `data/*.json` no disco do servidor se perde a cada deploy.

---

## 3. Arquitetura-Alvo

```
┌──────────────────────── Frontend (React 19 + Vite + Tailwind 4) ─────────────────────────┐
│  Esteira de Minutas │ Lupa/Tripla Conferência │ Mesa de Audiência │ Chat │ Gestão/Admin  │
│  PDF.js + judicialTextCleaner (limpeza no cliente)   ·   Firebase Auth (ID Token)         │
└──────────────────────────────────────┬───────────────────────────────────────────────────┘
                                       │ HTTPS + Authorization: Bearer <idToken>
┌──────────────────────────────────────▼───────────────────────────────────────────────────┐
│ Express API  (server/)                                                                    │
│  middleware: requireAuth → requireRole → tenantScope → rateLimit → usageMeter            │
│  routes/  → services/ (regras de negócio)  → ai/ (orquestrador)                           │
│                                                                                           │
│  ai/orchestrator: providers[gemini|anthropic|openai] × keyPool × modelCascade             │
│                   retry exponencial (429/503/timeout) · fallback · contagem de tokens     │
│  pipelines/minute: Etapa1 (Assessor Fático, T=0.0, JSON schema) → Etapa2 (Juiz Revisor)   │
└──────────────┬───────────────────────────────────────────┬───────────────────────────────┘
               │ firebase-admin                            │
      ┌────────▼─────────┐                        ┌────────▼────────┐
      │ Firestore        │ gabinetes/{tenant}/…   │ Cloud Storage   │ PDFs de autos e
      │ (RBAC por regras)│ users, usage_logs      │                 │ informativos
      └──────────────────┘                        └─────────────────┘
```

**Papéis (RBAC):** `super_admin` › `juiz_titular` › `assessor` › `estagiario`.
Mapeamento retrocompatível: `admin`/`judge`/`magistrado` → `juiz_titular`; `user` → `assessor`.
Nenhum documento existente é reescrito — a normalização é feita em leitura.

---

## 4. Estrutura de Pastas e Arquivos (alvo)

Legenda: **(existe)** mantido como está · **(novo)** criado na fase indicada · **(extrair)** trecho
de `server.ts` movido sem alterar comportamento, apenas com autorização.

```
assessor-judicial/
├── AGENTS.md                              (existe)
├── docs/
│   ├── ARQUITETURA.md                     (este documento)
│   ├── ADR/                               (novo) decisões de arquitetura registradas
│   └── PROMPTS.md                         (novo) catálogo versionado das system instructions
├── server.ts                              (existe) → vira apenas bootstrap ao fim da migração
├── server/
│   ├── petitionAdvogadoRoutes.ts          (existe)
│   ├── index.ts                           (novo) cria app, registra middlewares e rotas
│   ├── config/env.ts                      (novo) leitura/validação de variáveis de ambiente
│   ├── middleware/
│   │   ├── requireAuth.ts                 (novo · Fase 1) verifyIdToken firebase-admin
│   │   ├── requireRole.ts                 (novo · Fase 1) RBAC
│   │   ├── tenantScope.ts                 (novo · Fase 1)
│   │   ├── rateLimit.ts                   (novo · Fase 1)
│   │   └── usageMeter.ts                  (novo · Fase 4) tokens/custo por funcionalidade
│   ├── ai/
│   │   ├── orchestrator.ts                (extrair) cascata de modelos + pool de chaves + retry
│   │   ├── keyPool.ts                     (extrair)
│   │   ├── retryPolicy.ts                 (extrair) 429/503/timeout, backoff exponencial
│   │   ├── providers/
│   │   │   ├── types.ts                   (novo) interface LlmProvider { generate, countTokens }
│   │   │   ├── gemini.ts                  (extrair)
│   │   │   ├── anthropic.ts               (novo · Fase 5)
│   │   │   └── openai.ts                  (novo · Fase 5)
│   │   └── prompts/
│   │       ├── base.ts                    (extrair) SYSTEM_INSTRUCTION_FABRICIO
│   │       ├── stage1AssessorFatico.ts    (extrair)
│   │       ├── stage2JuizRevisor.ts       (extrair)
│   │       ├── auditor.ts                 (extrair)
│   │       ├── hearing.ts                 (extrair)
│   │       └── precedentsIndexer.ts       (extrair)
│   ├── pipelines/
│   │   ├── minutePipeline.ts              (extrair) Etapa 1 → Etapa 2
│   │   ├── synopsis.ts                    (extrair) Resumo Executivo / Sinopse em 5 pilares
│   │   └── precedentsChunker.ts           (extrair) chunking paralelo de informativos
│   ├── routes/                            (extrair, uma rota por PR)
│   │   ├── minutes.routes.ts              /api/generate-minute
│   │   ├── audit.routes.ts                /api/audit-assessor-draft
│   │   ├── hearing.routes.ts              /api/hearing-copilot
│   │   ├── chat.routes.ts                 /api/chat-agaia
│   │   ├── precedents.routes.ts           /api/parse-precedents-pdf, /api/custom-precedents, /api/sync-precedents-weekly
│   │   ├── pdf.routes.ts                  /api/extract-pdf-text
│   │   ├── mutirao.routes.ts              /api/mutirao-*
│   │   └── telemetry.routes.ts            /api/telemetry/*
│   ├── services/
│   │   ├── processMetadata.ts             (extrair) extractProcessMetadata (CNJ, partes, vara)
│   │   ├── consectarios.ts                (novo · Fase 3) cálculo Lei 14.905/2024 determinístico
│   │   └── pdfServer.ts                   (novo · Fase 2) pdf-parse + judicialTextCleaner compartilhado
│   └── repositories/
│       ├── precedentsRepo.ts              (novo · Fase 2) Firestore em vez de data/*.json
│       └── usageRepo.ts                   (novo · Fase 4)
├── shared/                                (novo) código usado por cliente E servidor
│   ├── judicialTextCleaner.ts             (mover de src/utils com re-export no local antigo)
│   ├── roles.ts                           papéis + normalização retrocompatível
│   └── schemas/                           tipos/zod dos JSON das Etapas 1 e 2
├── src/                                   (existe) — frontend
│   ├── App.tsx, main.tsx, types.ts        (existe)
│   ├── components/                        (existe) 50 componentes; nenhum renomeado
│   ├── data/                              (existe) defaults — NUNCA usados para sobrescrever dados
│   ├── lib/                               (existe) firebase, AuthContext, firestoreUtils
│   └── utils/                             (existe)
├── tests/                                 (novo · Fase 0)
│   ├── fixtures/autos/                    PDFs sintéticos anonimizados (Projudi, PJe, eproc)
│   ├── unit/judicialTextCleaner.test.ts
│   ├── unit/processMetadata.test.ts
│   ├── unit/consectarios.test.ts
│   ├── unit/retryPolicy.test.ts
│   └── rules/firestore.rules.test.ts      emulador do Firestore
├── scripts/legacy/                        (proposta) destino dos ~80 fix_*.cjs / patch_*.py da raiz
├── firestore.rules                        (existe) → Fase 1
├── firebase-blueprint.json                (existe)
└── .github/workflows/ci.yml               (novo · Fase 0) lint + testes
```

---

## 5. Plano Passo a Passo

Cada fase é entregue em PRs pequenos, com o **mesmo contrato HTTP** e sem tocar em dados de usuários.
Toda entrega visível ao usuário atualiza o changelog do `SystemManualModal.tsx` e o `SystemTour.tsx`.

### Fase 0 — Rede de segurança (sem mudar comportamento)
1. Adicionar `vitest` e o script `npm test`; testes de caracterização para `judicialTextCleaner`,
   `extractProcessMetadata` e cálculo de custos (fixando o comportamento **atual**).
2. Fixtures de PDFs **sintéticos** (nunca autos reais).
3. CI no GitHub Actions: `npm run lint` + `npm test`.
4. Snapshot/backup exportado do Firestore antes de qualquer fase seguinte.

**Critério de aceite:** CI verde; nenhum arquivo de produção alterado.

### Fase 1 — Segurança e RBAC
1. Corrigir `firestore.rules` (`users`, `invites`) + testes no emulador.
2. `firebase-admin` no servidor; middleware `requireAuth` e `rateLimit` em todas as rotas `/api/*`
   (cliente passa a enviar `Authorization: Bearer <idToken>`).
3. `shared/roles.ts` com os 4 papéis e normalização retrocompatível; permissões:
   - Estagiário: gera rascunho, não exporta versão final nem edita teses/paradigmas;
   - Assessor: gera, refina, submete à Lupa;
   - Juiz Titular: audita, aprova, gerencia teses/paradigmas/equipe do gabinete;
   - Super Admin: tenants, custos, chaves.
4. Decisão do usuário sobre `history.json`/backups versionados (item 2.3).

**Critério de aceite:** usuário comum não consegue alterar `role`; chamadas sem token recebem 401.

### Fase 2 — Ingestão de PDFs robusta (Módulo 2 e 4)
1. Mover `judicialTextCleaner` para `shared/` (re-export no caminho antigo — nenhum import quebra).
2. `pdfServer.ts` com pdf-parse para autos enviados ao servidor e fallback de OCR sinalizado.
3. Ingestão em streaming por página (100–400 págs.) com barra de progresso e cancelamento.
4. Precedentes customizados: gravar no Firestore (`gabinetes/{tenant}/precedentes`) **em adição** ao
   `localStorage`; migração apenas de inclusão (merge por id, nunca substituição).

### Fase 3 — Esteira de minutas determinística (Módulo 1)
1. Extrair prompts para `server/ai/prompts/*` com versionamento (`promptVersion` salvo no histórico).
2. Garantir `temperature: 0.0` na Etapa 1 e `responseSchema` JSON validado (Mov./Arq./Pág. por fato;
   pedidos por litisconsorte).
3. Validador pós-geração: extensão mínima da fundamentação, presença dos 7 blocos, confronto
   alfanumérico (nº CNJ, valores, datas) entre a minuta e o texto dos autos.
4. `consectarios.ts` determinístico (IPCA + taxa legal Selic − IPCA) — a IA cita, o código calcula.

### Fase 4 — Governança e custos (Módulo 7)
1. `usageMeter` no servidor registra tokens reais retornados pelo provedor, por funcionalidade
   (Minutas, Mesa de Audiência, Lupa, Chat) e por tenant → `usage_logs`.
2. `SuperAdminPanel` passa a ler do servidor (hoje há estimativa local em `apiUsageTracker.ts`).
3. Cotação USD→BRL configurável.

### Fase 5 — Multi-provedor (orquestrador)
1. Interface `LlmProvider`; extrair o provedor Gemini atual sem mudar a cascata.
2. Adicionar provedores Anthropic e OpenAI atrás da mesma interface, habilitados por gabinete.
3. Política de fallback entre provedores configurável no painel (desligada por padrão).

### Fase 6 — Completar rotas stub e UX
1. Implementar `/api/lookup-legislation`, `/api/map-decision-documents`, `/api/scan-cabinet-theses`.
2. Lupa: realce clicável de cada citação `Mov./Arq./Pág.` abrindo o PDF na página correspondente.
3. Mesa de Audiência: modo offline de rascunho do termo.

### Fase 7 — Higiene do repositório (somente com autorização)
1. Mover scripts `fix_*.cjs`, `patch_*.py`, `test_*.ts` da raiz para `scripts/legacy/`.
2. Quebrar `server.ts` rota a rota até ficar apenas o bootstrap.

---

## 6. Invariantes que nenhum PR pode violar

- Nenhuma rotina de seed/reset em produção; defaults de `src/data/*` só preenchem **ausência** de dado.
- Migrações são sempre aditivas (merge), com backup prévio.
- Contrato das rotas `/api/*` preservado durante extrações.
- IA proibida de inventar números de processo, valores, datas e telefones — validação no código,
  não apenas no prompt.
- Julgamento adstrito aos pedidos (vedado *extra*, *ultra* e *citra petita*) — checado pela
  Matriz de Conformidade da Lupa.
