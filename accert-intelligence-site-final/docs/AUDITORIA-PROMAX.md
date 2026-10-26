# AUDITORIA PROMAX — Estado real do Accert Intelligence

Data: 26/10/2026 · Base: branch `arena/bb9421e4-accert-intelligent`
Rótulos: **C** = Concluída e testada · **I** = Implementada, mas depende de configuração · **P** = Parcial · **B** = Bloqueada por limitação externa · **N** = Ainda não implementada

## 1. Funcionalidades em execução hoje

| # | Funcionalidade | Status | Evidência |
|---|---|---|---|
| 1 | Pesquisa multifuente (PNCP propostas/contratos/atas, Obrasgov, Transferegov parcerias/especiais, GDELT, OpenStreetMap, IBGE, Compras.gov.br, CNO, municipais) | C | `src/app/api/research/route.ts` + 15 suítes de teste (55 testes). Fontes consultadas em produção retornaram dados reais (26/10: PNCP, Obrasgov, Transferegov, Compras, BrasilAPI) |
| 2 | Paginação real por fonte (páginas 2+ da API de origem, não só página 1) | C | `collectPages` em `src/lib/research.ts` (limite 100 pág/fonte); testado em `research/route.test.ts` |
| 3 | Lotes (cobertura quick/expanded/detailed) | C | `queryCoverage` em `src/lib/search.ts` (1/3/5 páginas); teste "keeps coverage bounded" |
| 4 | Filtro de UF **remoto** nas fontes que suportam | C | Verificado ao vivo 26/10: Obrasgov `uf_principal=SP` → amostra 100% SP; Transferegov parcerias `sg_uf_recebedor=SP` → SP; PNCP propostas `uf=SP` → 10/10 SP (via `/api/opportunities` em produção) |
| 5 | Filtro de UF **local** nas fontes que ignoram o parâmetro | C | `sameUf` em `src/lib/search.ts` aplicado em `research.ts` e `/api/opportunities`. Base: verificação ao vivo mostrou PNCP `/contratos` e `/atas` e Transferegov `/especiais` **ignorando** `uf` (200 com dados de vários estados). Estado ausente = desconhecido (mantido), nunca "fora do UF" |
| 6 | Filtro de município | C | `localCityMatch` (nome + código IBGE), mantido como filtro local (fontes públicas não filtram por cidade de forma confiável); princípio: ausência de localização = desconhecido |
| 7 | Retry com backoff + jitter em falha de fonte | C | 1ª página repetida 1× com 400–900 ms em `collectPages`; teste "repete a primeira página" (503 → 200, source ok) |
| 8 | Versão do conector no relatório | C | `version` em `SOURCE_CATALOG` (`src/lib/source-catalog.ts`) propagado em cada `ResearchSourceReport` |
| 9 | Saúde por consulta (status, tempo, páginas, registros, erro) | C | `sources[]` na resposta + painel "Cobertura desta consulta" na UI; teste "isolate one failing source" |
| 10 | Deduplicação conservadora (nunca apagar registro real) | C | `deduplicateConservatively` em `src/lib/intelligence.ts`; teste em `intelligence.test.ts` |
| 11 | Pontuação explicável (0–100, evidências por item) | P | `scoreOpportunity` com evidências (ex.: "Aderência temática: obra", "Prazo informado pela fonte"). Limitação: pontua **relevância comercial**, não probabilidade de conversão (Fase 4) |
| 12 | Enriquecimento de empresa (CNPJ) | C | `/api/company` com BrasilAPI + Compras.gov.br + CNO (verificado ao vivo em produção: CNPJ real → dados reais) |
| 13 | Export CSV/JSON | C | `src/lib/csv.ts` + 4 testes |
| 14 | Notícias (GDELT, query calibrada ≤6 frases, causa real na mensagem de erro) | I | Correções de 449ffc52/26cb671d; no sandbox a rede do tool não alcança GDELT, mas o código trata falha de rede com mensagem específica e degrada isoladamente |
| 15 | Mapa | P | OpenStreetMap/Overpass best-effort (público, instável) + IBGE (instável no sandbox). Sem mapa visual (folha) — só lista por localização |
| 16 | UI responsiva, acessível, estados vazios/humor honestos | C | `src/app/page.tsx`; teste "keeps responsive nav distinct"; estados vazios adaptativos |
| 17 | Salvos (client-side, visível) | C | localStorage + aba "Salvos" |

## 2. Ainda não implementada / bloqueada (Fases 3–8 do PROMAX)

| # | Funcionalidade | Status | Observação honesta |
|---|---|---|---|
| 18 | Campos de AVCB/licenciamento (tipo, nº, validade, confiança) | N | Nenhuma fonte pública gratuita e confiável para AVCB em escala; **não inventar irregularidade** — até haver fonte, o sistema só pode marcar "potencial oportunidade para qualificação" |
| 19 | Varredura nacional por lotes/regiões com retomada de tarefa | N | Próximo passo da Fase 2 (lote por UF, sequência pausada pelo rate limit 8/min do `/api/research`, progresso + retomada via localStorage) |
| 20 | Qualificação comercial configurável (perfis, pesos, histórico) | P | Existem `Preferences` + lead states locais; sem pesos configuráveis por perfil |
| 21 | Bot de IA determinístico (funciona sem API paga) | N | — |
| 22 | CRM (10 estágios, responsáveis, histórico, modelos de mensagem **sem disparo automático**) | P | Só lead state local (1 estágio). Sem persistência |
| 23 | Alertas | N | — |
| 24 | Persistência de produção (Supabase/Postgres; nunca SQLite/local na Vercel) | B | Nenhum banco configurado; requer credenciais/conta do usuário (Fase 6) |
| 25 | Sync agendada (Vercel Cron + segredo em env, incremental, retomada) | B | Sem cron configurado; não existe "atualização automática" no produto hoje — só consulta sob demanda |
| 26 | Autenticação (e-mail + Google) + sessões + RLS | B | Sem credenciais reais fornecidas; `auth.ts` atual é stub local |
| 27 | LGPD (correção/exclusão de dados, consentimento) | P | Sem dados pessoais coletados hoje (anônimo); fluxo de exclusão só ganha sentido com persistência |
| 28 | Dashboard com métricas reais | P | Métricas por consulta (cobertura, contagens) existem; sem métricas agregadas no tempo (exigem banco) |
| 29 | Última sincronização bem-sucedida por fonte | N | Só existe por consulta (sem histórico persistente) |

## 3. Verificações ao vivo (26/10/2026)

| Fonte/endpoint | Parâmetro de UF | Comporta-se? |
|---|---|---|
| PNCP `/contratacoes/proposta` | `uf` | **Sim** (10/10 SP em produção) |
| PNCP `/contratos` | `uf` | **Não — ignorado** (idêntico com/sem; vários estados) |
| PNCP `/atas` | `uf` | **Não — ignorado** (página mistura RS/SP/RR/MG/PR) |
| Obrasgov `/obras/projeto-investimento` | `uf_principal` | **Sim** (amostra 100% SP) |
| Transferegov `/parcerias/proposta` | `sg_uf_recebedor` | **Sim** (amostra 100% SP) |
| Transferegov `/especiais` | `sg_uf_recebedor` | **Não — ignorado** (total 58990 idêntico) |
| GDELT / OSM / IBGE | — | Não suportam UF (localidade só via query) |

Conclusão aplicada: o app agora envia UF só onde a API respeita (item 4) e filtra localmente onde não respeita (item 5), com a UI declarando o modo de cada fonte.

## 4. Portas de qualidade (executadas neste commit)

- `npx vitest run` → 55 testes, 15 arquivos, todos passam
- `npx tsc --noEmit` → 0 erros
- `npm run lint` → 0 erros (27 warnings `any` pré-existentes, não introduzidos)
- `npm run build` → ok
- Sem segredos no repositório; `.env.example` presente

## 5. O que o usuário precisa fazer (não dá para fazer daqui)

1. **Redeploy na Vercel** do branch (Root Directory = `accert-intelligence-site-final`) — o build publicado ainda é anterior às correções de fontes.
2. Fases 6–7: decidir banco (Supabase recomendado, gratuito) e fornecer credenciais de auth (Google) quando quiser avançar.
3. Cron da Fase 6: configurar Vercel Cron + `CRON_SECRET` em env (só o usuário pode criar na Vercel).
