import { Router } from "express";
import { HttpError } from "../errors/HttpError";
import { writeLimiter } from "../middlewares/rateLimit";
import { updateNameSchema } from "../schemas/me.schema";
import { getSummary } from "../services/summary.service";
import { ensureUser, updateUserName } from "../services/users.service";
import { updateSettingsSchema } from "../schemas/settings.schema";
import { getSettings, updateSettings } from "../services/settings.service";

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

meRouter.get("/me/settings", async (req, res) => {
    const user = req.user;

    if (!user) {
        throw new HttpError(401, "Token não informado.");
    }

    await ensureUser(user);

    res.json(await getSettings(user.id));
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

meRouter.patch("/me/settings", writeLimiter, async (req, res) => {
    const user = req.user;

    if (!user) {
        throw new HttpError(401, "Token não informado.");
    }

    const patch = updateSettingsSchema.parse(req.body);

    await ensureUser(user);

    res.json(await updateSettings(user.id, patch));
});