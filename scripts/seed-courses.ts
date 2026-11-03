import { collections } from "../src/config/collections";
import { db } from "../src/config/firebase";

const courses = [
    {
        id: "sql-basico",
        title: "SQL do zero",
        description: "Consultas, filtros e junções para ler qualquer banco de dados.",
        iconKey: "sql",
        lessonsTotal: 24,
        requiredPlan: "free",
        order: 1,
    },
    {
        id: "js-basico",
        title: "JavaScript do zero",
        description: "Variáveis, funções e lógica para começar a programar.",
        iconKey: "javascript",
        lessonsTotal: 30,
        requiredPlan: "free",
        order: 2,
    },
    {
        id: "sql-avancado",
        title: "SQL avançado",
        description: "Subconsultas, índices e otimização de consultas.",
        iconKey: "sql",
        lessonsTotal: 20,
        requiredPlan: "pro",
        order: 3,
    },
    {
        id: "js-avancado",
        title: "JavaScript avançado",
        description: "Assincronismo, módulos e projetos completos.",
        iconKey: "javascript",
        lessonsTotal: 28,
        requiredPlan: "pro",
        order: 4,
    },
];

async function main() {
    const batch = db.batch();

    for (const { id, ...data } of courses) {
        batch.set(
            db.collection(collections.courses).doc(id),
            { ...data, published: true },
            { merge: true },
        );
    }

    await batch.commit();
    console.log(`${courses.length} cursos gravados.`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });