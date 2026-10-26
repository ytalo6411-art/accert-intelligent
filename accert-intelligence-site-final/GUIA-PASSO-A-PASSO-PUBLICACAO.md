# Guia passo a passo: testar e publicar o Accert Intelligence

Este guia é para quem vai colocar **o projeto que já existe** no ar. Não é necessário criar outro aplicativo. Leia também [`DEPLOY.md`](./DEPLOY.md) para opções de segurança, domínio e rollback, e o [`README.md`](./README.md) para a documentação técnica.

> **Atenção antes de publicar:** no estado atual o site não tem login, autenticação nem banco de dados. A URL publicada pela Vercel normalmente fica acessível a qualquer pessoa que a conheça. Tornar o repositório GitHub privado **não** torna o site privado. Não publique dados internos, listas de clientes, notas de prospecção ou segredos. Se o painel precisar ser restrito à Accert, implemente e teste autenticação e autorização antes de usar com informação privada.

---

## 1. Entenda as peças do site

- **Next.js + React**: compõem o site e as rotas HTTP. A interface roda no navegador; as rotas `/api/...` fazem as consultas externas do lado do servidor.
- **TypeScript**: verifica tipos e ajuda a detectar erros antes da publicação (`npm run typecheck`).
- **Fontes públicas**: PNCP, Obrasgov, Transferegov, GDELT e OpenStreetMap/Overpass são consultadas sob demanda. A disponibilidade e a cobertura variam; uma falha não significa “zero resultados”.
- **Pesquisa territorial**: na aba **Território**, selecione UF, município, OpenStreetMap e categoria. É uma consulta pontual e limitada a até 80 elementos daquele município; não varre o Brasil nem mantém fila de tarefas.
- **Consulta por CNPJ**: a aba **Empresas** consulta a BrasilAPI. Aceita CNPJ numérico e alfanumérico. Dados ausentes na resposta permanecem desconhecidos; a consulta não confirma a necessidade de um serviço Accert.
- **Compras.gov.br**: consulta de preços por código CATMAT/CATSER, não pesquisa textual geral.
- **Favoritos e notas de prospecção**: ficam no armazenamento local do navegador. Não são compartilhados entre usuários ou dispositivos e não substituem um CRM.
- **Sem banco ou login**: este repositório não contém Supabase/PostgreSQL, políticas de acesso, fila persistente, agendador nem histórico compartilhado.

## 2. O que instalar

1. Instale **Node.js 20 LTS** e npm. O npm vem junto do Node. Baixe em [nodejs.org](https://nodejs.org/).
2. Instale o **Git** em [git-scm.com](https://git-scm.com/downloads) se for publicar pelo terminal.
3. Baixe o arquivo `accert-intelligence-site.zip` e extraia-o para uma pasta local, por exemplo `accert-intelligence`.
4. Abra um terminal nessa pasta. No Windows, pode usar PowerShell; no macOS/Linux, Terminal.

O ZIP inclui o código e `package-lock.json`, mas **não** inclui `node_modules` ou o build `.next`. Isso é esperado: o passo seguinte instala dependências reproduzíveis a partir do lockfile.

## 3. Instalar e testar localmente

Execute, um comando por vez, dentro da pasta extraída:

```bash
npm ci
npm run typecheck
npm test
npm run lint
npm run build
```

O que cada comando faz:

- `npm ci`: instala versões fixadas no `package-lock.json`; não instala pacotes globalmente.
- `npm run typecheck`: verifica tipos TypeScript sem gerar build.
- `npm test`: executa testes automatizados com respostas simuladas/fixtures; os testes unitários não dependem de todos os provedores estarem no ar.
- `npm run lint`: verifica padrões de código. Há avisos preexistentes, embora o comando não reporte erros fatais.
- `npm run build`: gera e valida o build de produção do Next.js.

Para abrir o site no computador:

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000). Para parar o servidor, volte ao terminal e pressione `Ctrl+C`.

### Testes manuais recomendados

1. Abra **Território**; selecione uma UF e município; escolha uma categoria OSM e consulte. Confira o estado da fonte e abra o link OSM dos registros. Cada item é apenas um elemento mapeado, não uma licença ou obra confirmada.
2. Abra **Empresas** e consulte um CNPJ válido que você esteja autorizado a pesquisar. O exemplo oficial alfanumérico `00.000.000/E08G-12` é usado em testes de formato; ele identifica um registro de exemplo da fonte, não um lead da Accert.
3. Confira mensagens de falha e de “não encontrado na fonte”. Não confunda erro de provedor com inexistência de empresa ou imóvel.
4. Teste exportação e favoritos com registros não confidenciais.

A unidade recente de verificação desta versão passou: `typecheck`, `test` (15 arquivos/49 testes) e `build`. O lint passou com avisos. Uma verificação bem-sucedida hoje não garante disponibilidade futura dos provedores.

## 4. Preparar o GitHub

O GitHub guarda o código e informa a Vercel quando há uma nova versão. **O repositório pode ser privado; o site publicado ainda pode ser público.**

1. Entre em [github.com](https://github.com/) e crie um repositório novo. Escolha um nome, como `accert-intelligence`.
2. Escolha a visibilidade desejada. Selecione **Private** para restringir o acesso ao código-fonte.
3. Crie o repositório **sem** gerar outro README, licença ou `.gitignore`, pois o projeto já possui esses arquivos.
4. Copie a URL HTTPS apresentada pelo GitHub.
5. No terminal, dentro da pasta extraída, confira se existe um remoto:

```bash
git remote -v
```

Se a pasta ainda não tiver Git iniciado, execute:

```bash
git init
git add .
git status
```

Revise a lista antes de confirmar. `.env*`, `.next`, `node_modules` e outros artefatos estão no `.gitignore`; mesmo assim confira que **não** há tokens, `.env.local`, dados de clientes ou material confidencial preparado para envio. O arquivo `.env.example` contém apenas orientações, não credenciais.

Depois, faça o primeiro commit e envie ao GitHub:

```bash
git commit -m "Publica Accert Intelligence"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/accert-intelligence.git
git push -u origin main
```

Substitua a URL pelo endereço real. Se `git remote -v` já mostrar o remoto certo, não repita `git remote add origin`. O Git pode pedir autenticação pelo navegador/token seguro; nunca inclua token na URL nem cole-o em arquivo do projeto.

## 5. Criar o projeto na Vercel

1. Entre em [vercel.com](https://vercel.com/) e crie/conecte a conta responsável pela publicação.
2. Escolha **Add New → Project** e autorize a Vercel a acessar o repositório GitHub.
3. Selecione `accert-intelligence` e clique **Import**.
4. Confira as opções do projeto:
   - Framework: **Next.js** (detecção automática);
   - Root Directory: `./`;
   - Install Command: `npm ci`;
   - Build Command: `npm run build`;
   - Output Directory: padrão Next.js;
   - Node.js: 20.x ou versão suportada indicada pela Vercel.
5. Em **Environment Variables**, as integrações atuais não precisam de variáveis obrigatórias. Não invente chaves. Nunca coloque segredo em variável `NEXT_PUBLIC_*`, pois variáveis com esse prefixo podem chegar ao navegador.
6. Pressione **Deploy**. A Vercel instala pacotes, compila o site, executa o build e, se tudo passar, mostra uma URL `*.vercel.app`.
7. Abra **Deployments → Build Logs** se ocorrer erro. Corrija o erro real no projeto, teste novamente e envie um novo commit. Não marque uma publicação como boa só porque existe uma URL de preview.

### O que acontece depois

Com o GitHub conectado, novos commits normalmente geram deployments de prévia; commits na branch de produção (frequentemente `main`) podem ser promovidos automaticamente para produção. Confira **Project → Settings → Git → Production Branch** antes de enviar alterações.

## 6. Verificar a publicação

Abra a URL Vercel em janela anônima. Isso ajuda a confirmar o que um visitante sem sessão verá. Verifique:

- A página carrega e a navegação funciona em desktop e celular.
- As consultas mostram fonte, status, data e limites. Tente poucas consultas; não sobrecarregue serviços públicos.
- **Território** exige município/UF e consulta no máximo uma localidade por vez; confirme a atribuição OSM e o link do mapa.
- **Empresas**: consulte um CNPJ válido. O sistema retorna os campos da BrasilAPI e mantém limitações explícitas. Um erro ou 404 da fonte não demonstra inexistência.
- Teste exportação CSV/JSON e um favorito local.
- Abra a URL em outro dispositivo: favoritos/notas não sincronizam, como esperado.
- Observe **Deployments** na Vercel e logs das rotas quando precisar investigar um erro. Não registre segredos nem dados pessoais desnecessários.

## 7. Segurança, privacidade e custos

- Hoje, o site e as rotas não têm login/autorização da Accert. Uma URL Vercel é acessível publicamente salvo proteção configurada na hospedagem. **Não o use como CRM privado antes de aprovar e implementar autenticação/autorização adequadas.**
- O limitador do código é em memória por instância; em serverless isso não é uma barreira distribuída. Configure regras de Firewall/abuso disponíveis no seu plano Vercel e teste-as.
- Não há tabela de dados, fila ou sincronização em PostgreSQL. Dados de fontes são consultados sob demanda; armazenamento do navegador é local.
- Não há cobrança de API obrigatória configurada neste momento, mas serviços gratuitos podem impor limites, mudar termos ou ficar indisponíveis. Consulte as condições vigentes da Vercel, GitHub e cada provedor antes de ampliar volume; “gratuito” não significa SLA ou uso ilimitado.
- Não faça crawling agressivo nem tente contornar login, CAPTCHA ou bloqueios. Respeite limites públicos de Overpass e demais APIs.

## 8. Domínio próprio e rollback

- Para domínio próprio, abra **Vercel → Project → Settings → Domains**, adicione o domínio e copie exatamente os registros DNS exibidos pela Vercel para o registrador do domínio. Aguarde validação e certificado HTTPS.
- Para rollback, abra **Deployments**, selecione a última versão que você verificou e use **Promote to Production**/rollback conforme aparecer na conta. Depois confirme a página e as rotas novamente.
- Não compartilhe a conta principal nem tokens de implantação; use controle de equipe com permissões mínimas.

## 9. Resolver problemas comuns

| Sintoma | O que conferir |
|---|---|
| `next: not found` | Rode `npm ci` na raiz do projeto; confirme que está na pasta que contém `package.json`. |
| Build falha na Vercel | Compare o log com `npm run build` local, versão do Node e configurações Root/Install/Build. |
| HTTP 429 | Aguarde o `Retry-After`, reduza consultas e verifique firewall/limites do provedor. |
| Fonte indisponível | Confira status do provedor/documentação e tente mais tarde, sem interpretar falha como ausência de registros. |
| Nenhum POI territorial | Confira município e UF, tente categoria diferente e lembre-se de que OSM tem cobertura colaborativa desigual. |
| CNPJ não retornado | Confirme caracteres e dígitos; verifique a fonte BrasilAPI. A resposta não prova que a empresa inexiste. |
| Favoritos não aparecem em outro navegador | Comportamento esperado: permanecem no armazenamento local daquele navegador. |
| Git diz “remote already exists” | Rode `git remote -v`; edite/remova o remoto existente somente depois de confirmar a URL correta. |

---

## Limite da entrega

Este guia explica a publicação do código atual; não publica o site, não cria contas, não configura domínio, não estabelece autenticação privada e não provisiona banco de dados. A implantação e a decisão sobre acesso público/privado devem ser feitas pela pessoa autorizada pela Accert.
