import {
    type DocumentData,
    FieldValue,
    type Timestamp,
    Timestamp as FirestoreTimestamp,
} from "firebase-admin/firestore";
import { collections } from "../config/collections";
import { db } from "../config/firebase";
import { plans } from "../config/plans";
import { firebaseAuth } from "../config/firebase";
import { supabase } from "../config/supabase";
import { HttpError } from "../errors/HttpError";
import { syncSupabaseUser } from "./supabaseUsers.service";

type AuthUser = NonNullable<Express.Request["user"]>;

const DAY_MS = 24 * 60 * 60 * 1000;
// Atualiza o último login no Supabase no máximo uma vez por hora
const SYNC_INTERVAL_MS = 60 * 60 * 1000;

function toProfile(userId: string, data: DocumentData) {
    return {
        id: userId,
        name: data.nome ?? data.name ?? "",
        email: data.email ?? "",
        photoURL: data.avatar ?? "",
        tema: data.tema ?? "system",
        metaDiaria: data.metaDiaria ?? 1,
    };
}

function needsSync(current: DocumentData | undefined) {
    const lastSyncAt: Timestamp | undefined = current?.lastSyncAt;

    if (!current?.supabaseUserId || !lastSyncAt) return true;

    return Date.now() - lastSyncAt.toMillis() > SYNC_INTERVAL_MS;
}

export async function ensureUser(authUser: AuthUser) {
    const userRef = db.collection(collections.users).doc(authUser.id);
    const statsRef = db.collection(collections.stats).doc(authUser.id);
    const subscriptionRef = db
        .collection(collections.subscriptions)
        .doc(authUser.id);

    const current = (await userRef.get()).data();

    if (!needsSync(current)) {
        return toProfile(authUser.id, current ?? {});
    }

    if (!authUser.email) {
        throw new HttpError(400, "Sua conta não tem e-mail cadastrado.");
    }

    const supabaseUserId = await syncSupabaseUser({
        uid: authUser.id,
        email: authUser.email,
        emailVerified: authUser.emailVerified,
        name: authUser.name,
        picture: authUser.picture,
    });

    await db.runTransaction(async (tx) => {
        const [userDoc, statsDoc, subscriptionDoc] = await Promise.all([
            tx.get(userRef),
            tx.get(statsRef),
            tx.get(subscriptionRef),
        ]);

        // Campos que só entram na criação (não sobrescrevem o que o usuário mudou)
        const onlyOnCreate = userDoc.exists
            ? {}
            : {
                  nome: authUser.name ?? "",
                  avatar: authUser.picture ?? "",
                  tema: "system",
                  metaDiaria: 1,
                  createdAt: FieldValue.serverTimestamp(),
              };

        tx.set(
            userRef,
            {
                ...onlyOnCreate,
                userId: authUser.id,
                supabaseUserId,
                email: authUser.email,
                lastSyncAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
        );

        if (!statsDoc.exists) {
            tx.set(statsRef, {
                userId: authUser.id,
                xp: 0,
                streak: 0,
                lastStudyDate: null,
                totalLessons: 0,
            });
        }

        if (!subscriptionDoc.exists) {
            tx.set(subscriptionRef, {
                userId: authUser.id,
                plan: plans.defaultPlan,
                status: plans.trialStatus,
                trialEndsAt: FirestoreTimestamp.fromMillis(
                    Date.now() + plans.trialDays * DAY_MS,
                ),
                updatedAt: FieldValue.serverTimestamp(),
            });
        }
    });

    const saved = await userRef.get();

    return toProfile(authUser.id, saved.data() ?? {});
}
export async function updateUserName(authUser: AuthUser, name: string) {
    // Garante que o usuário já existe nas três bases antes de alterar
    await ensureUser(authUser);

    const userRef = db.collection(collections.users).doc(authUser.id);

    // Guarda os valores atuais para poder desfazer se algo falhar
    const [userDoc, supabaseRow] = await Promise.all([
        userRef.get(),
        supabase
            .from("users")
            .select("name")
            .eq("firebase_uid", authUser.id)
            .single(),
    ]);

    if (supabaseRow.error) throw supabaseRow.error;

    const before = userDoc.data();
    const undo: Array<() => PromiseLike<unknown>> = [];

    try {
        const updated = await supabase
            .from("users")
            .update({ name })
            .eq("firebase_uid", authUser.id)
            .select("id")
            .single();

        if (updated.error) throw updated.error;

        undo.push(() =>
            supabase
                .from("users")
                .update({ name: supabaseRow.data.name })
                .eq("firebase_uid", authUser.id),
        );

        // "nome" é o campo da API; "name" é o que a Home do app lê hoje
        await userRef.set({ nome: name, name }, { merge: true });

        undo.push(() =>
            userRef.set(
                { nome: before?.nome ?? "", name: before?.name ?? "" },
                { merge: true },
            ),
        );

        await firebaseAuth.updateUser(authUser.id, { displayName: name });
    } catch (error) {
        // Se qualquer passo falhar, volta os anteriores para os bancos não divergirem
        await Promise.allSettled(undo.map((fn) => fn()));
        throw error;
    }

    const saved = await userRef.get();

    return toProfile(authUser.id, saved.data() ?? {});
}