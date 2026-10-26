# Accert Intelligence — radar comercial para segurança contra incêndio

Aplicação pública Next.js App Router, TypeScript, sem login e sem banco de dados. A plataforma transforma evidências abertas em sinais para prospecção sobre **AVCB**, **instalação/manutenção de sistemas** e **projetos de prevenção**. Não consulta nem certifica a validade de AVCB.

**Novo por aqui?** Para executar e publicar o site passo a passo, veja [`GUIA-PASSO-A-PASSO-PUBLICACAO.md`](./GUIA-PASSO-A-PASSO-PUBLICACAO.md). Para deployment técnico, consulte [`DEPLOY.md`](./DEPLOY.md).

## Estado desta implementação (2026-10-25)

### Implementado
- **PNCP real**: consulta a contratações com propostas abertas, contratos/empenhos e atas, com paginação remota, datas de consulta, UF para propostas, identificadores e normalização tolerante a campos nulos. Foram feitas chamadas reais nesta sessão; contratos e atas responderam com registros no PNCP. Dados, datas e links devem ser conferidos na página de origem.
- **Compras.gov.br real (escopo limitado):** rota server-side de pesquisa de preço praticado por código de catálogo. A busca exige código CATMAT (material) ou CATSER (serviço); não é busca textual de licitações. O endpoint respondeu HTTP 200 em verificação real (o código testado não tinha registros de preços). Não juntamos esses preços como “empresas” nem como processos PNCP.
- **GDELT DOC API implementado:** busca ArtList JSON com título, domínio, data/URL, deduplicação e relevância potencial heurística. A chamada real não pôde ser concluída neste ambiente por timeout de conexão a `api.gdeltproject.org`; a integração está implementada, mas a disponibilidade não foi validada daqui. A interface informa falha e não exibe notícias inventadas.
- BrasilAPI continua disponível para consulta pontual de CNPJ.
- Painel de oportunidades com associação heurística a filas de serviço, segmento estimado, nível de evidência, explicação, prioridade estimada, próxima ação e texto sugerido de abordagem respeitoso. Há etapas locais da prospecção (identificada, investigação, verificação, qualificação, contato, negociação, conversão e descarte), notas e próxima ação.
- Busca contextual de linguagem natural no PNCP: normaliza português e expande um dicionário limitado de termos (ex.: construção/obra, galpão/centro de distribuição, incêndio/sprinkler), tenta extrair cidade e período em dias, ordena por correspondência explicável e não exige que todos os termos coincidam. Rápida/ampliada/detalhada varrem 1/3/5 páginas PNCP; o botão de ampliação adiciona um novo lote por clique, até cinco lotes. Localidades conhecidas divergentes são excluídas; se a fonte não informa município, o item permanece com essa limitação indicada. Busca é descoberta limitada, não uma busca textual remota garantida pelo PNCP.
- Filtros por texto, UF, período, cidade, categoria comercial local, fila de serviço, nível de evidência, segmento configurável e região digitada. Ordenação por prioridade heurística ou data; paginação PNCP. A consulta natural “últimos N dias” aplica o período, limitada a 90 dias. Filtros de categoria/serviço/segmento permanecem locais sobre o lote carregado. Favoritos, preferências e estados de acompanhamento ficam localmente no navegador.
- Exportação CSV e JSON de oportunidades; importação/mesclagem JSON de favoritos e etapas do pipeline local (limite de arquivo 1 MB, validação de estrutura e valores). Os dados importados não são executados. O arquivo de workspace também leva preferências para export, mas a importação atualmente mescla pipeline/favoritos e não sobrescreve configurações locais.
- Timeout, limites de parâmetros, cache, cancelamento de solicitações obsoletas, erros degradados e limites por endpoint por instância.

### Limitações explícitas
- **AVCB:** não há consulta pública oficial integrada que valide status, vencimento ou irregularidade. Nenhum desses estados é inferido ou declarado.
- As APIs PNCP usadas retornam registros de contratação pública e atas; o órgão comprador não equivale necessariamente a cliente privado da Accert. O sistema não extrai/identifica empresas privadas de forma garantida a partir de notícias nem inventa nomes, emails ou telefones.
- A classe “Necessidade comprovada por evidência” significa apenas que a fonte de contratação contém menção textual direta aos termos do serviço; **não prova obrigação legal, AVCB vencido, aptidão da Accert ou contratação de um fornecedor específico**. “Provável” e “exploratória” também são heurísticas para revisão humana.
- A classificação de categoria, segmento, serviço e prioridade é local/heurística. Filtros locais só analisam o lote carregado; o PNCP aplica período remoto a contratos e atas (atas pelo período de vigência) e o filtro UF remoto em propostas. A busca de propostas abertas usa o parâmetro oficial `dataFinal`; o período inicial e o texto contextual são filtrados localmente nos registros retornados. A busca varre páginas limitadas e mostra cobertura disponível/incompleta; não equivale a busca textual remota exaustiva no catálogo PNCP.
- A tela “Compras.gov.br” requer código numérico CATMAT/CATSER; limitações da API não permitem busca geral por texto nessa operação.
- **GDELT:** a chamada externa não foi verificada com sucesso neste ambiente; limite observado em referência/documentação varia e a API pode responder HTTP 429 ou ficar indisponível. O serviço é best-effort, timeout de 8 segundos, no máximo 75 artigos por chamada. Não há SLA contratado.
- **Rate limit:** limite de memória por instância: propostas/contratos/atas 30/min/IP, CNPJ 10/min/IP, GDELT 6/min/IP, Compras 12/min/IP. Usa `x-real-ip` e, como fallback, último endereço do `x-forwarded-for`, conforme proxy. Ainda **não é distribuído** e não bloqueia abuso de forma garantida em serverless; configure WAF/Firewall/rate limits no projeto Vercel antes de produção. Não foi configurado serviço externo porque não há credenciais ou orçamento garantidos. Cache por plataforma também pode responder a mesma consulta de forma compartilhada.
- Não há “Todos os resultados” que una licitações, contratos, atas, notícias e catálogo de preços; categorias permanecem em telas separadas para evitar misturar naturezas diferentes e deduplicação enganosa.
- Datas customizadas estão limitadas a 90 dias na rota PNCP; páginas de contratação limitadas; as páginas de propostas respeitam limite máximo oficial de 50 e contratos/atas têm tamanho controlado até 100. A página exibida pode ter menos itens após filtro local.

## Arquitetura e rotas

- `src/lib/providers/pncp.ts`: construção de consultas PNCP, adaptação de contratos/atas/propostas e paginação; `src/lib/providers/compras.ts` e `gdelt.ts`: adaptadores independentes de preços e notícias.
- `src/lib/commercial.ts`: regras de serviço, segmento, evidência, prioridade e próxima ação.
- `src/lib/rate-limit.ts`: guard local best-effort com limite de cardinalidade/limpeza por instância.
- `GET /api/opportunities?kind=opportunities|contracts|atas&page=1&size=20&from=YYYY-MM-DD&to=YYYY-MM-DD&q=&uf=&mode=quick|expanded|detailed&batch=0..4` — PNCP, timeout global de 9,5s; busca contextual limitada no servidor quando `q` é informado. Sem `q`, paginação é remota; com `q`, `page` pagina as correspondências já encontradas nos lotes consultados.
- `GET /api/news?q=&days=30` — GDELT DOC API `/api/v2/doc/doc`, `mode=ArtList`, JSON, max 75.
- `GET /api/compras?code=<CATMAT/CATSER>&type=material|servico&page=1&size=20&from=&to=` — Compras.gov.br `/modulo-pesquisa-preco/1_consultarMaterial` ou `/3_consultarServico`.
- `GET /api/company?cnpj=<14 posições>` — pesquisa externa on-demand à BrasilAPI CNPJ v1, validando CNPJ numérico e alfanumérico, com cache de 1 h (ou `refresh=1`). Retorna campos normalizados, origem, status e timestamp; inexistência na fonte não é conclusão de inexistência da empresa. Sem banco de dados ou histórico compartilhado. Veja [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), [`docs/DATA_SOURCES.md`](./docs/DATA_SOURCES.md) e o recorte entregue/pendente do PROMAX V3 em [`docs/PROMAX-V3-STATUS.md`](./docs/PROMAX-V3-STATUS.md).

Documentação oficial consultada para endpoints: [PNCP Swagger](https://pncp.gov.br/api/consulta/swagger-ui/index.html) e OpenAPI `/api/consulta/v3/api-docs`; [Compras.gov.br Swagger](https://dadosabertos.compras.gov.br/swagger-ui/index.html), incluindo CATMAT/CATSER e pesquisa de preços; [GDELT Project](https://www.gdeltproject.org/) e [DOC 2.0 API](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/); [BrasilAPI](https://brasilapi.com.br/docs). Consultar documentação vigente antes de escalar volume. Não há limite numérico oficial confirmado para PNCP/BrasilAPI neste projeto; aplicar baixo volume e tratar 429.

## Rodar localmente

Node.js 20+ e npm:

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Comandos: `npm test`, `npm run lint`, `npm run build`. Com o servidor local em execução, `npm run test:integration` faz chamadas reais às quatro rotas e informa falhas do provedor sem converter falha em sucesso. Nenhuma chave externa é necessária; `.env.example` não contém segredos. Testes de unidade usam fixtures; não os confundir com integração real.

## Publicação

O passo a passo completo para subir o código no GitHub, importar e publicar no Vercel, validar o site, configurar domínio, proteger os endpoints e fazer rollback está em [`DEPLOY.md`](./DEPLOY.md). Esta implementação **não foi publicada** pelo agente.

## Verificações executadas nesta sessão

- `npm test`: **18 testes passaram** (normalização/deduplicação, classificação, adaptador PNCP, filtros auxiliares e rate limit local).
- `npm run lint`: passou (0 erros), com 22 avisos: tipos `any`, imports não utilizados e dependências de hooks a revisar. `npm audit --omit=dev --audit-level=high`: zero vulnerabilidades de alta gravidade nas dependências de produção.
- `npm run build`: **build Next.js 15.5.28 de produção concluído** após as alterações.
- `npm run test:integration`: **3/4 verificações passaram**: PNCP contratos 200 com 10 registros; PNCP atas 200 com 10 registros; Compras.gov.br 200 com resposta vazia válida para o código testado; GDELT falhou por timeout e foi reportado como falha. Uma chamada anterior de PNCP atas teve falha transitória e uma repetição respondeu normalmente. Não declarar GDELT disponível até repetir com sucesso em outra rede/runtime.
- Rate limit foi testado em memória por testes de unidade, não entre múltiplas instâncias. Nada foi implantado ou enviado ao GitHub.

---

## PROMAX V6.0 — pesquisa comercial multi-fonte (estado verificado em 2026-10-26)

Esta seção descreve a implementação multi-fonte atual e prevalece sobre trechos da documentação V5 acima quando falarem de escopo da tela/API de pesquisa agregada.

### Pesquisa agregada e evidência

A nova tela de pesquisa usa `GET /api/research` e combina, quando selecionadas, consultas independentes a:

- **PNCP**: contratações públicas e compras relacionadas; paginação deliberadamente limitada.
- **Obrasgov.br**: projetos de investimento federal cadastrados. Um projeto documentado não garante que a obra esteja em execução.
- **Transferegov.br**: propostas/parcerias e planos de ação selecionados; repasse/proposta não prova início de obra ou intenção de comprar serviço de incêndio.
- **GDELT DOC**: notícias indexadas, best-effort; notícia/inauguração é pista, não prova de obra atual ou demanda.
- **OpenStreetMap/Overpass**, condicional: só se o usuário escolhe uma cidade/UF; agora permite filtrar categorias mapeadas (residencial, comercial, logística, industrial, saúde, educação, varejo, hotelaria, reunião, serviços e construção), com no máximo 80 elementos por chamada. Inclui coordenadas e link para o mapa quando a fonte fornece posição; POIs/edifícios sem nome são identificados explicitamente como sem nome. É contexto geográfico, não comprova obra, necessidade de AVCB ou validade de licença, e não é descoberta nacional nem fila retomável.

Cada retorno agregado informa relatórios por fonte, status/erro, contagem, momento da consulta e limites. A normalização preserva IDs/URLs/registros de origem e a deduplicação só junta itens conservadoramente semelhantes, retendo proveniência multi-fonte. Classes de evidência separam projetos públicos documentados, demanda de contratação, estabelecimentos potenciais e sinais indiretos. Confiança/categoria comercial são heurísticas, não certificações. Termos e filtros locais podem reduzir os resultados; a aplicação exibe query, profundidade e cobertura disponível, mas resultados de uma busca nacional **não** equivalem a cobertura nacional.

Parâmetros agregados: `q`, `city`, `uf`, `from`, `to`, `mode=quick|expanded|detailed`, `batch=0..1`, `page`, `size=10|20|50|100`, `sources=all|pncp,obrasgov,transferegov,gdelt,osm`. Janela máxima: 90 dias; tamanho máximo por fonte/endereço e número de páginas são limitados no servidor (máximo de 7 páginas por endpoint). Overpass ainda tem limite próprio de uma requisição/minuto/IP e depende de município informado. O endpoint agregado impõe 8 requisições/minuto/IP por instância. São limites defensivos, não garantia contra abuso: a memória é local a cada instância, sem coordenação distribuída.

Localidades sugeridas usam referência de municípios/UF do IBGE quando a API responde; sugestões não implicam que os demais provedores tenham cobertura naquela localidade. UF e município só devem restringir resultados se a fonte de origem trouxer localização comparável; ausência de localização significa desconhecido, não “fora da cidade”.

### Fontes investigadas e não integradas

- **CNO/RFB**: não foi confirmado endpoint anônimo aberto apropriado para consulta operacional; não há ingestão de arquivo feita. Cadastro de obra/responsável não seria, por si, prova de necessidade comercial.
- **Licenciamento municipal**: fragmentado, sem API nacional. Campinas apresenta consulta individual de alvarás com autenticação Gov.br; não foi tratada como API pública reutilizável nem integrada.
- **São Paulo — Sistema Aprova Digital**: o Portal de Dados Abertos publica extratos semestrais de solicitações de licenciamento, não uma confirmação direta de execução/obra. O catálogo consultado em 25/10/2026 indicava última atualização em 20/08/2026 e incluía recursos históricos até o 1º semestre de 2026. A API CKAN pública retornou metadados (HTTP 200), mas `datastore_search` nos recursos consultados retornou HTTP 404; o arquivo mais recente aparece com nome CSV, porém URL/extensão XLSX. Não foi integrado: uma integração responsável ainda precisa avaliar esquema/dicionário, tamanho, atualização, reutilização/licença, transferência e filtro local, além de evitar chamar solicitação de licença de obra iniciada. [Catálogo Aprova Digital](https://dados.prefeitura.sp.gov.br/dataset/ad).
- Compras.gov.br segue no módulo independente de pesquisa de preços por CATMAT/CATSER; não foi tratado como pesquisa textual ou um sinal agregado de obra. Serviços pagos, APIs autenticadas e crawling não foram incorporados.

### Persistência, execução e privacidade

Não foi criado banco de dados, conta/login, sincronização compartilhada, serviço de agendamento nem pipeline de atualização persistente. Favoritos e andamento continuam locais ao navegador/dispositivo. Respostas de fontes são consultadas sob demanda e podem usar cache curto da plataforma; nenhum processo periódico é afirmado. O rate limiting em memória é por instância e não é um controle distribuído. Não foi feito deploy nem push do repositório. A exportação CSV neutraliza prefixos comuns de fórmulas em planilhas em dados externos e possui testes unitários.

### Verificações V6 executadas

- `npm run lint`: passou, **0 erros e 27 avisos** (principalmente `any` e uma dependência de hook a revisar).
- `npx tsc --noEmit`: passou.
- `npm test`: passou, **15 arquivos / 49 testes**; inclui fixtures de adaptadores, pesquisa empresarial por CNPJ, descoberta territorial OSM categorizada, testes do agregador/API e proteção de exportação CSV contra fórmulas de planilha. Fixtures são simuladas, não representam disponibilidade ao vivo.
- `npm run build`: build de produção Next.js 15.5.28 concluído; inclui os mesmos avisos do lint.
- Não foi executado nesta verificação um teste live abrangente de todas as fontes nem um teste de cobertura nacional. A disponibilidade de PNCP, Obrasgov, Transferegov, GDELT, Overpass e IBGE deve ser reavaliada no ambiente de implantação; falha/timeout de provedor não deve ser interpretada como zero registros.
