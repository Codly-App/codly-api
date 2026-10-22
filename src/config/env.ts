import "dotenv/config";
import { z } from "zod";

const schema = z.object({
    PORT: z.coerce.number().default(3333),
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    CORS_ORIGINS: z.string().default(""),
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    FIREBASE_PROJECT_ID: z.string().min(1),
    FIREBASE_CLIENT_EMAIL: z.string().min(1),
    FIREBASE_PRIVATE_KEY: z.string().min(1),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
    console.error(
        "Variáveis de ambiente inválidas:",
        parsed.error.flatten().fieldErrors,
    );
    process.exit(1);
}

export const env = {
    ...parsed.data,
    CORS_ORIGINS: parsed.data.CORS_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
};

if (env.NODE_ENV === "production" && env.CORS_ORIGINS.length === 0) {
    console.error("Em produção, CORS_ORIGINS é obrigatório.");
    process.exit(1);
}