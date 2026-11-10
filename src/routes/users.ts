
import { Router } from "express";
import { HttpError } from "../errors/HttpError";
import { searchUsersSchema } from "../schemas/users.schema";
import { searchUsers } from "../services/usersSearch.service";

export const usersRouter = Router();

usersRouter.get("/users/search", async (req, res) => {
    const user = req.user;

    if (!user) {
        throw new HttpError(401, "Token não informado.");
    }

    const { q } = searchUsersSchema.parse(req.query);
    const users = await searchUsers(q, user.id);

    res.json(users);
});
