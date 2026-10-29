import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { security } from "./config/security";
import { HttpError } from "./errors/HttpError";
import { errorHandler, notFound } from "./middlewares/error";
import { globalLimiter } from "./middlewares/rateLimit";
import { requestLogger } from "./middlewares/requestLogger";
import { routes } from "./routes";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY);

app.use(requestLogger);
app.use(helmet());
app.use(
    cors({
        origin: (origin, callback) => {
            // Sem origin: chamadas que não vêm de navegador (testes, servidor)
            if (!origin || env.CORS_ORIGINS.includes(origin)) {
                return callback(null, true);
            }
            callback(new HttpError(403, "Origem não permitida."));
        },
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        maxAge: 600,
    }),
);
app.use(globalLimiter);

// Respostas da API nunca ficam em cache
app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
});

app.use(express.json({ limit: security.bodyLimit }));

app.use(routes);

app.use(notFound);
app.use(errorHandler);

export default app;