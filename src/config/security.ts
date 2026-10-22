export const security = {
    bodyLimit: "10kb",
    maxTokenLength: 4096,
    requestTimeoutMs: 30_000,
    rateLimit: {
        // por IP, em todas as rotas
        global: { windowMs: 15 * 60 * 1000, limit: 300 },
        // por IP, conta só as tentativas de login que falharam
        authFailures: { windowMs: 15 * 60 * 1000, limit: 20 },
        // por usuário logado, em todas as rotas protegidas
        user: { windowMs: 60 * 1000, limit: 120 },
        // por usuário, em rotas que gravam dados
        write: { windowMs: 60 * 1000, limit: 30 },
    },
} as const;