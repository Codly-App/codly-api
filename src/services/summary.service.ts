import type { Timestamp } from "firebase-admin/firestore";
import { collections } from "../config/collections";
import { db } from "../config/firebase";
import { levels } from "../config/levels";
import { getUserPlan } from "./subscriptions.service";

const DAY_MS = 24 * 60 * 60 * 1000;


const dayFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: levels.timeZone,
});

function dayKey(date: Date) {
    return dayFormatter.format(date);
}


function toDayKey(value: unknown): string | null {
    if (typeof value === "string") return value;

    if (value && typeof (value as Timestamp).toDate === "function") {
        return dayKey((value as Timestamp).toDate());
    }

    return null;
}

function millisOf(value: unknown): number {
    return value && typeof (value as Timestamp).toMillis === "function"
        ? (value as Timestamp).toMillis()
        : 0;
}

export async function getSummary(userId: string) {
    const [plan, statsSnap, userSnap, progressSnap] = await Promise.all([
        getUserPlan(userId),
        db.collection(collections.stats).doc(userId).get(),
        db.collection(collections.users).doc(userId).get(),
        db
            .collection(collections.progress)
            .where("userId", "==", userId)
            .where("enrolled", "==", true)
            .get(),
    ]);

    const stats = statsSnap.data();
    const user = userSnap.data();

    const today = dayKey(new Date());
    const yesterday = dayKey(new Date(Date.now() - DAY_MS));
    const lastStudy = toDayKey(stats?.lastStudyDate);

    // Quem não estudou ontem nem hoje perdeu a sequência
    const streakAlive = lastStudy === today || lastStudy === yesterday;
    const xp = Number(stats?.xp ?? 0);

    const goal = Number(user?.metaDiaria);
    const targetXp = (levels.allowedDailyGoals as readonly number[]).includes(goal)
        ? goal
        : levels.defaultDailyGoalXp;
    const earnedXp =
        toDayKey(stats?.dailyXpDate) === today ? Number(stats?.dailyXp ?? 0) : 0;

    // Curso mexido por último vem primeiro (o app usa o primeiro em "Continuar")
    const progressDocs = [...progressSnap.docs].sort(
        (a, b) => millisOf(b.data().updatedAt) - millisOf(a.data().updatedAt),
    );

    const courseSnaps = progressDocs.length
        ? await db.getAll(
              ...progressDocs.map((doc) =>
                  db.collection(collections.courses).doc(doc.data().courseId),
              ),
          )
        : [];

    const courses = courseSnaps.flatMap((snap, index) => {
        const data = snap.data();

        if (!data || data.published !== true) return [];

        const lessonsTotal: number = data.lessonsTotal ?? 0;
        const lessonsDone = progressDocs[index].data().lessonsDone ?? 0;

        return [
            {
                id: snap.id,
                title: data.title ?? "",
                iconKey: data.iconKey ?? "",
                lessonsTotal,
                lessonsDone: Math.min(lessonsDone, lessonsTotal),
            },
        ];
    });

    return {
        plan,
        stats: {
            xp,
            streak: streakAlive ? Number(stats?.streak ?? 0) : 0,
            level: Math.floor(xp / levels.xpPerLevel) + 1,
            levelXp: xp % levels.xpPerLevel,
            nextLevelXp: levels.xpPerLevel,
        },
        dailyGoal: { earnedXp, targetXp },
        courses,
    };
}