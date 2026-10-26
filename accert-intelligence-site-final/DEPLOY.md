# Colocar a Accert Intelligence no ar — GitHub + Vercel

Para instruções mais didáticas, desde baixar/extrair o ZIP até verificar o site e entender cada serviço, consulte [`GUIA-PASSO-A-PASSO-PUBLICACAO.md`](./GUIA-PASSO-A-PASSO-PUBLICACAO.md).

Este guia publica o código existente. **Ainda não há publicação feita**: é necessário que a pessoa responsável crie/conecte suas próprias contas GitHub e Vercel e autorize o deploy.

## Antes de publicar

1. Instale Node.js 20 LTS (ou versão suportada pelo Vercel) e Git.
2. Na pasta do projeto, rode:
   ```bash
npm ci
npm run typecheck
npm test
npm run lint
   npm run build
   ```
   O lint atualmente termina sem erros, mas relata avisos listados no README. Trate-os em uma revisão de código antes de depender do lint como barreira de qualidade.
3. Revise os limites de uso: a proteção de requisições na aplicação é por instância e **não distribuída**. Configure regras de firewall/rate limits no Vercel antes de divulgar o endereço publicamente.
4. Nenhuma API key é obrigatória neste estado. Não coloque segredos de terceiros em variáveis `NEXT_PUBLIC_*`.

## 1. Criar repositório no GitHub

### Pela interface do GitHub

1. Acesse [github.com/new](https://github.com/new) e entre na sua conta.
2. Dê um nome, por exemplo `accert-intelligence`.
3. Escolha **Private** ou **Public** conforme a decisão da Accert. O site publicado pode ser público independentemente da visibilidade do repositório.
4. Não marque para criar README, `.gitignore` ou licença — o projeto já contém arquivos próprios.
5. Crie o repositório e copie a URL HTTPS apresentada.

### Enviar os arquivos existentes

No terminal, a partir da pasta do projeto:

```bash
git init
git add .
git status
git commit -m "feat: Accert Intelligence commercial radar"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/accert-intelligence.git
git push -u origin main
```

Troque a URL pelo repositório criado. Se a pasta já tiver remoto Git configurado, não execute `git remote add origin` novamente; confira com `git remote -v`.

Antes de `git add`, confirme que `.env.local`, tokens, credenciais e dados privados não estão staged. O `.gitignore` exclui arquivos `.env*`, mas não substitui a revisão manual.

## 2. Importar e publicar na Vercel

1. Acesse [vercel.com/new](https://vercel.com/new) e entre/crie uma conta.
2. Escolha **Add New → Project** e conecte GitHub, autorizando o repositório desejado.
3. Clique em **Import** no repositório `accert-intelligence`.
4. Confira as opções:
   - Framework Preset: **Next.js**;
   - Root Directory: `./`;
   - Install Command: `npm ci` (padrão também funciona);
   - Build Command: `npm run build`;
   - Output Directory: deixar o padrão do Next.js;
   - Node.js: 20.x ou versão suportada pelo projeto.
5. Em **Environment Variables**, nenhuma variável é necessária para as integrações atuais. Não crie valores de exemplo nem chaves inventadas.
6. Clique em **Deploy**. A Vercel instala as dependências, executa o build e fornece uma URL `*.vercel.app` se o processo concluir.
7. Acompanhe **Deployments → Build Logs**. Se falhar, copie o erro real, corrija o projeto e envie um novo commit; não trate uma URL de preview como confirmação de build válido.

A Vercel geralmente cria previews para branches/PRs e promove produção a partir da branch configurada (normalmente `main`). Confira **Settings → Git → Production Branch**.

## 3. Confirmar que ficou público e funcional

Abra a URL de produção em uma janela anônima/desconectada do GitHub. Confira:

- A página inicial responde sem login;
- O painel consulta PNCP e mostra a fonte/estado de resposta;
- Contratos e atas abrem dados PNCP, ou mostram indisponibilidade explícita;
- A consulta Compras.gov.br pede código CATMAT/CATSER e não simula preços;
- O módulo GDELT pode falhar conforme a conectividade; a falha deve aparecer claramente;
- A aba Empresas aceita CNPJ numérico ou alfanumérico de 14 posições; teste apenas consulta autorizada. Um 404/falha da BrasilAPI não prova inexistência;
- A aba Território exige UF e município para consulta OSM, limita o retorno a 80 elementos e fornece categoria e link para o mapa; não é varredura nacional;
- Favoritos ficam no navegador e podem ser exportados/importados;
- Links externos abrem em outra aba.

Teste as funções da aplicação após o deploy, sem martelar APIs públicas. Para consultar a saúde real, use poucas requisições; os provedores são terceiros, podem limitar volume ou estar indisponíveis.

## 4. Domínio próprio (opcional)

Na Vercel, abra **Project → Settings → Domains**, adicione o domínio e configure no registrador exatamente os registros DNS fornecidos pela Vercel. Aguarde validação/SSL; não substitua DNS por valores genéricos deste documento.

## 5. Proteção de produção necessária

- Configure as ferramentas de Firewall / DDoS / rate limit disponíveis no plano Vercel, com limites adequados aos endpoints `/api/opportunities`, `/api/company`, `/api/compras` e `/api/news`.
- O limitador em memória deste código não compartilha contadores entre funções/instâncias e não é garantia contra abuso. Não anunciar “rate limit distribuído” até validar uma solução persistente/distribuída compatível e as respectivas variáveis no ambiente de produção.
- Habilite alertas de falha de deployment e acompanhe logs sem registrar dados pessoais, CNPJ completo sem necessidade ou segredos.
- Defina cotas de uso e monitore os limites das APIs gratuitas. Se houver abuso, bloqueie tráfego pelo firewall; não tente contornar limites do provedor.

## Diagnóstico rápido

- **Build Next falha:** compare o Build Log com `npm ci && npm run build` local; confirme runtime e versão de Node.
- **PNCP falha:** valide a consulta oficial, datas/paginação e status do PNCP; a interface não usa dados de fallback inventados.
- **Compras mostra vazio:** valide o código CATMAT/CATSER e o endpoint correspondente; resposta vazia pode ser legítima.
- **GDELT indisponível:** consulte a URL oficial/documentação e tente mais tarde; o sandbox/deployment pode não alcançar o host ou sofrer rate limiting. Não declare notícias encontradas se a resposta falhar.
- **Erro 429:** respeite o `Retry-After`, reduza a frequência e configure a proteção na hospedagem.
- **Favoritos ausentes em outro aparelho:** comportamento esperado; use exportação JSON no aparelho original e importe no novo. Não há sincronização.

## Rollback

Em **Deployments**, selecione o último deployment conhecido como estável e escolha **Promote to Production**/rollback, conforme a interface da Vercel. Faça rollback do código no Git após correção se necessário. Refaça os smoke tests depois da promoção.
