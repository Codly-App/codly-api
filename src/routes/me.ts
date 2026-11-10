import { Router } from "express";
import { HttpError } from "../errors/HttpError";
import { writeLimiter } from "../middlewares/rateLimit";
import { updateNameSchema } from "../schemas/me.schema";
import { getSummary } from "../services/summary.service";
import { ensureUser, updateUserName } from "../services/users.service";

export const meRouter = Router();

meRouter.get("/me", async (req, res) => {
    const user = req.user;

    if (!user) {
        throw new HttpError(401, "Token não informado.");
    }

    const profile = await ensureUser(user);

    res.json(profile);
});

meRouter.get("/me/summary", async (req, res) => {
    const user = req.user;

    if (!user) {
        throw new HttpError(401, "Token não informado.");
    }

    // Garante que o usuário (e o documento de stats) já existem no primeiro acesso
    await ensureUser(user);

    res.json(await getSummary(user.id));
});

meRouter.patch("/me", writeLimiter, async (req, res) => {
    const user = req.user;

    if (!user) {
        throw new HttpError(401, "Token não informado.");
    }

    const { name } = updateNameSchema.parse(req.body);
    const profile = await updateUserName(user, name);

    res.json(profile);
});