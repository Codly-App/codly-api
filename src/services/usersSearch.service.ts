import { collections } from "../config/collections";
import { db } from "../config/firebase";

interface PublicUser {
    uid: string;
    name: string;
    avatarUrl: string | null;
}

export async function searchUsers(query: string, currentUid: string): Promise<PublicUser[]> {
    const term = query.trim();

    const [uidDoc, nameDocs] = await Promise.all([
        db.collection(collections.users).doc(term).get(),
        db.collection(collections.users)
            .orderBy("nome")
            .startAt(term)
            .endAt(`${term}\uf8ff`)
            .limit(20)
            .get(),
    ]);

    const results = new Map<string, PublicUser>();

    function addUser(uid: string, data: FirebaseFirestore.DocumentData) {
        if (uid === currentUid) return;

        results.set(uid, {
            uid,
            name: data.nome ?? "",
            avatarUrl: data.avatar ?? null,
        });
    }

    if (uidDoc.exists) addUser(uidDoc.id, uidDoc.data() ?? {});

    for (const doc of nameDocs.docs) {
        addUser(doc.id, doc.data());
    }

    return [...results.values()].slice(0, 20);
}
