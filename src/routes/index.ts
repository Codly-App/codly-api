import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { authFailLimiter, userLimiter } from "../middlewares/rateLimit";
import { healthRouter } from "./health";
import { meRouter } from "./me";

export const routes = Router();

// Rotas públicas (só o limite global por IP)
routes.use(healthRouter);

// A partir daqui, tudo exige token válido
routes.use(authFailLimiter, requireAuth, userLimiter);

routes.use(meRouter);