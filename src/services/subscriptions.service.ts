import type { Timestamp } from "firebase-admin/firestore";
import { collections } from "../config/collections";
import { db } from "../config/firebase";
import { type PlanId, plans } from "../config/plans";

export function toPlanId(value: unknown): PlanId | null {
    if (typeof value !== "string") return null;

    return Object.hasOwn(plans.levels, value) ? (value as PlanId) : null;
}

/** Plano que vale agora. Teste vencido ou assinatura inativa volta para o padrão. */
export async function getUserPlan(userId: string): Promise<PlanId> {
    const snapshot = await db
        .collection(collections.subscriptions)
        .doc(userId)
        .get();
    const data = snapshot.data();

    const plan = toPlanId(data?.plan) ?? plans.defaultPlan;
    const trialEndsAt: Timestamp | undefined = data?.trialEndsAt;

    const trialActive =
        data?.status === plans.trialStatus &&
        trialEndsAt !== undefined &&
        trialEndsAt.toMillis() > Date.now();
    const paid = data?.status === "active";

    return trialActive || paid ? plan : plans.defaultPlan;
}