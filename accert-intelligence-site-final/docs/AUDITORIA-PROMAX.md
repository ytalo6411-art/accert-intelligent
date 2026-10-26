# AUDITORIA PROMAX — Estado real do Accert Intelligence (atualizado)

Data: 26/10/2026 · Base: branch `arena/bb9421e4-accert-intelligent`
Rótulos: **C** = Concluída e testada · **I** = Implementada, mas depende de configuração · **P** = Parcial · **B** = Bloqueada por limitação externa · **N** = Ainda não implementada

## 1. Funcionalidades em execução hoje

| # | Funcionalidade | Status | Evidência |
|---|---|---|---|
| 1 | Pesquisa multifuente (PNCP propostas/contratos/atas, Obrasgov, Transferegov parcerias/especiais, GDELT, OpenStreetMap, IBGE, Compras.gov.br, CNO, municipais) | C | `src/app/api/research/route.ts`; 18 suítes (75 testes). Fontes reais verificadas em produção (26/10) |
| 2 | Paginação real por fonte (até 100 pág/fonte) | C | `collectPages` em `src/lib/research.ts` + testes |
| 3 | Lotes (cobertura quick/expanded/detailed) | C | `queryCoverage` (1/3/5 páginas) + teste |
| 4 | Filtro de UF **remoto** onde a API respeita | C | Verificado ao vivo: PNCP propostas `uf`, Obrasgov `uf_principal`, Transferegov parcerias `sg_uf_recebedor` (amostras 100% SP) |
| 5 | Filtro de UF **local** onde a API ignora o parâmetro | C | `sameUf` aplicado no agregador e em `/api/opportunities`; base: PNCP contratos/atas e Transferegov especiais ignoram `uf` (verificado ao vivo). Estado ausente = desconhecido (mantido) |
| 6 | Filtro de município | C | `localCityMatch` (nome + IBGE), local; princípio documentado |
| 7 | Retry com backoff + jitter | C | 1ª página repetida 1× (400–900 ms); teste 503→200 |
| 8 | Versão do conector no relatório | C | `version` em `SOURCE_CATALOG` → `ResearchSourceReport` |
| 9 | Saúde por consulta (status, tempo, páginas, registros, erro) | C | painel "Cobertura desta consulta" + teste de falha isolada |
| 10 | Deduplicação conservadora | C | `deduplicateConservatively` + testes |
| 11 | Pontuação 0–100 explicável **com pesos configuráveis** | C | `scoreOpportunity(o,q,weights)` em `intelligence.ts`; pesos 0–100 por critério, salvos no navegador e enviados ao agregador; evidências por item; 3 testes novos (padrão idêntico ao anterior) |
| 12 | Enriquecimento de empresa (CNPJ) | C | `/api/company` (BrasilAPI + Compras.gov.br + CNO) verificado ao vivo |
| 13 | Export CSV/JSON | C | `csv.ts` + 4 testes; export de varredura por UF incluso |
| 14 | Notícias (GDELT calibrado) | I | Correções de 449ffc52/26cb671d; falha de rede tratada com mensagem específica e degradação isolada |
| 15 | Mapa | P | OSM/IBGE best-effort (instáveis); sem folha de mapa visual |
| 16 | UI responsiva, acessível, estados honestos | C | `page.tsx` + testes; painel declara UF remoto vs local |
| 17 | Salvos (client-side, visível) | C | localStorage + aba "Salvos" |
| 18 | **Varredura nacional por UF** (27 lotes sequenciais, pausa 7,6 s para rate limit, progresso, **retomada** de varredura interrompida, export CSV) | C | `src/lib/sweep.ts` (lógica pura, 5 testes) + painel "Varredura nacional por UF" na aba Oportunidades |
| 19 | **Bot de IA determinístico** (sem API paga) | C | `src/lib/bot.ts`: potencial/prioridade/probabilidade separados com razões, abordagem, riscos reais, rascunho com dados reais da fonte; 5 testes (determinismo, não-invenção, urgência) |
| 20 | **Qualificação comercial** (segmentos, serviços, nível de evidência, confiança) | C | `classifyLead` em `commercial.ts` + testes; alimenta o bot e os modelos |
| 21 | **CRM** (10 estágios, responsável, notas, próxima ação, **histórico** append-only, modelos de mensagem **com cópia manual — sem disparo automático**) | C | `src/lib/crm.ts` (8 testes: migração do formato antigo, 10 estágios, histórico) + painel por lead na UI; persistência local |
| 22 | **LGPD (escopo local)**: exportar e apagar dados do usuário | C | botão "Apagar dados locais" + export JSON existente; aviso na barra de informações |

## 2. Bloqueadas por credenciais/configuração do usuário (Fases 6–7)

| # | Funcionalidade | Status | O que falta |
|---|---|---|---|
| 23 | Persistência de produção (Supabase/Postgres — nunca SQLite/local na Vercel) | B | Conta/credenciais Supabase do usuário (`.env.example` já documenta as variáveis) |
| 24 | Sync agendada (Vercel Cron + `CRON_SECRET`) | B | Cron não existe hoje; **não há "atualização automática" declarada** — só consulta sob demanda. Rotina será criada após persistência (Fase 6) |
| 25 | Autenticação e-mail + Google, sessões, RLS | B | Credenciais Google + segredo de sessão do usuário |
| 26 | Migrações versionadas de banco | B | Depende de #23 |
| 27 | Última sincronização bem-sucedida (histórico persistente) | B | Depende de #23 |

## 3. Sem fonte pública confiável (honestidade de dados)

| # | Funcionalidade | Status | Observação |
|---|---|---|---|
| 28 | Campos de AVCB/licenciamento (tipo, nº, validade, confiança) | B/N | Não existe API pública gratuita e confiável de AVCB em escala. Até haver fonte: o sistema só marca **"potencial oportunidade para qualificação"** — nunca "irregular/sem AVCB" |
| 29 | Mapas/raio/CEP/bairro geoespaciais precisos | P | OSM (quando acessível) traz latitude/longitude; CEP/bairro não são resolvidos por fonte pública estável no sandbox |

## 4. Verificações ao vivo (26/10/2026)

| Fonte/endpoint | Parâmetro de UF | Comporta-se? |
|---|---|---|
| PNCP `/contratacoes/proposta` | `uf` | **Sim** (10/10 SP em produção) |
| PNCP `/contratos` | `uf` | **Não — ignorado** (idem com/sem; vários estados) |
| PNCP `/atas` | `uf` | **Não — ignorado** (página mistura RS/SP/RR/MG/PR) |
| Obrasgov `/obras/projeto-investimento` | `uf_principal` | **Sim** (amostra 100% SP) |
| Transferegov `/parcerias/proposta` | `sg_uf_recebedor` | **Sim** (amostra 100% SP) |
| Transferegov `/especiais` | `sg_uf_recebedor` | **Não — ignorado** (total 58990 idêntico) |
| GDELT / OSM / IBGE | — | Não suportam UF (localidade só via query) |

## 5. Portas de qualidade (executadas neste ciclo)

- `npx vitest run` → **75 testes, 18 arquivos, todos passam**
- `npx tsc --noEmit` → 0 erros
- `npm run lint` → 0 erros (31 warnings `no-explicit-any`, padrão pré-existente do repositório)
- `npm run build` → ok (11 páginas estáticas geradas)
- Sem segredos no repositório; `.env.example` com variáveis documentadas e vazias

## 6. O que o usuário precisa fazer

1. **Redeploy na Vercel** do branch (Root Directory = `accert-intelligence-site-final`).
2. Fases 6–7: criar projeto Supabase (gratuito), credenciais Google, `CRON_SECRET` — ver `RELATORIO-FINAL-PROMAX.md` (item 13).
