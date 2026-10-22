import { Router } from "express";
import { HttpError } from "../errors/HttpError";
import { getUserProfile } from "../services/users.service";

export const meRouter = Router();

meRouter.get("/me", async (req, res) => {
    const user = req.user;

    if (!user) {
        throw new HttpError(401, "Token não informado.");
    }

    const profile = await getUserProfile(user.id);

    res.json({ id: user.id, email: user.email, profile });
});