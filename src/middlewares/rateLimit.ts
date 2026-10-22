import type { Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { security } from "../config/security";

const base = {
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Muitas requisições. Tente novamente em instantes." },
} as const;

const ipKey = (req: Request) => ipKeyGenerator(req.ip ?? "");
const userKey = (req: Request) => req.user?.id ?? ipKey(req);

/** Por IP, em toda a API. */
export const globalLimiter = rateLimit({
    ...base,
    ...security.rateLimit.global,
    keyGenerator: ipKey,
});

/** Por IP. Conta só as respostas com erro, para frear quem testa tokens. */
export const authFailLimiter = rateLimit({
    ...base,
    ...security.rateLimit.authFailures,
    skipSuccessfulRequests: true,
    keyGenerator: ipKey,
});

/** Por usuário logado. Usar depois do requireAuth. */
export const userLimiter = rateLimit({
    ...base,
    ...security.rateLimit.user,
    keyGenerator: userKey,
});

/** Por usuário. Usar nas rotas POST, PUT, PATCH e DELETE. */
export const writeLimiter = rateLimit({
    ...base,
    ...security.rateLimit.write,
    keyGenerator: userKey,
});