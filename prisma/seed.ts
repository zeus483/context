import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays } from "date-fns";

const prisma = new PrismaClient();

const exercises = [
  ["Press banca", "Pecho", "Barra"],
  ["Press inclinado mancuernas", "Pecho", "Mancuerna"],
  ["Fondos en paralelas", "Tríceps", "Peso corporal"],
  ["Jalón al pecho", "Espalda", "Polea"],
  ["Remo sentado", "Espalda", "Polea"],
  ["Curl bíceps barra", "Bíceps", "Barra"],
  ["Prensa", "Pierna", "Máquina"],
  ["Sentadilla goblet", "Pierna", "Mancuerna"],
  ["Hip thrust", "Glúteo", "Barra"],
  ["Peso muerto rumano", "Femoral", "Barra"],
  ["Elevación lateral", "Hombro", "Mancuerna"],
  ["Plancha", "Core", "Peso corporal"]
];

const dayBlueprint = [
  { dayNumber: 1, title: "Pecho fuerza + tríceps", focus: "Fuerza tren superior", cardio: 20, optional: false, ex: ["Press banca", "Press inclinado mancuernas", "Fondos en paralelas"] },
  { dayNumber: 2, title: "Espalda + bíceps", focus: "Tirón", cardio: 15, optional: false, ex: ["Jalón al pecho", "Remo sentado", "Curl bíceps barra"] },
  { dayNumber: 3, title: "Pierna cuádriceps dominante", focus: "Pierna A", cardio: 20, optional: false, ex: ["Prensa", "Sentadilla goblet", "Plancha"] },
  { dayNumber: 4, title: "Pecho hipertrofia + hombro", focus: "Push volumen", cardio: 20, optional: false, ex: ["Press inclinado mancuernas", "Press banca", "Elevación lateral"] },
  { dayNumber: 5, title: "Espalda + brazos", focus: "Pull volumen", cardio: 15, optional: false, ex: ["Remo sentado", "Jalón al pecho", "Curl bíceps barra"] },
  { dayNumber: 6, title: "Pierna posterior + abs", focus: "Pierna B opcional", cardio: 30, optional: true, ex: ["Peso muerto rumano", "Hip thrust", "Plancha"] }
];

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const user = await prisma.user.upsert({
    where: { email: "demo@transformacion.app" },
    update: { passwordHash },
    create: { email: "demo@transformacion.app", passwordHash }
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      name: "Usuario Demo",
      weightKg: 80,
      heightCm: 175,
      age: 23,
      goal: "Hipertrofia + recomposición",
      trainingDays: 5,
      availableHours: 2,
      beachGoalDate: addDays(new Date(), 56)
    }
  });

  for (const [name, muscleGroup, equipment] of exercises) {
    await prisma.exercise.upsert({
      where: { name_equipment: { name, equipment } },
      update: {},
      create: {
        name,
        muscleGroup,
        equipment,
        imageUrl: `https://placehold.co/640x420/png?text=${encodeURIComponent(name)}`,
        instructions: "1) Ajusta postura. 2) Controla excéntrica. 3) Mantén rango completo.",
        commonMistakes: "Cargar de más y recortar recorrido.",
        tips: "Deja 1-3 reps en reserva para progresar sostenido.",
        alternatives: "Alternativa: versión en máquina o mancuerna equivalente."
      }
    });
  }

  const plan = await prisma.workoutPlan.upsert({
    where: { id: "fase-playa-8-semanas" },
    update: { name: "Fase Playa 8 Semanas" },
    create: {
      id: "fase-playa-8-semanas",
      name: "Fase Playa 8 Semanas",
      description: "Plan flexible 5-6 días con máximo 2 días de tren inferior"
    }
  });

  await prisma.dayExercise.deleteMany({ where: { workoutDay: { workoutPlanId: plan.id } } });
  await prisma.workoutDay.deleteMany({ where: { workoutPlanId: plan.id } });

  for (const day of dayBlueprint) {
    const workoutDay = await prisma.workoutDay.create({
      data: {
        workoutPlanId: plan.id,
        dayNumber: day.dayNumber,
        title: day.title,
        focus: day.focus,
        isOptional: day.optional,
        cardioDefault: day.cardio
      }
    });

    for (const [idx, exerciseName] of day.ex.entries()) {
      const exercise = await prisma.exercise.findFirstOrThrow({ where: { name: exerciseName } });
      await prisma.dayExercise.create({
        data: {
          workoutDayId: workoutDay.id,
          exerciseId: exercise.id,
          order: idx + 1,
          suggestedSets: 4,
          suggestedReps: "6-12",
          suggestedRestSec: 90
        }
      });
    }
  }

  for (let i = 0; i < 6; i++) {
    await prisma.bodyWeightLog.upsert({
      where: { userId_date: { userId: user.id, date: subDays(new Date(), 7 * i) } },
      update: {},
      create: { userId: user.id, date: subDays(new Date(), 7 * i), weightKg: 80 - i * 0.4 }
    });
  }
}

main().finally(() => prisma.$disconnect());
