import type { NextFunction, Request, Response } from "express";
import { security } from "../config/security";
import { supabase } from "../config/supabase";
import { HttpError } from "../errors/HttpError";

export async function requireAuth(
    req: Request,
    _res: Response,
    next: NextFunction,
) {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
        throw new HttpError(401, "Token não informado.");
    }

    const token = header.slice("Bearer ".length).trim();

    if (!token || token.length > security.maxTokenLength) {
        throw new HttpError(401, "Token inválido ou expirado.");
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
        throw new HttpError(401, "Token inválido ou expirado.");
    }

    req.user = { id: data.user.id, email: data.user.email };
    next();
}