import { Router } from "express";
import { HttpError } from "../errors/HttpError";
import { ensureUser } from "../services/users.service";

export const meRouter = Router();

meRouter.get("/me", async (req, res) => {
    const user = req.user;

    if (!user) {
        throw new HttpError(401, "Token não informado.");
    }

    const profile = await ensureUser(user);

    res.json(profile);
});