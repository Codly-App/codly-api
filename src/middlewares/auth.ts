import type { NextFunction, Request, Response } from "express";
import { firebaseAuth } from "../config/firebase";
import { security } from "../config/security";
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

    try {
        const decoded = await firebaseAuth.verifyIdToken(token);

        req.user = {
            id: decoded.uid,
            email: decoded.email,
            emailVerified: decoded.email_verified ?? false,
            name: decoded.name,
            picture: decoded.picture,
        };
    } catch {
        throw new HttpError(401, "Token inválido ou expirado.");
    }

    next();
}