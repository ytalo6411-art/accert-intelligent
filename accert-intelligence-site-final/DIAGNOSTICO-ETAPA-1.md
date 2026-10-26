# Etapa 1 — Diagnóstico: por que o site abre vazio?

Data: 26/10/2026. Nenhum código foi alterado nesta etapa — apenas investigação.

## 1. Visão geral do projeto (leitura completa)

- **Stack:** Next.js 15.5.28 (App Router) + React 18 + TypeScript + Tailwind CSS. Sem banco de dados, sem login, sem chaves de API. Testes com Vitest; lint com ESLint.
- **Estrutura** (dentro de `accert-intelligence-site-final/`):
  - `src/app/page.tsx` — dashboard completo (abas: Oportunidades, Território, Contratos, Atas, Notícias, Compras.gov.br, Empresas, Salvos, Fontes e cobertura). Componente de cliente; favoritos/pipeline ficam em `localStorage`.
  - `src/app/api/*` — rotas server-side: `research` (agregador multi-fonte), `opportunities` (PNCP), `news` (GDELT), `compras` (Compras.gov.br), `company` (BrasilAPI CNPJ), `municipalities` (IBGE), `sources` (catálogo estático).
  - `src/lib/providers/*` — um adaptador por fonte (PNCP, Obrasgov, Transferegov, GDELT, Overpass/OSM, Compras, BrasilAPI).
  - `src/lib/research.ts` — agrega as fontes em paralelo, com deadline por fonte e relatório por fonte.
  - `src/lib/rate-limit.ts` — limitador em memória, por instância (best-effort, não distribuído).
- **De onde vêm os dados:** tudo em tempo real, sob demanda: PNCP (`pncp.gov.br`), Obrasgov (`api-publica.obrasgov.gestao.gov.br`), Transferegov (`api-publica.transferegov.gestao.gov.br`), GDELT DOC (`api.gdeltproject.org`), Overpass/OSM (`overpass-api.de`), IBGE (`servicodados.ibge.gov.br`), Compras.gov.br (`dadosabertos.compras.gov.br`), BrasilAPI (`brasilapi.com.br`). Nada de fallback inventado.
- **Deploy:** Vercel (Next.js), a partir de repositório no GitHub. O projeto vive na subpasta `accert-intelligence-site-final/` — o Root Directory do Vercel precisa apontar para ela (ver Etapa 5).

## 2. Síntese dos testes (produção + fontes diretas)

| Fonte | Rota da app (produção) | Fonte direta | Status |
|---|---|---|---|
| PNCP (propostas/contratos/atas) | `/api/research` e `/api/opportunities` → **200, com registros reais** | OK (via app) | ✅ OK |
| Obrasgov.br | `/api/research` → **ok** (2 correspondências) | **200 com dados** | ✅ OK |
| Transferegov.br (Parcerias + Especiais) | `/api/research` → **ok** nos dois módulos | OK (via app) | ✅ OK |
| GDELT DOC | `/api/news` → **indisponível** | **erro de sintaxe da query** (reproduzido) | ❌ FALHA |
| OpenStreetMap/Overpass | `/api/research&sources=osm` → **timeout 14 s** | instância lenta/indisponível | ❌ FALHA |
| IBGE Localidades | `/api/municipalities` → **indisponível** (timeout 4,5 s) | também inacessível do meu ambiente | ❌ FALHA |
| Compras.gov.br | `/api/compras` → **200** (vazio válido p/ código testado) | **200, `resultado:[]`** | ✅ OK (vazio legítimo) |
| BrasilAPI CNPJ | `/api/company` → **200, dados reais** (51 ms) | OK (via app) | ✅ OK |
| Catálogo estático | `/api/sources` → **200** | — | ✅ OK |

Validações locais do build atual (sem rede externa no sandbox): todas as rotas retornam 400 para parâmetros inválidos, 200 com degradação elegante quando a fonte não responde e 429 quando o rate limit local estoura. O build de produção (`npm run build`) conclui sem erros.

## 3. Causa principal do "Nenhum registro encontrado" + "0/0 fontes responderam"

**O build publicado na Vercel NÃO é o código deste repositório.** Evidências:

1. O HTML servido pela produção renderiza no estado inicial (SSR) a frase
   `Consultando… · … · 0/0 fontes responderam`. O código atual do repositório, buildado,
   renderiza `0 exibidos nesta página · 0 reportados pela fonte · … · 0/0 fontes responderam`
   (o estado inicial de `loading` é `false` no código atual). São builds diferentes.
2. O chunk da página gerado pelo build do repositório (`_next/static/chunks/app/page-8129f82ef1b4db5f.js`)
   **não existe na Vercel (HTTP 404)** — se a produção rodasse este código, o hash seria o mesmo
   (mesmo Next.js 15.5.28 + mesmas dependências do lockfile).

Consequência prática: a página pública está rodando uma versão antiga/derivada do
`page.tsx` em que a carga inicial falha (o contador `X/Y fontes responderam` só é preenchido
com o relatório da resposta de `/api/research`; com ele vazio, a UI mostra "0/0" e
"Nenhum registro encontrado").

**Importante:** a API pública de `/api/research` está funcionando AGORA — testei 3 vezes hoje
(26/10) com os mesmos parâmetros que a página envia e obtive 200 com ~96 registros reais
(PNCP 3 módulos ok, Obrasgov ok, Transferegov ok). Ou seja: o gargalo não é a fonte de dados,
é a página publicada estar defasada. **A correção prioritária é republicar o build atual**
(o que a Etapa 2 faz junto com as melhorias) e revalidar ao vivo.

Hipótese secundária (coberta pela Etapa 2): falhas intermitentes quando o PNCP responde lento
(função serverless estoura o tempo máximo e o browser recebe erro 500 em vez de JSON). A Etapa 2
deixa a UI tolerante a isso (exibe quais fontes falharam, com mensagem clara, sem derrubar as outras).

## 4. Causa e correção proposta de cada fonte com falha

### 4.1 GDELT DOC — ❌ (maior bug real de código)

- **Causa:** a query gerada por `src/lib/providers/gdelt.ts` é inválida para a API DOC 2.0:
  - Com termo de busca: monta `((("termo"))) (sourcelang:portuguese OR sourcelang:english)`
    — parênteses aninhados. Reproduzi ao vivo: a API responde
    `Parentheses may only be used around OR'd statements.`
  - Sem termo (lista padrão de 9 termos): reproduzi ao vivo a resposta
    `Your query was too short or too long.`
  - A rota trata qualquer resposta não-JSON como "indisponível", por isso a aba Notícias sempre
    falha quando há termo, e a aba Oportunidades nunca usa GDELT sem termo.
  - **Agravante:** a GDELT limita a ~1 requisição/5 s por IP (reproduzi ao vivo:
    `Please limit requests to one every 5 seconds…`). O IP de saída da Vercel é compartilhado,
    o que gera 429/rejeições mesmo com query válida.
- **Correção proposta (Etapa 2):**
  1. Montar query com sintaxe válida: só parênteses agrupando listas OR reais, sem aninhamento
     (ex.: `("a" OR "b") sourcelang:portuguese` — o formato simples `termo sourcelang:pt`
     respondeu JSON válido no teste).
  2. Limitar o nº de termos e o comprimento da query (cortar para o essencial).
  3. Detectar respostas em texto puro (mensagem de erro da GDELT) e tratar como falha explícita
     com a mensagem real, em vez de "indisponível" genérico.
  4. Manter o cache curto (`revalidate: 300 s`) e a degradação elegante; a UI já mostra falha
     sem inventar notícias (manter).

### 4.2 OpenStreetMap / Overpass — ❌ (disponibilidade de terceiros)

- **Causa:** a instância pública `overpass-api.de` é lenta/sobrecarregada (sem SLA). Reproduzi na
  produção: a consulta OSM abortou em 14 s (`This operation was aborted`). Também não consegui
  respondê-la do meu ambiente de teste (mesmo com query mínima) — padrão de instância sobrecarregada.
  Detalhe adicional: o nome do município precisa chegar como está no OSM (com acento) porque a
  busca é por `area[name="…"]`; o autocompletar de municípios (IBGE) está quebrado (item 4.3),
  o que aumenta erros de digitação.
- **Correção proposta (Etapa 2):**
  1. Reduzir o deadline do OSM de 14 s para ~8 s (14 s é tempo ruim de UX e fica perto de limites
     de função serverless).
  2. Manter o comportamento "não consulta sem município+UF" e a degradação elegante (já correto).
  3. (Opcional, Etapa 4/5) permitir espelho Overpass configurável via variável de ambiente.

### 4.3 IBGE Localidades (sugestão de municípios) — ❌ (fonte lenta/instável)

- **Causa:** `/api/municipalities` responde "IBGE indisponível" na produção; o deadline de 4,5 s
  é curto para a `servicodados.ibge.gov.br`, conhecida por lentidão e instabilidade. Tentei a API
  diretamente do meu ambiente e também não obteve resposta no tempo do teste.
- **Impacto:** nenhum efeito na lista de oportunidades — quebra só o autocompletar de municípios
  (que piora o item 4.2).
- **Correção proposta (Etapa 2):**
  1. Aumentar o deadline para ~8 s (a resposta já é cacheada 24 h com `revalidate: 86400`, então o
     custo só se repete se a primeira consulta falhar).
  2. Adicionar fallback local: um JSON estático dos municípios/UFs (≈ 5,5 mil, alguns centenas de
     KB) servido pela própria rota quando o IBGE não responder — referência administrativa
     estável, sem risco de "inventar obra".

### 4.4 PNCP — ✅ mas com uma peculiaridade em "Atas"

- Na janela testada (26/09 a 26/10), `kind=atas` retornou `sourceStatus: ok` com
  `total: 529.626`, porém 0 linhas aproveitáveis na página 1: o endpoint do PNCP filtra atas
  **pelo período de vigência** (não pela data de publicação) e o filtro local da app descarta atas
  cujo início de vigência ficou fora da janela. Ou seja: a fonte responde, mas a página pode
  mostrar pouco/nada em "Atas" sem parecer falha.
- **Correção proposta (Etapa 2/3):** tratar vigência como sobreposição (início ANTES do fim da
  janela E fim DEPOIS do início da janela) em vez de exigência de início dentro da janela, e
  exibir a vigência no card. Isso é semântica de filtro, não falha de fonte.

## 5. O que está certo (não mexer sem necessidade)

- Rotas validam parâmetros e respondem 400/429/503 com mensagens claras (testado localmente).
- Rate limit por instância funciona (429 após o limite) — segue sendo best-effort; o plano
  distribuído (Upstash/Vercel) é Etapa 4, como pedido.
- Degradação por fonte já existe no agregador (`research.ts`) e o painel "Cobertura desta
  consulta" já mostra status por fonte — falta só apareces quando a requisição inteira falha
  (caso "0/0"), o que a Etapa 2 endereça.
- Sem segredos/chaves no repositório (confira-se: nenhum `.env` com valores, nenhuma chave em
  código). O `.env.example` e o `.gitignore` existem apenas dentro do `accert-intelligence-site.zip`
  e **não** na pasta do projeto — serão formalizados na Etapa 5.

## 6. Plano de correção (resumo das próximas etapas)

1. **Etapa 2 (prioridades):** republicar o build atual (resolve o "0/0" na página); skeleton de
   carregamento e carga automática garantidos; painel de falha por fonte sempre visível; remover
   o texto de rate limit do rodapé (mover ao README); verificar/corrigir possível menu duplicado
   (no código atual, sidebar ≥1024 px e barra mobile <1024 px são mutuamente exclusivas —
   confirmo visualmente nesta etapa).
2. **Etapa 3 (uso):** filtros principais vs. avançados; passar UF/município/categoria para a
   consulta quando a fonte suportar (PNCP já aceita `uf` em propostas; Obrasgov aceita
   `uf_principal`; Transferegov aceita `sg_uf_recebedor`; GDELT/OSM não — aviso claro na UI);
   resumo "X oportunidades novas nos últimos 7 dias"; botão de salvar mais visível; mobile.
3. **Etapa 4 (segurança/desempenho):** cache já existe (revalidate por rota) — reforçar com
   `stale-while-revalidate`; proposta de rate limit distribuído (Upstash Redis) + Vercel
   Firewall, passo a passo da configuração antes de implementar; validação/sanitização já
   presente será auditada item a item; `npm audit` e atualização segura.
4. **Etapa 5 (repositório):** README completo, `.env.example`, `.gitignore`, decisão de
   Root Directory no Vercel, descrição/tópicos do GitHub.
