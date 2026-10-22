import { collections } from "../config/collections";
import { db } from "../config/firebase";

export async function getUserProfile(userId: string) {
    const doc = await db.collection(collections.users).doc(userId).get();
    return doc.exists ? doc.data() : null;
}