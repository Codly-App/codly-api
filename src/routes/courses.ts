import { Router } from "express";
import { HttpError } from "../errors/HttpError";
import { writeLimiter } from "../middlewares/rateLimit";
import { courseParamSchema } from "../schemas/courses.schema";
import { listCourses, setEnrollment } from "../services/courses.service";

export const coursesRouter = Router();

coursesRouter.get("/courses", async (req, res) => {
    const user = req.user;

    if (!user) {
        throw new HttpError(401, "Token não informado.");
    }

    res.json(await listCourses(user.id));
});

coursesRouter.put("/me/courses/:courseId", writeLimiter, async (req, res) => {
    const user = req.user;

    if (!user) {
        throw new HttpError(401, "Token não informado.");
    }

    const { courseId } = courseParamSchema.parse(req.params);
    await setEnrollment(user.id, courseId, true);

    res.status(204).end();
});

coursesRouter.delete("/me/courses/:courseId", writeLimiter, async (req, res) => {
    const user = req.user;

    if (!user) {
        throw new HttpError(401, "Token não informado.");
    }

    const { courseId } = courseParamSchema.parse(req.params);
    await setEnrollment(user.id, courseId, false);

    res.status(204).end();
});