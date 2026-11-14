import { z } from "zod";
import { levels } from "../config/levels";

const dailyGoal = z
    .number()
    .refine((value) =>
        (levels.allowedDailyGoals as readonly number[]).includes(value),
    );

export const updateSettingsSchema = z
    .object({
        privacy: z
            .object({
                showOnlineStatus: z.boolean(),
                showCurrentCourse: z.boolean(),
                showInRanking: z.boolean(),
                showStreak: z.boolean(),
                allowFriendRequests: z.boolean(),
            })
            .partial()
            .strict(),
        preferences: z
            .object({
                dailyGoalXp: dailyGoal,
                soundEffects: z.boolean(),
                reduceMotion: z.boolean(),
            })
            .partial()
            .strict(),
        notifications: z
            .object({
                dailyReminder: z.boolean(),
                achievements: z.boolean(),
                friendActivity: z.boolean(),
            })
            .partial()
            .strict(),
    })
    .partial()
    .strict();

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;