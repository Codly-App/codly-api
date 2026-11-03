import { z } from "zod";

/** ID do curso vindo da URL. Bloqueia "/" e caracteres estranhos. */
export const courseParamSchema = z.object({
    courseId: z
        .string()
        .min(1)
        .max(128)
        .regex(/^[A-Za-z0-9_-]+$/, "ID inválido."),
});