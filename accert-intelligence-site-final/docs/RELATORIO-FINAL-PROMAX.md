# RELATÓRIO FINAL — PROMPT MESTRE PROMAX

Data: 26/10/2026 · Repositório: `ytalo6411-art/accert-intelligent` · Branch: `arena/bb9421e4-accert-intelligent`
Princípio aplicado: **nada é declarado como sucesso sem evidência**. Fato confirmado × hipótese comercial são sempre diferenciados.

---

## 1) Auditoria

- Relatório completo: `docs/AUDITORIA-PROMAX.md` (tabela por funcionalidade com os 5 rótulos: Concluída e testada / Implementada, mas depende de configuração / Parcial / Bloqueada por limitação externa / Ainda não implementada).
- Diagnóstico original do repositório: `DIAGNOSTICO-ETAPA-1.md`.

## 2) O que foi implementado neste ciclo (com commits)

| Commit | Conteúdo |
|---|---|
| `e77e17b8` | Etapa 1: auditoria completa do repositório |
| `4774277f…26cb671d` | Etapa 2: auto-carregamento, GDELT corrigido, timeouts, UI de falha de fonte |
| `72926ec4` | Filtro UF real (remoto/local), retry com backoff+jitter, versão dos conectores, transparência de filtros, auditoria |
| (deste ciclo) | Pesos configuráveis de pontuação, bot determinístico, CRM de 10 estágios c/ histórico + modelos, varredura nacional por UF c/ retomada, LGPD local, `.env.example` |

## 3) Fontes reais em uso (todas públicas, sem custo)

| Fonte | Uso | Verificado ao vivo (26/10) |
|---|---|---|
| PNCP (pncp.gov.br) | Propostas, contratos, atas | Sim — dados reais em produção |
| Obrasgov | Obras/projetos de investimento | Sim |
| Transferegov | Parcerias e planos especiais | Sim |
| Compras.gov.br | Preços de materiais (1_consultarMaterial) | Sim (resposta vazia é legítima) |
| BrasilAPI | CNPJ/empresas | Sim |
| CNO | CNPJ | Sim |
| GDELT | Notícias (query calibrada) | Código corrigido; rede do sandbox não alcança — mensagem de falha específica |
| OpenStreetMap/Overpass | Estabelecimentos | Best-effort (instável; 1/min por IP) |
| IBGE | Municípios | Best-effort (instável no sandbox) |

## 4) Fontes que exigem credenciais (ainda NÃO usadas — preparadas)

- **Supabase/Postgres** (persistência de produção, Fase 6): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Google OAuth** (autenticação, Fase 7): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`.
- **Vercel Cron** (sync agendada, Fase 6): `CRON_SECRET`.
- Nenhuma dessas variáveis tem valor no repositório; `.env.example` documenta e fica vazio por design.

## 5) Fontes indisponíveis/limitadas

- **AVCB/licenciamento**: não existe API pública gratuita confiável em escala (ver item 7).
- **Overpass/IBGE**: instáveis no sandbox — o app degrada isoladamente (fonte marcada "indisponível", sem quebrar as demais).
- **GDELT**: limite de 1 req/5 s por IP; query limitada a ~6 frases (calibrado ao vivo).

## 6) Como funcionam as buscas

1. **Remoto**: UF vai para a API quando ela respeita (verificado: PNCP propostas, Obrasgov, Transferegov parcerias). Nas demais, o parâmetro é ignorado pela API e o app **filtra localmente pelo estado** (`sameUf`; estado ausente = desconhecido, mantido).
2. **Paginação**: até 100 páginas/fonte; cobertura por lote (rápida 1 pág / ampliada 3 / detalhada 5).
3. **Filtro de município**: local (nome + código IBGE).
4. **Resiliência**: retry 1× com backoff 400–900 ms por fonte; falha de uma fonte isola apenas ela.
5. **Varredura nacional**: 27 lotes (1 UF por vez), pausa de 7,6 s entre lotes (rate limit 8/min), progresso, **retomada** após interrupção (estado no navegador), export CSV.
6. **Deduplicação**: conservadora (mesma origem+id, ou título+município+UF+data) — nunca apaga registro real.
7. **Limites**: intervalo máx. 90 dias; 8 pesquisas/min por IP no agregador; OSM 1/min.

## 7) AVCB

**Não se declara irregularidade.** Não existe fonte pública gratuita confiável de AVCB em escala, portanto o produto não afirma "sem AVCB/sem licença" em nenhuma circunstância. Onde há sinal (ex.: obra nova), o sistema marca **"potencial oportunidade para qualificação"** e o bot recomenda validar a obrigação diretamente com a organização. Essa restrição é explícita no código (`evidenceConfidence`), no texto do bot e na auditoria.

## 8) Bot de IA

- **Determinístico e 100% local** (`src/lib/bot.ts`) — sem API paga, sem envio de dados para fora do navegador.
- Diferencia os três conceitos que a maioria dos dashboards confunde:
  - **Potencial** (aderência aos serviços da Accert),
  - **Prioridade** (urgência de abordagem: prazo + recência),
  - **Probabilidade** (força da evidência disponível — **não** é previsão de fechamento; o aviso diz isso explicitamente).
- Cada nota 0–100 vem com **razões** listadas; riscos são **lacunas reais dos dados** (ex.: "valor não divulgado"), nunca suposições.
- Rascunho de mensagem usa **somente campos reais** da fonte; o envio é manual (copia para a área de transferência) — **não há disparo automático**.
- Testes: determinismo, não-invenção, urgência, evidência fraca (5 testes).

## 9) CRM

- **10 estágios**: Identificada → Em investigação → Aguardando verificação → Qualificada → Contato planejado → Contatada → Proposta enviada → Em negociação → Convertida → Descartada.
- Por lead: responsável, notas, próxima ação, **histórico cronológico** (mudanças de etapa são registradas automaticamente).
- **Modelos de mensagem** (abordagem/proposta/follow-up) com dados reais do lead — **cópia manual, sem disparo automático** (LGPD/anti-spam).
- Migração automática do formato antigo (9 estágios) já usado no navegador.
- Persistência **local** (navegador). CRM em servidor multiproduto depende da Fase 6.

## 10) Armazenamento

- **Hoje**: apenas `localStorage` do navegador (favoritos, CRM, preferências, pesos, varredura). Export JSON e **apagar dados locais** (LGPD) na interface.
- **Produção (Fase 6, pendente do usuário)**: Supabase/Postgres com migrações versionadas, deduplicação/idempotência por `origem+id` (a lógica já existe e é testada). **Nunca** SQLite/arquivo/memory na Vercel — documentado na auditoria.
- **Sync agendada**: não existe cron configurado; o produto **não declara "atualização automática"** — a varredura e as buscas rodam sob demanda.

## 11) Testes

- **75 testes em 18 suítes, todos passando** (`npx vitest run`).
- Cobrem: conectores/paginação, normalização, dedupe, filtros de UF (remoto e local), retry c/ backoff, pesos de pontuação, bot (determinismo/não-invenção), CRM (migração/histórico/estágios), varredura (27 UFs, erro isolado, teto de resultados), datas, rate limit, rotas (400/429), CSV, UI (navegação responsiva).
- Nenhum teste foi removido para passar build; nenhuma verificação foi desativada.
- `tsc --noEmit`: 0 erros · `lint`: 0 erros · `build`: ok.

## 12) Variáveis de ambiente

- Hoje: **nenhuma obrigatória** (fontes públicas).
- Preparadas (Fases 6–7): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET` — todas documentadas em `.env.example`, sem valores.

## 13) Tarefas do usuário (o que só ele pode fazer)

1. **Redeploy na Vercel** do branch `arena/bb9421e4-accert-intelligent` (Root Directory = `accert-intelligence-site-final`) — o build publicado ainda é anterior às correções.
2. (Fase 6) Criar projeto **Supabase** gratuito e preencher `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` em segredos da Vercel.
3. (Fase 6) Criar **Vercel Cron** para a rota de sync (será criada após o banco) + segredo `CRON_SECRET`.
4. (Fase 7) Criar credenciais **Google OAuth** (Google Cloud Console) e `AUTH_SECRET` (`openssl rand -base64 32`).
5. Aprovar o PR quando estiver satisfeito: `github.com/ytalo6411-art/accert-intelligent/pull/new/arena/bb9421e4-accert-intelligent`.

## 14) Estado GitHub/Vercel

- **GitHub**: branch `arena/bb9421e4-accert-intelligent` pushada com todos os commits; sem segredos no repositório; `.gitignore` cobre `node_modules`, `.next`, `.env*` (mantendo `.env.example`).
- **Vercel**: o domínio publicado (`accert-intelligent.vercel.app`) ainda serve o build anterior — **requer redeploy pelo usuário** (item 13.1). Após o redeploy, as rotas novas (pesos, varredura via API existente) passam a valer em produção.
- **PR**: disponível para criação (link acima); nenhum PR aberto/fechado até agora.

## 15) Teste ponta a ponta

- **APIs com dados reais (confirmado ao vivo, 26/10)**: PNCP/Obrasgov/Transferegov/Compras/BrasilAPI responderam com dados reais em produção; filtros de UF comparados com/sem parâmetro (tabela na auditoria).
- **Preview local**: build atual servido em `0.0.0.0:3000` (home 200, `/api/sources` 200 com versão dos conectores). No sandbox, as fontes externas aparecem degradadas por limitação de rede do ambiente — comportamento esperado e tratado na UI.
- **GDELT/Overpass/IBGE**: não alcançáveis a partir do sandbox; o código trata a falha com mensagem específica e isola a fonte (teste de falha isolada cobre este caminho).
- **O que NÃO foi validado**: o comportamento em produção após redeploy (pendência do usuário) e o fluxo de varredura completa de ~5 min em navegador real (a lógica é testada; a execução em rede depende do redeploy).
