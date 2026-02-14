import { BasePlanKind, PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

const PROFILE_GOAL = "Hipertrofia + recomposición";
const BEACH_PLAN_NAME = "Fase Playa 8 Semanas";
const NORMAL_PLAN_NAME = "Rutina Normal (Anual)";

type ExerciseBlueprint = {
  name: string;
  group: string;
  equipment: string;
  reps: string;
  rest: number;
  sets: number;
};

type DayBlueprint = {
  dayNumber: number;
  title: string;
  focus: string;
  cardio: number;
  optional: boolean;
  exercises: ExerciseBlueprint[];
};

type PlanBlueprint = {
  name: string;
  code: string;
  kind: BasePlanKind;
  description: string;
  days: DayBlueprint[];
};

const beachDays: DayBlueprint[] = [
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
];

const normalDays: DayBlueprint[] = [
  {
    dayNumber: 1,
    title: "Pecho fuerza + tríceps",
    focus: "Compuestos de empuje",
    cardio: 20,
    optional: false,
    exercises: [
      { name: "Press banca barra", group: "Pecho", equipment: "Barra", reps: "6-8", rest: 120, sets: 4 },
      { name: "Press inclinado mancuernas", group: "Pecho", equipment: "Mancuerna", reps: "8-10", rest: 110, sets: 4 },
      { name: "Fondos lastrados o asistidos", group: "Tríceps", equipment: "Peso corporal", reps: "8-12", rest: 90, sets: 3 },
      { name: "Aperturas polea", group: "Pecho", equipment: "Polea", reps: "12-15", rest: 75, sets: 3 },
      { name: "Extensión tríceps cuerda", group: "Tríceps", equipment: "Polea", reps: "10-12", rest: 75, sets: 3 },
      { name: "Press francés", group: "Tríceps", equipment: "Barra", reps: "8-10", rest: 90, sets: 3 }
    ]
  },
  {
    dayNumber: 2,
    title: "Espalda + bíceps",
    focus: "Tirón completo",
    cardio: 15,
    optional: false,
    exercises: [
      { name: "Dominadas", group: "Espalda", equipment: "Peso corporal", reps: "6-8", rest: 120, sets: 4 },
      { name: "Remo barra", group: "Espalda", equipment: "Barra", reps: "8-10", rest: 120, sets: 4 },
      { name: "Jalón al pecho", group: "Espalda", equipment: "Polea", reps: "10-12", rest: 90, sets: 3 },
      { name: "Remo en polea", group: "Espalda", equipment: "Polea", reps: "12", rest: 90, sets: 3 },
      { name: "Curl barra", group: "Bíceps", equipment: "Barra", reps: "8-10", rest: 75, sets: 3 },
      { name: "Curl inclinado", group: "Bíceps", equipment: "Mancuerna", reps: "10-12", rest: 75, sets: 3 }
    ]
  },
  {
    dayNumber: 3,
    title: "Pierna completa (cuádriceps dominante)",
    focus: "Tren inferior A",
    cardio: 20,
    optional: false,
    exercises: [
      { name: "Sentadilla libre", group: "Pierna", equipment: "Barra", reps: "6-8", rest: 120, sets: 4 },
      { name: "Prensa", group: "Pierna", equipment: "Máquina", reps: "10", rest: 110, sets: 4 },
      { name: "Extensión pierna", group: "Pierna", equipment: "Máquina", reps: "12-15", rest: 75, sets: 3 },
      { name: "Curl femoral", group: "Femoral", equipment: "Máquina", reps: "10-12", rest: 90, sets: 3 },
      { name: "Pantorrilla", group: "Pantorrilla", equipment: "Máquina", reps: "15", rest: 60, sets: 4 }
    ]
  },
  {
    dayNumber: 4,
    title: "Pecho hipertrofia + hombro",
    focus: "Volumen de torso anterior",
    cardio: 20,
    optional: false,
    exercises: [
      { name: "Press inclinado barra", group: "Pecho", equipment: "Barra", reps: "8-10", rest: 110, sets: 4 },
      { name: "Press plano mancuernas", group: "Pecho", equipment: "Mancuerna", reps: "10-12", rest: 90, sets: 4 },
      { name: "Aperturas máquina", group: "Pecho", equipment: "Máquina", reps: "12-15", rest: 75, sets: 3 },
      { name: "Elevaciones laterales", group: "Hombro", equipment: "Mancuerna", reps: "12-15", rest: 60, sets: 4 },
      { name: "Face pull", group: "Hombro", equipment: "Polea", reps: "12-15", rest: 60, sets: 3 },
      { name: "Press militar", group: "Hombro", equipment: "Barra", reps: "8-10", rest: 100, sets: 3 }
    ]
  },
  {
    dayNumber: 5,
    title: "Espalda + brazos volumen",
    focus: "Técnica y bombeo",
    cardio: 15,
    optional: false,
    exercises: [
      { name: "Peso muerto técnico ligero", group: "Espalda", equipment: "Barra", reps: "5", rest: 120, sets: 3 },
      { name: "Remo mancuerna", group: "Espalda", equipment: "Mancuerna", reps: "10", rest: 90, sets: 3 },
      { name: "Jalón cerrado", group: "Espalda", equipment: "Polea", reps: "10-12", rest: 90, sets: 3 },
      { name: "Curl predicador", group: "Bíceps", equipment: "Máquina", reps: "10-12", rest: 75, sets: 3 },
      { name: "Extensión tríceps polea", group: "Tríceps", equipment: "Polea", reps: "12", rest: 75, sets: 3 }
    ]
  },
  {
    dayNumber: 6,
    title: "Pierna posterior (opcional)",
    focus: "Tren inferior B + core",
    cardio: 25,
    optional: true,
    exercises: [
      { name: "Peso muerto rumano", group: "Femoral", equipment: "Barra", reps: "8-10", rest: 120, sets: 4 },
      { name: "Hip thrust", group: "Glúteo", equipment: "Barra", reps: "10", rest: 110, sets: 4 },
      { name: "Curl femoral sentado", group: "Femoral", equipment: "Máquina", reps: "12", rest: 90, sets: 3 },
      { name: "Pantorrilla", group: "Pantorrilla", equipment: "Máquina", reps: "15", rest: 60, sets: 4 },
      { name: "Abdominales (3 ejercicios)", group: "Core", equipment: "Peso corporal", reps: "3 series", rest: 45, sets: 3 }
    ]
  }
];

const basePlans: PlanBlueprint[] = [
  {
    name: BEACH_PLAN_NAME,
    code: "beach-8w",
    kind: "BEACH",
    description: "Plan flexible 5-6 días, cardio final y foco en recomposición para 8 semanas.",
    days: beachDays
  },
  {
    name: NORMAL_PLAN_NAME,
    code: "normal-anual",
    kind: "NORMAL",
    description: "Rutina anual base del proyecto 2026, orientada a hipertrofia sostenida con cardio complementario.",
    days: normalDays
  }
];

const titlesSeed = [
  { name: "Recluta", unlockType: "LEVEL", unlockValue: 1, description: "Inicio del camino de consistencia." },
  { name: "Constante", unlockType: "LEVEL", unlockValue: 3, description: "Ya entrenas con disciplina semanal." },
  { name: "Eres un crack", unlockType: "LEVEL", unlockValue: 5, description: "Progreso visible y ritmo estable." },
  { name: "Destructor", unlockType: "LEVEL", unlockValue: 7, description: "Ritmo alto y sesiones completas." },
  { name: "Bestia del GYM", unlockType: "LEVEL", unlockValue: 10, description: "Nivel avanzado de adherencia." },
  { name: "Máquina", unlockType: "LEVEL", unlockValue: 12, description: "Consistencia sostenida y técnica sólida." },
  { name: "Monstruo", unlockType: "LEVEL", unlockValue: 15, description: "Rendimiento superior en múltiples semanas." },
  { name: "Sombra Ascendente", unlockType: "LEVEL", unlockValue: 20, description: "Máxima progresión del ranking personal." },
  { name: "Imparable", unlockType: "ACHIEVEMENT", unlockValue: 7, description: "Alcanza 7 días de racha." },
  { name: "Pulso de Hierro", unlockType: "ACHIEVEMENT", unlockValue: 4, description: "4 semanas con adherencia >=80%." },
  { name: "No Falla", unlockType: "ACHIEVEMENT", unlockValue: 8, description: "Completa 8 semanas del plan playa." },
  { name: "Disciplina", unlockType: "ACHIEVEMENT", unlockValue: 6, description: "6 check-ins semanales seguidos." }
] as const;

const badgesSeed = [
  { name: "7 días seguidos", description: "Mantienes una racha de 7 días", iconKey: "streak_7" },
  { name: "4 semanas 80%+", description: "Sostuviste adherencia alta durante 4 semanas", iconKey: "consistency_4w" },
  { name: "Semana de 5 entrenos", description: "Cumpliste una semana intensa", iconKey: "week_5_sessions" },
  { name: "Plan playa completado", description: "Cerraste el bloque de 8 semanas", iconKey: "beach_8w" },
  { name: "Check-in maestro", description: "Hiciste 6 check-ins seguidos", iconKey: "checkin_6" }
] as const;

const questsSeed = [
  {
    type: "DAILY",
    name: "Entrena hoy",
    description: "Completa una sesión en el día actual.",
    xpReward: 60,
    criteriaJson: { metric: "sessions", target: 1, scope: "day", filter: "any" }
  },
  {
    type: "DAILY",
    name: "Cardio mínimo",
    description: "Registra al menos 10 min de cardio hoy.",
    xpReward: 35,
    criteriaJson: { metric: "cardio_minutes", target: 10, scope: "day" }
  },
  {
    type: "DAILY",
    name: "Peso del día",
    description: "Registra peso corporal hoy.",
    xpReward: 20,
    criteriaJson: { metric: "weight_logs", target: 1, scope: "day" }
  },
  {
    type: "WEEKLY",
    name: "Base semanal: 3 entrenos",
    description: "Completa mínimo 3 sesiones esta semana.",
    xpReward: 100,
    criteriaJson: { metric: "sessions", target: 3, scope: "week", filter: "any" }
  },
  {
    type: "WEEKLY",
    name: "Semana intensa: 5 entrenos",
    description: "Completa 5 sesiones o más en la semana.",
    xpReward: 180,
    criteriaJson: { metric: "sessions", target: 5, scope: "week", filter: "any" }
  },
  {
    type: "WEEKLY",
    name: "Frecuencia de pecho",
    description: "Cumple 2 sesiones con foco en pecho.",
    xpReward: 110,
    criteriaJson: { metric: "sessions", target: 2, scope: "week", filter: "chest" }
  },
  {
    type: "WEEKLY",
    name: "Check-in semanal",
    description: "Completa el check-in de la semana.",
    xpReward: 60,
    criteriaJson: { metric: "checkin", target: 1, scope: "week" }
  },
  {
    type: "MONTHLY",
    name: "Volumen mensual",
    description: "Completa al menos 12 entrenos en el mes.",
    xpReward: 220,
    criteriaJson: { metric: "sessions", target: 12, scope: "month", filter: "any" }
  },
  {
    type: "MONTHLY",
    name: "PR en banca",
    description: "Mejora tu mejor marca de press banca.",
    xpReward: 250,
    criteriaJson: { metric: "pr", target: 1, scope: "month", exerciseIncludes: "press banca" }
  },
  {
    type: "MONTHLY",
    name: "Control de peso",
    description: "Registra peso al menos 12 veces en el mes.",
    xpReward: 180,
    criteriaJson: { metric: "weight_logs", target: 12, scope: "month" }
  }
] as const;

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

function dayKeyOffset(offsetDays: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function weekStartDate(base = new Date()) {
  const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const day = date.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + delta);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function inferLowerDay(day: DayBlueprint) {
  const probe = `${day.title} ${day.focus}`.toLowerCase();
  return ["pierna", "femoral", "glúte", "tren inferior"].some((word) => probe.includes(word));
}

const exercisePhotoByKeyword: Array<{ keyword: string; imageUrl: string }> = [
  { keyword: "press banca", imageUrl: "https://images.pexels.com/photos/949126/pexels-photo-949126.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { keyword: "press inclinado", imageUrl: "https://images.pexels.com/photos/2261477/pexels-photo-2261477.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { keyword: "fondos", imageUrl: "https://images.pexels.com/photos/6550859/pexels-photo-6550859.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { keyword: "tríceps", imageUrl: "https://images.pexels.com/photos/4162492/pexels-photo-4162492.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { keyword: "dominadas", imageUrl: "https://images.pexels.com/photos/6740059/pexels-photo-6740059.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { keyword: "jalón", imageUrl: "https://images.pexels.com/photos/414029/pexels-photo-414029.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { keyword: "remo", imageUrl: "https://images.pexels.com/photos/3076516/pexels-photo-3076516.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { keyword: "curl", imageUrl: "https://images.pexels.com/photos/3837757/pexels-photo-3837757.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { keyword: "sentadilla", imageUrl: "https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { keyword: "prensa", imageUrl: "https://images.pexels.com/photos/1552249/pexels-photo-1552249.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { keyword: "cuádriceps", imageUrl: "https://images.pexels.com/photos/1309222/pexels-photo-1309222.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { keyword: "pantorrilla", imageUrl: "https://images.pexels.com/photos/4473616/pexels-photo-4473616.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { keyword: "peso muerto", imageUrl: "https://images.pexels.com/photos/4803702/pexels-photo-4803702.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { keyword: "hip thrust", imageUrl: "https://images.pexels.com/photos/6456148/pexels-photo-6456148.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { keyword: "plancha", imageUrl: "https://images.pexels.com/photos/6456213/pexels-photo-6456213.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { keyword: "hombro", imageUrl: "https://images.pexels.com/photos/3838389/pexels-photo-3838389.jpeg?auto=compress&cs=tinysrgb&w=1200" }
];

const exerciseGoalByGroup: Record<string, string> = {
  pecho: "mejorar fuerza de empuje y volumen en el torso",
  espalda: "ganar densidad dorsal y estabilidad escapular",
  bíceps: "sumar tensión efectiva en el tirón y mejorar el pico",
  tríceps: "potenciar el bloqueo y el empuje final",
  hombro: "dar anchura al torso y estabilidad al press",
  pierna: "construir una base fuerte y estable",
  femoral: "reforzar cadena posterior y proteger rodilla/cadera",
  glúteo: "mejorar potencia y estabilidad pélvica",
  pantorrilla: "ganar resistencia y fuerza en el apoyo",
  core: "mejorar control del tronco en todos los levantamientos"
};

function resolveExercisePhoto(name: string, muscleGroup: string) {
  const probe = `${name} ${muscleGroup}`.toLowerCase();
  const match = exercisePhotoByKeyword.find((entry) => probe.includes(entry.keyword));
  if (match) {
    return match.imageUrl;
  }

  return "https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=1200";
}

function exerciseCopy(name: string, equipment: string, muscleGroup: string) {
  const groupKey = muscleGroup.toLowerCase();
  const goal = exerciseGoalByGroup[groupKey] ?? "mejorar técnica y consistencia semana a semana";

  return {
    imageUrl: resolveExercisePhoto(name, muscleGroup),
    instructions: `Enfócate en ${goal}. Inicia con setup sólido en ${equipment.toLowerCase()}, controla la bajada 2-3 segundos y busca rango completo con técnica limpia antes de subir carga.`,
    commonMistakes: `Error típico en ${name}: acelerar la fase excéntrica y compensar con espalda/cuello. Mantén core activo y evita recortar el recorrido por mover más peso.`,
    tips: `Tip práctico para ${name}: trabaja entre 1 y 3 RIR, graba una serie top para revisar técnica y aplica progresión pequeña cada semana (+1-2 reps o +2,5 kg).`,
    alternatives: `Si no tienes ${equipment.toLowerCase()}, usa una variante equivalente de ${muscleGroup.toLowerCase()} (máquina, polea o mancuerna) manteniendo el mismo patrón de movimiento.`
  };
}

function validateLowerBodyRule(plans: PlanBlueprint[]) {
  for (const plan of plans) {
    const lowerDays = plan.days.filter(inferLowerDay);
    if (lowerDays.length > 2) {
      throw new Error(`La rutina ${plan.name} excede 2 días de tren inferior (${lowerDays.length}).`);
    }
  }
}

async function seedExercises() {
  const uniqueExercises = new Map<string, { name: string; muscleGroup: string; equipment: string }>();

  for (const plan of basePlans) {
    for (const day of plan.days) {
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
  }

  for (const exercise of uniqueExercises.values()) {
    const content = exerciseCopy(exercise.name, exercise.equipment, exercise.muscleGroup);

    await prisma.exercise.upsert({
      where: { name_equipment: { name: exercise.name, equipment: exercise.equipment } },
      update: {
        muscleGroup: exercise.muscleGroup,
        instructions: content.instructions,
        commonMistakes: content.commonMistakes,
        tips: content.tips,
        alternatives: content.alternatives,
        imageUrl: content.imageUrl
      },
      create: {
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
        ...content
      }
    });
  }
}

async function seedBasePlan(planBlueprint: PlanBlueprint) {
  const plan = await prisma.workoutPlan.upsert({
    where: { name: planBlueprint.name },
    update: {
      code: planBlueprint.code,
      description: planBlueprint.description,
      kind: planBlueprint.kind,
      isActive: true
    },
    create: {
      code: planBlueprint.code,
      name: planBlueprint.name,
      description: planBlueprint.description,
      kind: planBlueprint.kind,
      isActive: true
    }
  });

  for (const day of planBlueprint.days) {
    const workoutDay = await prisma.workoutDay.upsert({
      where: {
        workoutPlanId_dayNumber: {
          workoutPlanId: plan.id,
          dayNumber: day.dayNumber
        }
      },
      update: {
        title: day.title,
        focus: day.focus,
        isOptional: day.optional,
        cardioDefault: day.cardio
      },
      create: {
        workoutPlanId: plan.id,
        dayNumber: day.dayNumber,
        title: day.title,
        focus: day.focus,
        isOptional: day.optional,
        cardioDefault: day.cardio
      }
    });

    await prisma.dayExercise.deleteMany({ where: { workoutDayId: workoutDay.id } });

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

async function seedCatalog() {
  for (const title of titlesSeed) {
    await prisma.title.upsert({
      where: { name: title.name },
      update: {
        unlockType: title.unlockType,
        unlockValue: title.unlockValue,
        description: title.description
      },
      create: {
        name: title.name,
        unlockType: title.unlockType,
        unlockValue: title.unlockValue,
        description: title.description
      }
    });
  }

  for (const badge of badgesSeed) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: {
        description: badge.description,
        iconKey: badge.iconKey
      },
      create: {
        name: badge.name,
        description: badge.description,
        iconKey: badge.iconKey
      }
    });
  }

  for (const quest of questsSeed) {
    await prisma.quest.upsert({
      where: { name: quest.name },
      update: {
        type: quest.type,
        description: quest.description,
        xpReward: quest.xpReward,
        criteriaJson: quest.criteriaJson,
        isActive: true
      },
      create: {
        type: quest.type,
        name: quest.name,
        description: quest.description,
        xpReward: quest.xpReward,
        criteriaJson: quest.criteriaJson,
        isActive: true
      }
    });
  }
}

async function seedDemoCustomPlan(userId: string, sourcePlanId: string) {
  const existing = await prisma.customWorkoutPlan.findFirst({
    where: { userId, name: "Mi Rutina Personal" },
    include: { customWorkoutDays: true }
  });

  const customPlan =
    existing ??
    (await prisma.customWorkoutPlan.create({
      data: {
        userId,
        name: "Mi Rutina Personal",
        description: "Plantilla editable para ajustar días y ejercicios",
        isActive: false,
        isArchived: false
      }
    }));

  if (existing?.customWorkoutDays.length) {
    return customPlan;
  }

  const sourceDays = await prisma.workoutDay.findMany({
    where: {
      workoutPlanId: sourcePlanId,
      dayNumber: { in: [1, 2, 4, 5] }
    },
    orderBy: { dayNumber: "asc" },
    include: {
      dayExercises: {
        orderBy: { order: "asc" }
      }
    }
  });

  let order = 1;
  for (const source of sourceDays) {
    const day = await prisma.customWorkoutDay.create({
      data: {
        planId: customPlan.id,
        name: source.title,
        focus: source.focus,
        order,
        isOptional: false,
        cardioDefault: source.cardioDefault
      }
    });

    for (const entry of source.dayExercises) {
      await prisma.customWorkoutExercise.create({
        data: {
          dayId: day.id,
          exerciseId: entry.exerciseId,
          order: entry.order,
          sets: entry.suggestedSets,
          reps: entry.suggestedReps,
          restSeconds: entry.suggestedRestSec
        }
      });
    }

    order += 1;
  }

  return customPlan;
}

async function seedUser(beachPlanId: string, normalPlanId: string) {
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
      beachGoalDate: dayKeyOffset(56),
      activePlanType: "BASE",
      activeBasePlanId: beachPlanId,
      activeCustomPlanId: null
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
      beachGoalDate: dayKeyOffset(56),
      activePlanType: "BASE",
      activeBasePlanId: beachPlanId,
      activeCustomPlanId: null
    }
  });

  for (let i = 0; i < 10; i += 1) {
    const date = dayKeyOffset(-i * 7);
    await prisma.bodyWeightLog.upsert({
      where: { userId_date: { userId: user.id, date } },
      update: { weightKg: 80 - i * 0.32 },
      create: { userId: user.id, date, weightKg: 80 - i * 0.32 }
    });
  }

  const firstDay = await prisma.workoutDay.findFirstOrThrow({
    where: { workoutPlanId: beachPlanId, dayNumber: 1 }
  });

  const sessionDate = dayKeyOffset(-1);
  const existing = await prisma.workoutSession.findFirst({
    where: { userId: user.id, workoutDayId: firstDay.id, date: sessionDate }
  });

  if (!existing) {
    const session = await prisma.workoutSession.create({
      data: {
        userId: user.id,
        planType: "BASE",
        basePlanId: beachPlanId,
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

  const monday = weekStartDate(dayKeyOffset(0));
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);

  await prisma.weeklyCheckin.upsert({
    where: { userId_weekStartDate: { userId: user.id, weekStartDate: monday } },
    update: {
      weekEndDate: sunday,
      effortScore: 6,
      fatigueFlag: false
    },
    create: {
      userId: user.id,
      weekStartDate: monday,
      weekEndDate: sunday,
      effortScore: 6,
      fatigueFlag: false
    }
  });

  await prisma.weeklyRecommendation.upsert({
    where: { userId_weekStartDate: { userId: user.id, weekStartDate: monday } },
    update: {
      compoundIncreasePct: 2.5,
      accessoryIncreasePct: 2.5,
      message: "Semana consistente: sube 2.5% en compuestos y 1-2 kg en aislados si mantienes técnica."
    },
    create: {
      userId: user.id,
      weekStartDate: monday,
      compoundIncreasePct: 2.5,
      accessoryIncreasePct: 2.5,
      message: "Semana consistente: sube 2.5% en compuestos y 1-2 kg en aislados si mantienes técnica."
    }
  });

  const recruiter = await prisma.title.findUnique({ where: { name: "Recluta" } });
  await prisma.userStats.upsert({
    where: { userId: user.id },
    update: {
      xpTotal: 0,
      level: 1,
      streakCount: 0,
      currentTitleId: recruiter?.id
    },
    create: {
      userId: user.id,
      xpTotal: 0,
      level: 1,
      streakCount: 0,
      currentTitleId: recruiter?.id
    }
  });

  if (recruiter) {
    await prisma.userTitle.upsert({
      where: { userId_titleId: { userId: user.id, titleId: recruiter.id } },
      update: {},
      create: {
        userId: user.id,
        titleId: recruiter.id
      }
    });
  }

  await seedDemoCustomPlan(user.id, normalPlanId);

  return user;
}

async function main() {
  validateLowerBodyRule(basePlans);
  await seedExercises();

  const [beachPlan, normalPlan] = await Promise.all([
    seedBasePlan(basePlans[0]),
    seedBasePlan(basePlans[1])
  ]);

  await seedCatalog();
  await seedUser(beachPlan.id, normalPlan.id);

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
