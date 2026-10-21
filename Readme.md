<div align="center">

# Codly API

**Servidor da plataforma Codly: valida o login, aplica as regras de acesso e guarda os dados.**

</div>

---

## Sobre

A **Codly API** é o servidor Node.js da plataforma de aprendizado gamificado de programação Codly. Ela é a única parte que acessa o banco de dados (Firebase Firestore), e o aplicativo (`codly-app`) conversa com ela por HTTP.

A API é responsável por:

- Conferir quem é o usuário a partir do token de login do Supabase.
- Ler e gravar cursos, lições, progresso, XP, amigos e planos no Firestore.
- Aplicar as regras de acesso por plano (Demo, Básico e Pro) e de período de teste grátis.
- Registrar erros em log e devolver mensagens amigáveis.

> O app nunca é a única barreira de segurança: a API também bloqueia o conteúdo protegido.

## Como funciona

```
App ──(Google OAuth)──> Supabase Auth ──> token
App ──(Bearer token)──> Codly API ──(valida o token)──> Supabase
                             │
                             └──(Firebase Admin)──> Firestore
```

1. O usuário entra com Google no app, e o Supabase devolve um token de acesso.
2. O app envia o token em cada chamada protegida, no cabeçalho `Authorization: Bearer <token>`.
3. O middleware `requireAuth` pergunta ao Supabase quem é o dono do token e guarda o usuário em `req.user`.
4. A rota lê ou grava os dados do usuário no Firestore pelo Firebase Admin.
5. Se o token faltar ou for inválido, a API responde `401`.

**Decisão de segurança:** o login do Supabase não é usado nas regras do Firebase. A API faz a ligação entre os dois e concentra as regras de teste grátis, plano, XP e progresso. Por isso as regras de segurança do Firestore devem **negar todo acesso de cliente**: o Admin SDK, usado só aqui, ignora essas regras.

## Tecnologias e bibliotecas

### Núcleo

- `express`: framework web para criar as rotas da API.
- `typescript`: linguagem do projeto, com tipagem estática.
- `tsx`: executa TypeScript direto no Node.js durante o desenvolvimento.
- `zod`: valida as variáveis de ambiente e os dados recebidos nas rotas.
- `dotenv`: carrega as variáveis do arquivo `.env`.

### Segurança

- `helmet`: define cabeçalhos HTTP de segurança.
- `cors`: libera o acesso apenas às origens do app (web e Capacitor).

### Serviços externos

- `@supabase/supabase-js`: valida o token de login e identifica o usuário.
- `firebase-admin`: SDK de servidor com acesso total ao Firestore.

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
└─ src/
   ├─ server.ts
   ├─ app.ts
   ├─ config/
   │  ├─ env.ts
   │  ├─ collections.ts
   │  ├─ firebase.ts
   │  └─ supabase.ts
   ├─ middlewares/
   │  ├─ auth.ts
   │  └─ error.ts
   ├─ routes/
   │  ├─ index.ts
   │  ├─ health.ts
   │  └─ me.ts
   ├─ services/
   ├─ schemas/
   └─ types/
      └─ express.d.ts
```

| Caminho | Função |
| --- | --- |
| `src/server.ts` | Ponto de entrada: sobe o servidor na porta configurada. |
| `src/app.ts` | Monta o Express: segurança, CORS, leitura de JSON, rotas e tratamento de erro. |
| `src/config/env.ts` | Lê e valida as variáveis de ambiente. A API não inicia se alguma estiver faltando. |
| `src/config/collections.ts` | Nomes das coleções do Firestore (`users`, `courses`, `progress`...) em um só lugar, para não repetir texto solto nas rotas. |
| `src/config/firebase.ts` | Inicia o Firebase Admin e exporta o Firestore (`db`). |
| `src/config/supabase.ts` | Cria o cliente do Supabase com a chave `service_role`, usado para validar tokens. |
| `src/middlewares/auth.ts` | `requireAuth`: confere o token e preenche `req.user`. |
| `src/middlewares/error.ts` | Resposta para rota inexistente (`404`) e para erros inesperados (`500`), com log. |
| `src/routes/` | Só HTTP: lê a requisição, chama um serviço e devolve a resposta. Cada arquivo agrupa as rotas de um assunto, e o `index.ts` junta todas. Sem regra de negócio. |
| `src/services/` | Regras de negócio e acesso ao Firestore (progresso, XP, planos, amigos). Um arquivo por assunto, reaproveitado por várias rotas. |
| `src/schemas/` | Schemas do Zod que validam o corpo, os parâmetros e a query das requisições. |
| `src/types/` | Tipos globais, como o `req.user` adicionado ao Express. |

## Rotas

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| `GET` | `/health` | Pública | Confirma que a API está no ar. |
| `GET` | `/me` | Com token | Devolve o usuário logado e o perfil salvo no Firestore. |

As demais rotas (cursos, lições, progresso, XP, planos e amigos) serão adicionadas conforme o desenvolvimento.

## Convenções

- **Rotas finas:** a rota só trata HTTP. Consultas ao Firestore e cálculos ficam em `services/`.
- **Validação:** todo dado que chega do cliente passa por um schema do Zod antes de ser usado.
- **Usuário:** vem sempre de `req.user`, preenchido pelo `requireAuth`. Nunca do corpo da requisição.
- **Respostas de erro:** seguem o formato `{ "message": "texto amigável" }`, com os códigos `400`, `401`, `403`, `404` e `500`.
- **Um arquivo por responsabilidade:** um router por arquivo e um serviço por assunto.
- **Regras completas:** estão no `CLAUDE.md`.

## Dados no Firestore

| Coleção | Campos principais |
| --- | --- |
| `users` | userId, nome, avatar, tema, metaDiaria, createdAt |
| `courses` | id, slug, titulo, descricao, ordem, status |
| `modules` | courseId, titulo, ordem, nivel |
| `lessons` | moduleId, titulo, tipo, conteudo, xp, accessLevel |
| `exercises` | lessonId, tipo, enunciado, opções, resposta/validador |
| `progress` | userId, lessonId, status, score, attempts, completedAt |
| `stats` | userId, xp, streak, lastStudyDate, totalLessons |
| `subscriptions` | userId, plan, status, trialEndsAt, updatedAt |
| `friendships` | userId, friendId, status, createdAt |

O perfil e o progresso são ligados ao código único (`id`) do usuário no Supabase.

## Regras de acesso por plano

- Cada lição tem um nível de acesso: `demo`, `basico` ou `pro`.
- A API calcula o acesso pelo plano do aluno e pelo fim do período grátis (`trialEndsAt`).
- **Demo:** só conteúdo iniciante. Depois do fim do período, o usuário vê o progresso e a tela de upgrade.
- **Básico:** SQL e JavaScript até o nível intermediário.
- **Pro:** todo o conteúdo.

## Como rodar

```bash
npm install
cp .env.example .env
npm run dev
```

Preencha o `.env` antes de iniciar. A API sobe em `http://localhost:3333`.

| Script | O que faz |
| --- | --- |
| `npm run dev` | Inicia em modo de desenvolvimento, reiniciando a cada alteração. |
| `npm run build` | Compila o TypeScript para a pasta `dist/`. |
| `npm start` | Executa a versão compilada (produção). |

## Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `PORT` | Porta do servidor (padrão `3333`). |
| `NODE_ENV` | `development`, `production` ou `test`. |
| `CORS_ORIGINS` | Origens permitidas, separadas por vírgula. Inclui o app web e as origens do Capacitor (`capacitor://localhost` no iOS e `https://localhost` no Android). |
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