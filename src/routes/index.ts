import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { authFailLimiter, userLimiter } from "../middlewares/rateLimit";
import { coursesRouter } from "./courses";
import { healthRouter } from "./health";
import { meRouter } from "./me";
import { usersRouter } from "./users";

export const routes = Router();

// Rotas públicas
routes.use(healthRouter);

// Rotas protegidas pelo Firebase Authentication
routes.use(authFailLimiter, requireAuth, userLimiter);

routes.use(meRouter);
routes.use(coursesRouter);
routes.use(usersRouter);