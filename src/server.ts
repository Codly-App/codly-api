import { app } from "./app";
import { env } from "./config/env";
import { security } from "./config/security";

const server = app.listen(env.PORT, () => {
    console.log(`Codly API rodando na porta ${env.PORT}`);
});

server.requestTimeout = security.requestTimeoutMs;
server.headersTimeout = security.requestTimeoutMs - 5_000;

function shutdown(signal: string) {
    console.log(`${signal} recebido. Encerrando...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection]", reason);
});