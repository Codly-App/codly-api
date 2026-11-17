import { collections } from "../src/config/collections";
import { db } from "../src/config/firebase";

const COURSE_ID = "sql-basico";
const LESSON_XP = 10;
const CHALLENGE_XP = 25;
// Mesmos ids da trilha do app (data/sql-trail.ts)
const UNITS = ["banco", "select", "where", "ordem", "agregacao", "join"];

const lessons = UNITS.flatMap((unit) => [
    ...[1, 2, 3].map((number) => ({
        lessonId: `${unit}-${number}`,
        kind: "lesson",
        xp: LESSON_XP,
    })),
    { lessonId: `${unit}-desafio`, kind: "challenge", xp: CHALLENGE_XP },
]).map((item, index) => ({
    ...item,
    courseId: COURSE_ID,
    order: index + 1,
}));

async function main() {
    const batch = db.batch();

    for (const lesson of lessons) {
        batch.set(
            db
                .collection(collections.lessons)
                .doc(`${COURSE_ID}_${lesson.lessonId}`),
            { ...lesson, published: true },
            { merge: true },
        );
    }

    await batch.commit();
    console.log(`${lessons.length} lições gravadas.`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });