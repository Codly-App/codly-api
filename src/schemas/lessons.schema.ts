import { z } from "zod";
import { courseParamSchema } from "./courses.schema";

/** IDs vindos da URL. Só aceitam letras, números, _ e -. */
export const lessonParamSchema = courseParamSchema.extend({
    lessonId: z
        .string()
        .min(1)
        .max(128)
        .regex(/^[A-Za-z0-9_-]+$/, "ID inválido."),
});