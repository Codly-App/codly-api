import { z } from "zod";

/** ID de documento do Firestore vindo da URL. Bloqueia "/" e caracteres estranhos. */
export const idParamSchema = z.object({
    id: z
        .string()
        .min(1)
        .max(128)
        .regex(/^[A-Za-z0-9_-]+$/, "ID inválido."),
});