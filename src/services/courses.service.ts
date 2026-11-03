import { FieldValue } from "firebase-admin/firestore";
import { collections } from "../config/collections";
import { db } from "../config/firebase";
import { type PlanId, plans } from "../config/plans";
import { HttpError } from "../errors/HttpError";
import { getUserPlan, toPlanId } from "./subscriptions.service";

type LockReason = "plan" | "limit";

/** Plano do curso. Se o dado estiver inválido, exige o Pro (nunca libera por engano). */
function requiredPlanOf(value: unknown): PlanId {
    return toPlanId(value) ?? "pro";
}

function isLocked(userPlan: PlanId, requiredPlan: PlanId) {
    return plans.levels[userPlan] < plans.levels[requiredPlan];
}

function lockReasonOf(
    userPlan: PlanId,
    requiredPlan: PlanId,
    enrolled: boolean,
    limitReached: boolean,
): LockReason | null {
    // Quem já tem o curso não vê trava
    if (enrolled) return null;
    if (isLocked(userPlan, requiredPlan)) return "plan";
    if (limitReached) return "limit";

    return null;
}

export async function listCourses(userId: string) {
    const [userPlan, coursesSnap, progressSnap] = await Promise.all([
        getUserPlan(userId),
        db.collection(collections.courses).orderBy("order").get(),
        db.collection(collections.progress).where("userId", "==", userId).get(),
    ]);

    const progressByCourse = new Map(
        progressSnap.docs.map((doc) => [doc.data().courseId as string, doc.data()]),
    );

    const activeCount = progressSnap.docs.filter(
        (doc) => doc.data().enrolled === true,
    ).length;
    const limitReached =
        activeCount >= plans.limits[userPlan].maxActiveCourses;

    return coursesSnap.docs
        .filter((doc) => doc.data().published === true)
        .map((doc) => {
            const data = doc.data();
            const progress = progressByCourse.get(doc.id);
            const lessonsTotal: number = data.lessonsTotal ?? 0;
            const requiredPlan = requiredPlanOf(data.requiredPlan);
            const enrolled = progress?.enrolled === true;

            return {
                id: doc.id,
                title: data.title ?? "",
                description: data.description ?? "",
                iconKey: data.iconKey ?? "",
                lessonsTotal,
                lessonsDone: Math.min(progress?.lessonsDone ?? 0, lessonsTotal),
                enrolled,
                requiredPlan,
                lockReason: lockReasonOf(
                    userPlan,
                    requiredPlan,
                    enrolled,
                    limitReached,
                ),
            };
        });
}

export async function setEnrollment(
    userId: string,
    courseId: string,
    enrolled: boolean,
) {
    const courseSnap = await db
        .collection(collections.courses)
        .doc(courseId)
        .get();
    const course = courseSnap.data();

    if (!course || course.published !== true) {
        throw new HttpError(404, "Curso não encontrado.");
    }

    const userPlan = await getUserPlan(userId);

    // Só adicionar depende do plano. Remover é sempre permitido.
    if (enrolled && isLocked(userPlan, requiredPlanOf(course.requiredPlan))) {
        throw new HttpError(403, "Este curso é exclusivo do plano Pro.");
    }

    const maxActive = plans.limits[userPlan].maxActiveCourses;
    const progressRef = db
        .collection(collections.progress)
        .doc(`${userId}_${courseId}`);
    const activeQuery = db
        .collection(collections.progress)
        .where("userId", "==", userId)
        .where("enrolled", "==", true);

    await db.runTransaction(async (tx) => {
        const snapshot = await tx.get(progressRef);
        const current = snapshot.data();

        if (!enrolled) {
            if (snapshot.exists) {
                // Mantém lessonsDone: o progresso fica salvo
                tx.set(
                    progressRef,
                    { enrolled: false, updatedAt: FieldValue.serverTimestamp() },
                    { merge: true },
                );
            }
            return;
        }

        // Já estava ativo: repetir o pedido não conta no limite
        if (current?.enrolled !== true) {
            const active = await tx.get(activeQuery);

            if (active.size >= maxActive) {
                throw new HttpError(
                    403,
                    `Seu plano permite até ${maxActive} cursos ao mesmo tempo.`,
                );
            }
        }

        tx.set(
            progressRef,
            {
                userId,
                courseId,
                enrolled: true,
                lessonsDone: current?.lessonsDone ?? 0,
                enrolledAt: current?.enrolledAt ?? FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
        );
    });
}