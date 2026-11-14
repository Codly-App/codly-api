import type { DocumentData } from "firebase-admin/firestore";
import { collections } from "../config/collections";
import { db } from "../config/firebase";
import { defaultSettings } from "../config/settings";
import type { UpdateSettingsInput } from "../schemas/settings.schema";

function withDefaults(saved: DocumentData | undefined) {
    return {
        privacy: { ...defaultSettings.privacy, ...saved?.privacy },
        preferences: { ...defaultSettings.preferences, ...saved?.preferences },
        notifications: {
            ...defaultSettings.notifications,
            ...saved?.notifications,
        },
    };
}

export async function getSettings(userId: string) {
    const snapshot = await db.collection(collections.users).doc(userId).get();

    return withDefaults(snapshot.data()?.settings);
}

export async function updateSettings(
    userId: string,
    patch: UpdateSettingsInput,
) {
    // merge: true junta campo a campo, sem apagar o que não veio no pedido
    await db
        .collection(collections.users)
        .doc(userId)
        .set({ settings: patch }, { merge: true });

    return getSettings(userId);
}