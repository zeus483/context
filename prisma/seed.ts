import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

const PROFILE_GOAL = "Hipertrofia + recomposición";
const PLAN_NAME = "Fase Playa 8 Semanas";

const dayBlueprint = [
  {
    dayNumber: 1,
    title: "Pecho fuerza + tríceps",
    focus: "Fuerza de empuje",
    cardio: 20,
    optional: false,
    exercises: [
      { name: "Press banca", group: "Pecho", equipment: "Barra", reps: "4-6", rest: 150, sets: 4 },
      { name: "Press inclinado mancuernas", group: "Pecho", equipment: "Mancuerna", reps: "8-10", rest: 120, sets: 4 },
      { name: "Fondos en paralelas", group: "Tríceps", equipment: "Peso corporal", reps: "8-12", rest: 90, sets: 3 },
      { name: "Extensión tríceps polea", group: "Tríceps", equipment: "Polea", reps: "10-15", rest: 75, sets: 3 }
    ]
  },
  {
    dayNumber: 2,
    title: "Espalda + bíceps",
    focus: "Tirón vertical y horizontal",
    cardio: 15,
    optional: false,
    exercises: [
      { name: "Jalón al pecho", group: "Espalda", equipment: "Polea", reps: "8-12", rest: 120, sets: 4 },
      { name: "Remo sentado", group: "Espalda", equipment: "Polea", reps: "8-12", rest: 120, sets: 4 },
      { name: "Remo mancuerna unilateral", group: "Espalda", equipment: "Mancuerna", reps: "10-12", rest: 90, sets: 3 },
      { name: "Curl bíceps barra", group: "Bíceps", equipment: "Barra", reps: "8-12", rest: 75, sets: 3 }
    ]
  },
  {
    dayNumber: 3,
    title: "Pierna cuádriceps dominante",
    focus: "Tren inferior A",
    cardio: 20,
    optional: false,
    exercises: [
      { name: "Prensa", group: "Pierna", equipment: "Máquina", reps: "8-12", rest: 150, sets: 4 },
      { name: "Sentadilla goblet", group: "Pierna", equipment: "Mancuerna", reps: "10-12", rest: 120, sets: 3 },
      { name: "Extensión de cuádriceps", group: "Pierna", equipment: "Máquina", reps: "12-15", rest: 75, sets: 3 },
      { name: "Elevación de gemelos", group: "Pantorrilla", equipment: "Máquina", reps: "12-20", rest: 60, sets: 4 }
    ]
  },
  {
    dayNumber: 4,
    title: "Pecho hipertrofia + hombro",
    focus: "Volumen de empuje",
    cardio: 20,
    optional: false,
    exercises: [
      { name: "Press inclinado mancuernas", group: "Pecho", equipment: "Mancuerna", reps: "8-12", rest: 120, sets: 4 },
      { name: "Aperturas en polea", group: "Pecho", equipment: "Polea", reps: "12-15", rest: 75, sets: 3 },
      { name: "Press militar sentado", group: "Hombro", equipment: "Mancuerna", reps: "8-12", rest: 120, sets: 3 },
      { name: "Elevación lateral", group: "Hombro", equipment: "Mancuerna", reps: "12-20", rest: 60, sets: 4 }
    ]
  },
  {
    dayNumber: 5,
    title: "Espalda + brazos",
    focus: "Volumen de tirón",
    cardio: 15,
    optional: false,
    exercises: [
      { name: "Remo pecho apoyado", group: "Espalda", equipment: "Mancuerna", reps: "8-12", rest: 120, sets: 4 },
      { name: "Jalón agarre neutro", group: "Espalda", equipment: "Polea", reps: "10-12", rest: 90, sets: 3 },
      { name: "Curl inclinado", group: "Bíceps", equipment: "Mancuerna", reps: "10-12", rest: 75, sets: 3 },
      { name: "Extensión tríceps overhead", group: "Tríceps", equipment: "Polea", reps: "10-15", rest: 75, sets: 3 }
    ]
  },
  {
    dayNumber: 6,
    title: "Pierna posterior + abs",
    focus: "Tren inferior B (opcional)",
    cardio: 25,
    optional: true,
    exercises: [
      { name: "Peso muerto rumano", group: "Femoral", equipment: "Barra", reps: "6-10", rest: 150, sets: 4 },
      { name: "Hip thrust", group: "Glúteo", equipment: "Barra", reps: "8-12", rest: 120, sets: 4 },
      { name: "Curl femoral", group: "Femoral", equipment: "Máquina", reps: "10-15", rest: 90, sets: 3 },
      { name: "Plancha", group: "Core", equipment: "Peso corporal", reps: "30-60s", rest: 60, sets: 3 }
    ]
  }
] as const;

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

function validateLowerBodyRule() {
  const lowerKeywords = ["pierna", "femoral", "glúteo", "tren inferior"];
  const lowerDays = dayBlueprint.filter((day) => {
    const focus = day.focus.toLowerCase();
    const title = day.title.toLowerCase();
    return lowerKeywords.some((word) => focus.includes(word) || title.includes(word));
  });

  if (lowerDays.length > 2) {
    throw new Error(`La rutina base excede 2 días de tren inferior (${lowerDays.length}).`);
  }
}

function dayKeyOffset(offsetDays: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

async function seedExercises() {
  const uniqueExercises = new Map<string, { name: string; muscleGroup: string; equipment: string }>();

  for (const day of dayBlueprint) {
    for (const exercise of day.exercises) {
      const key = `${exercise.name}|${exercise.equipment}`;
      if (!uniqueExercises.has(key)) {
        uniqueExercises.set(key, {
          name: exercise.name,
          muscleGroup: exercise.group,
          equipment: exercise.equipment
        });
      }
    }
  }

  for (const exercise of uniqueExercises.values()) {
    await prisma.exercise.upsert({
      where: { name_equipment: { name: exercise.name, equipment: exercise.equipment } },
      update: {
        muscleGroup: exercise.muscleGroup
      },
      create: {
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
        imageUrl: `https://placehold.co/800x520/png?text=${encodeURIComponent(exercise.name)}`,
        instructions: "1) Ajusta la máquina o postura. 2) Controla la fase excéntrica. 3) Mantén rango completo.",
        commonMistakes: "Cargar demasiado y perder control técnico.",
        tips: "Trabaja a 1-3 RIR en la mayoría de sets para progresión sostenible.",
        alternatives: "Alternativa: versión en máquina, polea o mancuerna equivalente según disponibilidad."
      }
    });
  }
}

async function seedPlan() {
  const plan = await prisma.workoutPlan.upsert({
    where: { name: PLAN_NAME },
    update: {
      description: "Plan flexible 5-6 días, cardio final y foco en recomposición para 8 semanas.",
      isActive: true
    },
    create: {
      name: PLAN_NAME,
      description: "Plan flexible 5-6 días, cardio final y foco en recomposición para 8 semanas.",
      isActive: true
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

    for (const [idx, exercise] of day.exercises.entries()) {
      const dbExercise = await prisma.exercise.findUniqueOrThrow({
        where: { name_equipment: { name: exercise.name, equipment: exercise.equipment } }
      });

      await prisma.dayExercise.create({
        data: {
          workoutDayId: workoutDay.id,
          exerciseId: dbExercise.id,
          order: idx + 1,
          suggestedSets: exercise.sets,
          suggestedReps: exercise.reps,
          suggestedRestSec: exercise.rest
        }
      });
    }
  }

  return plan;
}

async function seedUser(planId: string) {
  const user = await prisma.user.upsert({
    where: { email: "demo@transformacion.app" },
    update: {},
    create: {
      email: "demo@transformacion.app",
      passwordHash: hashPassword("demo1234")
    }
  });

  if (!user.passwordHash.includes(":")) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword("demo1234") }
    });
  }

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      goal: PROFILE_GOAL,
      trainingDays: 5,
      availableHours: 2,
      beachGoalDate: dayKeyOffset(56)
    },
    create: {
      userId: user.id,
      name: "Usuario Demo",
      weightKg: 80,
      heightCm: 175,
      age: 23,
      goal: PROFILE_GOAL,
      trainingDays: 5,
      availableHours: 2,
      beachGoalDate: dayKeyOffset(56)
    }
  });

  for (let i = 0; i < 8; i += 1) {
    const date = dayKeyOffset(-i * 7);
    await prisma.bodyWeightLog.upsert({
      where: { userId_date: { userId: user.id, date } },
      update: { weightKg: 80 - i * 0.35 },
      create: { userId: user.id, date, weightKg: 80 - i * 0.35 }
    });
  }

  const firstDay = await prisma.workoutDay.findFirstOrThrow({
    where: { workoutPlanId: planId, dayNumber: 1 }
  });

  const sessionDate = dayKeyOffset(-1);
  const existing = await prisma.workoutSession.findFirst({
    where: { userId: user.id, workoutDayId: firstDay.id, date: sessionDate }
  });

  if (!existing) {
    const session = await prisma.workoutSession.create({
      data: {
        userId: user.id,
        workoutDayId: firstDay.id,
        date: sessionDate,
        status: "DONE",
        notes: "Sesión seed de referencia"
      }
    });

    const dayExercises = await prisma.dayExercise.findMany({
      where: { workoutDayId: firstDay.id },
      orderBy: { order: "asc" }
    });

    await prisma.exerciseSet.createMany({
      data: dayExercises.flatMap((entry) =>
        Array.from({ length: entry.suggestedSets }).map((_, idx) => ({
          workoutSessionId: session.id,
          exerciseId: entry.exerciseId,
          setNumber: idx + 1,
          weightKg: 40 + entry.order * 5 + idx,
          reps: 8,
          rir: 2,
          notes: null,
          completed: true
        }))
      )
    });

    await prisma.cardioEntry.create({
      data: {
        workoutSessionId: session.id,
        cardioType: "Caminata inclinada",
        minutes: 15,
        intensity: "MEDIUM"
      }
    });
  }

  return user;
}

async function main() {
  validateLowerBodyRule();
  await seedExercises();
  const plan = await seedPlan();
  await seedUser(plan.id);
  console.log("Seed completado");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
