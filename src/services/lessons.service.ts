import { FieldValue } from "firebase-admin/firestore";
import { collections } from "../config/collections";
import { db } from "../config/firebase";
import { HttpError } from "../errors/HttpError";
import { isLocked, requiredPlanOf } from "./courses.service";
import { toDayKey, todayKey, yesterdayKey } from "./day.service";
import { getUserPlan } from "./subscriptions.service";

export async function completeLesson(
    userId: string,
    courseId: string,
    lessonId: string,
) {
    const [lessonSnap, courseSnap, userPlan] = await Promise.all([
        db
            .collection(collections.lessons)
            .doc(`${courseId}_${lessonId}`)
            .get(),
        db.collection(collections.courses).doc(courseId).get(),
        getUserPlan(userId),
    ]);

    const lesson = lessonSnap.data();
    const course = courseSnap.data();

    if (
        !lesson ||
        lesson.published !== true ||
        !course ||
        course.published !== true
    ) {
        throw new HttpError(404, "Lição não encontrada.");
    }

    if (isLocked(userPlan, requiredPlanOf(course.requiredPlan))) {
        throw new HttpError(403, "Este curso é exclusivo do plano Pro.");
    }

    const order = Number(lesson.order);
    const xp = Number(lesson.xp ?? 0);
    const progressRef = db
        .collection(collections.progress)
        .doc(`${userId}_${courseId}`);
    const statsRef = db.collection(collections.stats).doc(userId);

    return db.runTransaction(async (tx) => {
        const [progressSnap, statsSnap] = await Promise.all([
            tx.get(progressRef),
            tx.get(statsRef),
        ]);
        const progress = progressSnap.data();

        if (progress?.enrolled !== true) {
            throw new HttpError(
                403,
                "Adicione o curso antes de fazer as lições.",
            );
        }

        const done = Number(progress.lessonsDone ?? 0);

        // Lição que o aluno já fez: não paga XP de novo
        if (order <= done) {
            return { xpEarned: 0, alreadyDone: true, lessonsDone: done };
        }

        if (order > done + 1) {
            throw new HttpError(403, "Conclua a lição anterior primeiro.");
        }

        const stats = statsSnap.data() ?? {};
        const today = todayKey();
        const last = toDayKey(stats.lastStudyDate);

        let streak = Number(stats.streak ?? 0);

        if (last !== today) {
            streak = last === yesterdayKey() ? streak + 1 : 1;
        }

        const dailyXp =
            toDayKey(stats.dailyXpDate) === today
                ? Number(stats.dailyXp ?? 0)
                : 0;

        tx.set(
            progressRef,
            { lessonsDone: order, updatedAt: FieldValue.serverTimestamp() },
            { merge: true },
        );
        tx.set(
            statsRef,
            {
                xp: FieldValue.increment(xp),
                totalLessons: FieldValue.increment(1),
                streak: Math.max(streak, 1),
                lastStudyDate: today,
                dailyXp: dailyXp + xp,
                dailyXpDate: today,
            },
            { merge: true },
        );

        return { xpEarned: xp, alreadyDone: false, lessonsDone: order };
    });
}