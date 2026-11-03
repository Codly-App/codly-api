export const plans = {
    trialDays: 7,
    defaultPlan: "free",
    trialStatus: "trialing",
    levels: { free: 1, pro: 2 },
    limits: {
        free: { maxActiveCourses: 2 },
        pro: { maxActiveCourses: Number.POSITIVE_INFINITY },
    },
} as const;

export type PlanId = keyof typeof plans.levels;