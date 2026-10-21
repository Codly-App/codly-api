# Codly API: regras do projeto

API Node.js (Express 5 + TypeScript) da plataforma Codly. Valida o login do Supabase e é a única parte que acessa o Firestore (Firebase Admin). O app (`codly-app`) fica em outro repositório e só conversa com esta API por HTTP. Siga estas regras em toda alteração, sem exceção.

## Arquitetura

- O servidor é a única barreira de segurança confiável. Nunca confie em dados do cliente: valide o token, o plano e o corpo de cada requisição.
- Rotas protegidas usam sempre `requireAuth`. O usuário vem de `req.user`, nunca do corpo da requisição ou de parâmetros.
- O acesso a conteúdo é calculado no servidor pelo plano do aluno (`plan`, `status`, `trialEndsAt`). Níveis de acesso: `demo`, `basico` e `pro`.
- Só esta API acessa o Firestore. Use sempre o `db` de `src/config/firebase.ts`.
- Nunca leia `process.env` fora de `src/config/env.ts`. Todo o resto importa `env`.
- A chave `service_role` do Supabase e a chave do Firebase nunca aparecem em log, resposta ou código.

## Estrutura de pastas

- `src/server.ts`: ponto de entrada, só sobe o servidor.
- `src/app.ts`: monta o Express (segurança, CORS, JSON, rotas, erros).
- `src/config/`: ambiente e clientes externos (`env`, `firebase`, `supabase`).
- `src/middlewares/`: autenticação, controle de acesso e tratamento de erros.
- `src/routes/`: só HTTP. Lê a requisição, chama um serviço e devolve a resposta. Sem regra de negócio.
- `src/services/`: regras de negócio e acesso ao Firestore (XP, progresso, planos, amigos).
- `src/schemas/`: schemas do Zod para validar o que chega nas rotas.
- `src/types/`: tipos globais e extensões do Express.

## Um arquivo, uma responsabilidade

- Um router por arquivo (`courses.ts`, `progress.ts`, `friends.ts`), registrado em `routes/index.ts`.
- Um serviço por arquivo e por assunto (`progress.service.ts`, `xp.service.ts`). Se um arquivo passar de cerca de 100 linhas, divida.
- Rotas finas: nada de consulta ao Firestore nem cálculo dentro da rota. Isso vai para `services/`.
- Priorize funções reutilizáveis. Antes de escrever lógica nova, procure em `services/` e `middlewares/` se já existe algo parecido (por exemplo, o cálculo de acesso por plano é único e usado por todas as rotas).
- Nomes de coleções do Firestore ficam em um só lugar (`src/config/collections.ts`), nunca como texto solto nas rotas.

## Rotas e respostas

- Valide sempre o corpo, os parâmetros e a query com Zod (`safeParse`). Entrada inválida responde `400` com uma mensagem clara.
- Todas as respostas de erro seguem o formato `{ "message": "texto amigável" }`.
- Códigos: `400` dado inválido, `401` sem token ou token inválido, `403` plano sem acesso, `404` não encontrado, `500` erro interno.
- Handlers `async` sem `try/catch` desnecessário: o Express 5 envia o erro ao `errorHandler`. Use `try/catch` só quando precisar tratar o erro na própria rota.
- Mensagens ao usuário em português do Brasil. Nomes de código (arquivos, variáveis, funções) em inglês.
- Nunca devolva dados de outro usuário. Toda leitura e gravação de dados pessoais filtra pelo `req.user.id`.

## Código

- TypeScript estrito. Sem `any`, sem `@ts-ignore`.
- CommonJS: imports sem extensão (`"./app"`, não `"./app.js"`). Não adicione `"type": "module"`.
- Prefira exportação nomeada (`export function`, `export const`). Sem `export default`.
- Indentação de 4 espaços, igual ao `codly-app`.
- Logs de erro com `console.error` contendo método e rota, sem dados sensíveis (token, e-mail completo, chaves).
- Não instale bibliotecas novas sem avisar e justificar.
- Atualize o `README.md` ao criar uma rota nova (tabela de rotas) ou uma coleção nova.