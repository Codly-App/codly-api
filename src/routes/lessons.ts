import { Router } from "express";
import { HttpError } from "../errors/HttpError";
import { writeLimiter } from "../middlewares/rateLimit";
import { lessonParamSchema } from "../schemas/lessons.schema";
import { completeLesson } from "../services/lessons.service";
import { ensureUser } from "../services/users.service";

export const lessonsRouter = Router();

lessonsRouter.post(
    "/me/courses/:courseId/lessons/:lessonId/complete",
    writeLimiter,
    async (req, res) => {
        const user = req.user;

        if (!user) {
            throw new HttpError(401, "Token não informado.");
        }

        const { courseId, lessonId } = lessonParamSchema.parse(req.params);

        await ensureUser(user);

        res.json(await completeLesson(user.id, courseId, lessonId));
    },
);