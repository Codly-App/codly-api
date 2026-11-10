<div align="center">

# Codly API

**Servidor da plataforma Codly: valida o login, aplica as regras de acesso e guarda os dados.**

</div>

---

## Sobre

A **Codly API** é o servidor Node.js da plataforma de aprendizado gamificado de programação Codly. Ela é a única parte que acessa o banco de dados (Firebase Firestore), e o aplicativo (`codly-app`) conversa com ela por HTTP.

A API é responsável por:

- Conferir quem é o usuário a partir do token de login do Firebase.
- Criar e manter o usuário no Supabase e o perfil no Firestore na primeira vez que ele acessa.
- Ler e gravar cursos, lições, progresso, XP, amigos e planos no Firestore.
- Aplicar as regras de acesso por plano (gratuito e Pro) e o limite de cursos ao mesmo tempo.
- Registrar erros em log e devolver mensagens amigáveis.

> O app nunca é a única barreira de segurança: a API também bloqueia o conteúdo protegido.

## Como funciona

```
App ──(login Google / e-mail)──> Firebase Auth ──> token
App ──(Bearer token)──> Codly API ──(valida o token)──> Firebase Auth
                             │
                             ├──(Firebase Admin)──> Firestore
                             └──(service_role)────> Supabase (tabela users)
```

1. O usuário entra no app pelo Firebase Auth (Google ou e-mail e senha), e o Firebase devolve um token de acesso.
2. O app envia o token em cada chamada protegida, no cabeçalho `Authorization: Bearer <token>`.
3. O middleware `requireAuth` valida o token com o Firebase Admin (`verifyIdToken`) e guarda o usuário em `req.user`.
4. Na primeira chamada autenticada (`GET /me`), a API cria o usuário na tabela `users` do Supabase e, no Firestore, o perfil, as estatísticas (XP e sequência) e a assinatura (plano gratuito). Nas chamadas seguintes ela só devolve o perfil, e atualiza o último login no máximo uma vez por hora.
5. As rotas leem ou gravam os dados do usuário no Firestore pelo Firebase Admin.
6. Se o token faltar ou for inválido, a API responde `401`.

**Decisão de segurança:** o login não é usado nas regras do Firebase. A API faz a ligação entre os serviços e concentra as regras de teste grátis, plano, XP e progresso. Por isso as regras de segurança do Firestore devem **negar todo acesso de cliente**: o Admin SDK, usado só aqui, ignora essas regras. A tabela `users` do Supabase também não aceita acesso do app, só da API.

## Tecnologias e bibliotecas

### Núcleo

- `express`: framework web para criar as rotas da API.
- `typescript`: linguagem do projeto, com tipagem estática.
- `tsx`: executa TypeScript direto no Node.js durante o desenvolvimento.
- `zod`: valida as variáveis de ambiente e os dados recebidos nas rotas.
- `dotenv`: carrega as variáveis do arquivo `.env`.
- `express-rate-limit`: limita requisições por IP e por usuário.

### Segurança

- `helmet`: define cabeçalhos HTTP de segurança.
- `cors`: libera o acesso apenas às origens do app (web e Capacitor).

### Serviços externos

- `firebase-admin`: SDK de servidor com acesso total ao Firestore e verificação dos tokens do Firebase Auth.
- `@supabase/supabase-js`: acessa a tabela `users` e o Storage de imagens do Supabase com a chave `service_role`.

### Tipos (desenvolvimento)

- `@types/node`: tipos do Node.js.
- `@types/express`: tipos do Express.
- `@types/cors`: tipos do CORS.

## Estrutura do projeto

```
codly-api/
├─ .env.example
├─ CLAUDE.md
├─ package.json
├─ tsconfig.json
├─ scripts/
│  └─ seed-courses.ts
└─ src/
   ├─ server.ts
   ├─ app.ts
   ├─ config/
   │  ├─ env.ts
   │  ├─ security.ts
   │  ├─ plans.ts
   │  ├─ levels.ts
   │  ├─ collections.ts
   │  ├─ firebase.ts
   │  └─ supabase.ts
   ├─ errors/
   │  └─ HttpError.ts
   ├─ middlewares/
   │  ├─ auth.ts
   │  ├─ rateLimit.ts
   │  ├─ requestLogger.ts
   │  └─ error.ts
   ├─ routes/
   │  ├─ index.ts
   │  ├─ health.ts
   │  ├─ me.ts
   │  ├─ courses.ts
   │  └─ users.ts
   ├─ services/
   │  ├─ users.service.ts
   │  ├─ usersSearch.service.ts
   │  ├─ supabaseUsers.service.ts
   │  ├─ subscriptions.service.ts
   │  ├─ courses.service.ts
   │  └─ summary.service.ts
   ├─ schemas/
   │  ├─ common.schema.ts
   │  ├─ me.schema.ts
   │  ├─ courses.schema.ts
   │  └─ users.schema.ts
   └─ types/
      └─ express.d.ts
```

| Caminho | Função |
| --- | --- |
| `src/server.ts` | Ponto de entrada: sobe o servidor na porta configurada, define os timeouts e encerra de forma limpa. |
| `src/app.ts` | Monta o Express: segurança, CORS, limites de requisição, leitura de JSON, rotas e tratamento de erro. |
| `src/config/env.ts` | Lê e valida as variáveis de ambiente. A API não inicia se alguma estiver faltando. |
| `src/config/security.ts` | Limites de segurança em um só lugar: tamanho do corpo, tamanho do token, timeout e limites de requisições. |
| `src/config/plans.ts` | Regras de planos: os dois planos (`free` e `pro`) e seus níveis, o limite de cursos ativos de cada um, o plano inicial e a duração do período de teste. |
| `src/config/levels.ts` | Regras de nível e de meta diária: quantos XP vale cada nível (500), as metas aceitas (20, 50 e 100 XP), a meta padrão (50) e o fuso usado para contar o dia (Brasília). |
| `src/config/collections.ts` | Nomes das coleções do Firestore (`users`, `courses`, `progress`...) em um só lugar, para não repetir texto solto nas rotas. |
| `src/config/firebase.ts` | Inicia o Firebase Admin e exporta o Firestore (`db`) e o Auth (`firebaseAuth`). |
| `src/config/supabase.ts` | Cria o cliente do Supabase com a chave `service_role`, usado na tabela `users` e no Storage. |
| `src/errors/HttpError.ts` | Erro com código HTTP (`401`, `403`...), usado para responder com a mensagem certa. |
| `src/middlewares/auth.ts` | `requireAuth`: valida o token do Firebase e preenche `req.user`. |
| `src/middlewares/rateLimit.ts` | Limites de requisições: global por IP, falhas de login, por usuário e nas rotas que gravam dados. |
| `src/middlewares/requestLogger.ts` | Registra método, rota, status e tempo de cada requisição, sem query string nem cabeçalhos. |
| `src/middlewares/error.ts` | Resposta para rota inexistente (`404`) e tratamento central de erros (`400`, `401`, `403`, `413` e `500`), com log. |
| `src/routes/` | Só HTTP: lê a requisição, chama um serviço e devolve a resposta. Cada arquivo agrupa as rotas de um assunto, e o `index.ts` junta todas. Sem regra de negócio. |
| `src/services/users.service.ts` | Cria e mantém o usuário: perfil, estatísticas e assinatura no Firestore, e o vínculo com o Supabase. |
| `src/services/usersSearch.service.ts` | Busca usuários por início do nome ou pelo código (uid) exato, sem o próprio usuário, e devolve só dados públicos (`uid`, `name`, `avatarUrl`). No máximo 20 resultados. |
| `src/services/supabaseUsers.service.ts` | Cria ou atualiza o usuário na tabela `users` do Supabase e devolve o seu `id`. |
| `src/services/subscriptions.service.ts` | Descobre o plano que vale agora para o usuário (`getUserPlan`). Plano desconhecido, teste vencido ou assinatura inativa voltam para o gratuito. |
| `src/services/courses.service.ts` | Lista os cursos com o progresso do usuário e o motivo da trava, e adiciona ou remove um curso conferindo o plano e o limite dentro de uma transação. |
| `src/services/summary.service.ts` | Monta o resumo do aluno para a tela inicial e o perfil: plano, XP, nível, sequência, meta do dia e cursos ativos (o curso mexido por último vem primeiro). A sequência volta a 0 se o aluno não estudou ontem nem hoje, e o XP do dia só vale se for de hoje. |
| `src/schemas/` | Schemas do Zod que validam o corpo, os parâmetros e a query das requisições (`me.schema.ts` para o nome, `courses.schema.ts` para o id do curso e `users.schema.ts` para a busca). |
| `scripts/seed-courses.ts` | Grava o catálogo inicial de cursos no Firestore. Pode rodar mais de uma vez sem duplicar. |
| `src/types/` | Tipos globais, como o `req.user` adicionado ao Express. |

## Rotas

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| `GET` | `/health` | Pública | Confirma que a API está no ar. |
| `GET` | `/me` | Com token | Devolve o perfil do usuário logado (`id`, `name`, `email`, `photoURL`, `tema`, `metaDiaria`). Na primeira chamada, cria o usuário no Supabase e o perfil, as estatísticas e a assinatura no Firestore. |
| `GET` | `/me/summary` | Com token | Resumo do aluno: `plan`, `stats` (`xp`, `streak`, `level`, `levelXp`, `nextLevelXp`), `dailyGoal` (`earnedXp`, `targetXp`) e `courses` ativos com `lessonsDone` e `lessonsTotal`. Cria o usuário no primeiro acesso. |
| `GET` | `/users/search?q=` | Com token | Busca pessoas por nome ou código. Devolve `uid`, `name` e `avatarUrl`, sem o próprio usuário. |
| `PATCH` | `/me` | Com token | Altera o nome (2 a 50 letras). Grava no Supabase, no Firestore (`nome` e `name`) e no Firebase Auth e, se um passo falhar, desfaz os anteriores. |
| `GET` | `/courses` | Com token | Lista os cursos publicados com `lessonsDone`, `enrolled` e `lockReason` (`plan`, `limit` ou `null`). |
| `PUT` | `/me/courses/:courseId` | Com token | Adiciona o curso. `403` se o curso é exclusivo do Pro ou se o limite de cursos do plano foi atingido, `404` se não existe. Repetir o pedido não dá erro. |
| `DELETE` | `/me/courses/:courseId` | Com token | Remove o curso da lista do usuário e mantém o progresso salvo. Sempre permitido. |

As rotas de configurações do usuário (`GET` e `PATCH /me/settings`, usadas pelas telas de preferências, notificações e privacidade) e a de excluir a conta (`DELETE /me`) ainda **não existem**. O XP do dia (`dailyXp` e `dailyXpDate` na coleção `stats`) ainda não é gravado por nenhuma rota, e só passa a valer com a conclusão de lições. As demais (lições, progresso, XP e amigos) serão adicionadas conforme o desenvolvimento.

## Convenções

- **Rotas finas:** a rota só trata HTTP. Consultas ao Firestore e cálculos ficam em `services/`.
- **Validação:** todo dado que chega do cliente passa por um schema do Zod antes de ser usado.
- **Usuário:** vem sempre de `req.user`, preenchido pelo `requireAuth`. Nunca do corpo da requisição.
- **Identificadores:** o `uid` do Firebase é a chave dos documentos do Firestore. O `id` do Supabase (uuid) é interno e nunca é devolvido ao app.
- **Respostas de erro:** seguem o formato `{ "message": "texto amigável" }`, com os códigos `400`, `401`, `403`, `404`, `413`, `429` e `500`.
- **Um arquivo por responsabilidade:** um router por arquivo e um serviço por assunto.
- **Rotas que gravam dados:** usam o `writeLimiter` e validam a entrada com Zod.
- **Regras completas:** estão no `CLAUDE.md`.

## Segurança

| Proteção | Detalhe |
| --- | --- |
| Limite global por IP | 300 requisições a cada 15 minutos. |
| Limite de falhas de login | 20 tentativas com erro a cada 15 minutos, por IP. |
| Limite por usuário | 120 requisições por minuto, em rotas protegidas. |
| Limite de gravação | 30 requisições por minuto, em rotas que gravam dados. |
| Tamanho do corpo | Máximo de 10 KB (`413` acima disso). |
| CORS | Só as origens da lista `CORS_ORIGINS`. |
| Cabeçalhos | `helmet` ativo e `x-powered-by` desligado. |
| Cache | Respostas com `Cache-Control: no-store`. |
| Token | Formato `Bearer` e tamanho máximo conferidos antes de consultar o Firebase. |
| Rotas | Protegidas por padrão: tudo abaixo do `requireAuth` em `routes/index.ts` exige login. |
| Supabase | Tabela `users` com RLS ativa e sem políticas: só a API (`service_role`) acessa. |
| Logs | Sem token, cabeçalhos ou query string. |
| Timeouts | Requisição com limite de 30 segundos. |

Os valores ficam em `src/config/security.ts`.

## Dados

### Supabase: tabela `users`

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | uuid | Chave primária, gerada pelo Supabase. Uso interno, nunca vai para o app. |
| `firebase_uid` | text, único | Liga o usuário ao login do Firebase. |
| `name` | text | Nome. |
| `email` | text, único | E-mail. |
| `email_verified` | boolean | E-mail confirmado. |
| `picture` | text | Endereço da foto de perfil. |
| `created_at` | timestamptz | Criação da conta. |
| `last_login_at` | timestamptz | Último login. |

Dados de estudo (XP, sequência, plano, progresso) ficam só no Firestore, nunca nesta tabela.

### Firestore

| Coleção | Campos principais |
| --- | --- |
| `users` | userId, supabaseUserId, nome, email, avatar, tema, metaDiaria, createdAt, lastSyncAt |
| `courses` | id (ex.: `sql-basico`), title, description, iconKey, lessonsTotal, requiredPlan (`free` ou `pro`), order, published |
| `modules` | courseId, titulo, ordem, nivel |
| `lessons` | moduleId, titulo, tipo, conteudo, xp, accessLevel |
| `exercises` | lessonId, tipo, enunciado, opções, resposta/validador |
| `progress` | Hoje por curso: userId, courseId, enrolled, lessonsDone, enrolledAt, updatedAt. O progresso por lição (lessonId, status, score, attempts, completedAt) será acrescentado com as lições. |
| `stats` | userId, xp, streak, lastStudyDate, totalLessons |
| `subscriptions` | userId, plan, status, trialEndsAt, updatedAt |
| `friendships` | userId, friendId, status, createdAt |

Os documentos de `users`, `stats` e `subscriptions` usam o `uid` do Firebase como ID. O de `progress` usa `{uid}_{courseId}`, e o de `courses` usa o id do curso.

## Regras de acesso por plano

Existem só dois planos, definidos em `src/config/plans.ts`:

| | Gratuito (`free`) | Pro (`pro`) |
| --- | --- | --- |
| Cursos iniciais (SQL e JavaScript do zero) | Sim | Sim |
| Cursos avançados | Não | Sim |
| Cursos ativos ao mesmo tempo | Até 2 | Sem limite (3 ou mais) |

- Todo usuário novo começa no plano `free` (`plans.defaultPlan`).
- A API calcula o plano que vale agora em `getUserPlan`: o Pro só vale com a assinatura ativa (`status: "active"`) ou com o período de teste em dia (`trialEndsAt`). Caso contrário, vale o gratuito.
- Cada curso tem um `requiredPlan`. Se o usuário não tem esse plano, o curso vem com `lockReason: "plan"` e `PUT /me/courses/:courseId` responde `403`.
- Se o usuário já está no limite de cursos ativos do plano, os outros cursos vêm com `lockReason: "limit"` e o `PUT` responde `403`. A contagem e a gravação acontecem na mesma transação, então dois pedidos ao mesmo tempo não passam do limite.
- Quem tem um curso nunca o vê travado, mesmo se o plano mudar. As rotas de lição conferem o plano de novo.
- Valor de plano desconhecido falha fechado: no usuário vira `free`, e no curso exige `pro`.
- O período de teste de 7 dias (`trialDays`) ainda é criado para novos usuários, mas o plano inicial é o gratuito, então hoje ele não muda o acesso.

## Como rodar

```bash
npm install
cp .env.example .env
npm run dev
```

No PowerShell, troque o segundo comando por `Copy-Item .env.example .env`.

Preencha o `.env` antes de iniciar. A API sobe em `http://localhost:3333`.

Antes da primeira execução, crie a tabela `users` no Supabase (SQL Editor) com o script da seção **Dados**, com RLS ativada e sem políticas.

| Script | O que faz |
| --- | --- |
| `npm run dev` | Inicia em modo de desenvolvimento, reiniciando a cada alteração. |
| `npm run build` | Compila o TypeScript para a pasta `dist/`. |
| `npm start` | Executa a versão compilada (produção). |
| `npx tsx scripts/seed-courses.ts` | Grava o catálogo de cursos no Firestore (rode uma vez, e de novo quando mudar o catálogo). Grava no projeto do `.env`. |

## Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `PORT` | Porta do servidor (padrão `3333`). |
| `NODE_ENV` | `development`, `production` ou `test`. |
| `TRUST_PROXY` | Quantos proxies existem na frente da API (`0` nenhum, `1` Render, Railway ou Nginx). Define de onde vem o IP usado nos limites de requisição. |
| `CORS_ORIGINS` | Origens permitidas, separadas por vírgula. Inclui o app web e as origens do Capacitor (`capacitor://localhost` no iOS e `https://localhost` no Android). Obrigatório em produção. |
| `SUPABASE_URL` | URL do projeto no Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave `service_role` do Supabase. |
| `FIREBASE_PROJECT_ID` | ID do projeto no Firebase. |
| `FIREBASE_CLIENT_EMAIL` | E-mail da conta de serviço do Firebase. |
| `FIREBASE_PRIVATE_KEY` | Chave privada da conta de serviço do Firebase. |

> **Atenção:** a `service_role` do Supabase e a chave privada do Firebase dão acesso total. Nunca comite o `.env` nem coloque esses valores no app.

## Propriedade intelectual

Este repositório é mantido pela equipe responsável pela Codly. Salvo disposição expressa em licença aplicável ou autorização específica, todos os direitos autorais e demais direitos de propriedade intelectual permanecem reservados aos respectivos titulares.

---

<div align="center">

**Codly — Aprenda. Pratique. Evolua.**

</div>