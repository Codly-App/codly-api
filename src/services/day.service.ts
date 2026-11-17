import type { Timestamp } from "firebase-admin/firestore";
import { levels } from "../config/levels";

const DAY_MS = 24 * 60 * 60 * 1000;

// "en-CA" formata como aaaa-mm-dd, já no fuso de Brasília
const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: levels.timeZone,
});

export function dayKey(date: Date) {
    return formatter.format(date);
}

export function todayKey() {
    return dayKey(new Date());
}

export function yesterdayKey() {
    return dayKey(new Date(Date.now() - DAY_MS));
}

/** Aceita "aaaa-mm-dd" ou Timestamp do Firestore. */
export function toDayKey(value: unknown): string | null {
    if (typeof value === "string") return value;

    if (value && typeof (value as Timestamp).toDate === "function") {
        return dayKey((value as Timestamp).toDate());
    }

    return null;
}