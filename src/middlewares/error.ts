import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../errors/HttpError";

export function notFound(_req: Request, res: Response) {
    res.status(404).json({ message: "Rota não encontrada." });
}

export function errorHandler(
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction,
) {
    if (err instanceof HttpError) {
        return res.status(err.status).json({ message: err.message });
    }

    if (err instanceof ZodError) {
        return res.status(400).json({
            message: "Dados inválidos.",
            issues: err.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }

    const parserError = err as { type?: string };

    if (parserError.type === "entity.too.large") {
        return res.status(413).json({ message: "Requisição grande demais." });
    }

    if (parserError.type === "entity.parse.failed") {
        return res.status(400).json({ message: "JSON inválido." });
    }

    console.error(`[erro] ${req.method} ${req.path}`, err);
    res.status(500).json({ message: "Erro interno. Tente novamente." });
}