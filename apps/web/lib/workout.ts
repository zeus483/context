import { PlanType, SessionStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { addDays, fromDateKey, toDateKey, todayKey } from "./dates";
import { BEACH_PLAN_CODE, PLAN_NAME } from "./constants";

const SCHEDULE_5 = [0, 1, 2, 3, 4, 5, 0];
const SCHEDULE_6 = [0, 1, 2, 3, 4, 5, 6];

export type NormalizedPlanExercise = {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  instructions: string;
  suggestedSets: number;
  suggestedReps: string;
  suggestedRestSec: number;
  order: number;
};

export type NormalizedPlanDay = {
  id: string;
  order: number;
  title: string;
  focus: string;
  isOptional: boolean;
  cardioDefault: number;
  exercises: NormalizedPlanExercise[];
};

export type ActivePlanContext = {
  planType: PlanType;
  planId: string;
  planName: string;
  kind: "BEACH" | "NORMAL" | "CUSTOM";
  days: NormalizedPlanDay[];
};

export async function getActivePlan() {
  const plan = await prisma.workoutPlan.findFirst({
    where: {
      OR: [{ code: BEACH_PLAN_CODE }, { name: PLAN_NAME }],
      isActive: true
    },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    include: {
      workoutDays: {
        orderBy: { dayNumber: "asc" },
        include: {
          dayExercises: {
            orderBy: { order: "asc" },
            include: { exercise: true }
          }
        }
      }
    }
  });

  if (!plan) {
    throw new Error("Plan base no encontrado. Ejecuta el seed.");
  }

  return plan;
}

function normalizeBasePlan(plan: Awaited<ReturnType<typeof getActivePlan>>): ActivePlanContext {
  return {
    planType: "BASE",
    planId: plan.id,
    planName: plan.name,
    kind: plan.kind,
    days: plan.workoutDays.map((day) => ({
      id: day.id,
      order: day.dayNumber,
      title: day.title,
      focus: day.focus,
      isOptional: day.isOptional,
      cardioDefault: day.cardioDefault,
      exercises: day.dayExercises.map((entry) => ({
        exerciseId: entry.exercise.id,
        order: entry.order,
        name: entry.exercise.name,
        muscleGroup: entry.exercise.muscleGroup,
        equipment: entry.exercise.equipment,
        instructions: entry.exercise.instructions,
        suggestedSets: entry.suggestedSets,
        suggestedReps: entry.suggestedReps,
        suggestedRestSec: entry.suggestedRestSec
      }))
    }))
  };
}

async function getFallbackBasePlan() {
  return prisma.workoutPlan.findFirst({
    where: { isActive: true },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    include: {
      workoutDays: {
        orderBy: { dayNumber: "asc" },
        include: {
          dayExercises: {
            orderBy: { order: "asc" },
            include: { exercise: true }
          }
        }
      }
    }
  });
}

async function getBasePlanById(planId: string) {
  return prisma.workoutPlan.findUnique({
    where: { id: planId },
    include: {
      workoutDays: {
        orderBy: { dayNumber: "asc" },
        include: {
          dayExercises: {
            orderBy: { order: "asc" },
            include: { exercise: true }
          }
        }
      }
    }
  });
}

async function getCustomPlanById(planId: string) {
  return prisma.customWorkoutPlan.findUnique({
    where: { id: planId },
    include: {
      customWorkoutDays: {
        orderBy: { order: "asc" },
        include: {
          customWorkoutExercises: {
            orderBy: { order: "asc" },
            include: { exercise: true }
          }
        }
      }
    }
  });
}

function normalizeCustomPlan(
  plan: NonNullable<Awaited<ReturnType<typeof getCustomPlanById>>>
): ActivePlanContext {
  return {
    planType: "CUSTOM",
    planId: plan.id,
    planName: plan.name,
    kind: "CUSTOM",
    days: plan.customWorkoutDays.map((day) => ({
      id: day.id,
      order: day.order,
      title: day.name,
      focus: day.focus,
      isOptional: day.isOptional,
      cardioDefault: day.cardioDefault,
      exercises: day.customWorkoutExercises.map((entry) => ({
        exerciseId: entry.exercise.id,
        order: entry.order,
        name: entry.exercise.name,
        muscleGroup: entry.exercise.muscleGroup,
        equipment: entry.exercise.equipment,
        instructions: entry.exercise.instructions,
        suggestedSets: entry.sets,
        suggestedReps: entry.reps,
        suggestedRestSec: entry.restSeconds
      }))
    }))
  };
}

export async function getActivePlanForUser(userId: string): Promise<ActivePlanContext> {
  const profile = await prisma.profile.findUnique({ where: { userId } });

  if (!profile) {
    throw new Error("Perfil no encontrado");
  }

  if (profile.activePlanType === "CUSTOM" && profile.activeCustomPlanId) {
    const customPlan = await getCustomPlanById(profile.activeCustomPlanId);
    if (customPlan && customPlan.userId === userId && !customPlan.isArchived) {
      return normalizeCustomPlan(customPlan);
    }
  }

  const basePlan =
    (profile.activeBasePlanId ? await getBasePlanById(profile.activeBasePlanId) : null) ??
    (await getFallbackBasePlan()) ??
    (await getActivePlan());

  if (!basePlan) {
    throw new Error("No hay plan base activo.");
  }

  return normalizeBasePlan(basePlan);
}

function scheduleDayNumber(date: Date, trainingDays: number) {
  const dayOfWeek = date.getUTCDay();
  return trainingDays === 6 ? SCHEDULE_6[dayOfWeek] : SCHEDULE_5[dayOfWeek];
}

export async function resolveAssignment(
  userId: string,
  dateKey: string,
  trainingDays: 5 | 6,
  activePlan?: ActivePlanContext
) {
  const plan = activePlan ?? (await getActivePlanForUser(userId));
  const date = fromDateKey(dateKey);

  const existing = await prisma.workoutAssignment.findUnique({
    where: { userId_date: { userId, date } },
    include: { workoutDay: true, customWorkoutDay: true }
  });

  if (existing) {
    return existing;
  }

  const plannedOrder = scheduleDayNumber(date, trainingDays);
  if (plannedOrder === 0) {
    return prisma.workoutAssignment.create({
      data: {
        userId,
        date,
        planType: plan.planType,
        basePlanId: plan.planType === "BASE" ? plan.planId : null,
        customPlanId: plan.planType === "CUSTOM" ? plan.planId : null,
        isRest: true
      },
      include: { workoutDay: true, customWorkoutDay: true }
    });
  }

  const day = plan.days.find((entry) => entry.order === plannedOrder);

  if (!day) {
    return prisma.workoutAssignment.create({
      data: {
        userId,
        date,
        planType: plan.planType,
        basePlanId: plan.planType === "BASE" ? plan.planId : null,
        customPlanId: plan.planType === "CUSTOM" ? plan.planId : null,
        isRest: true
      },
      include: { workoutDay: true, customWorkoutDay: true }
    });
  }

  return prisma.workoutAssignment.create({
    data: {
      userId,
      date,
      planType: plan.planType,
      basePlanId: plan.planType === "BASE" ? plan.planId : null,
      customPlanId: plan.planType === "CUSTOM" ? plan.planId : null,
      workoutDayId: plan.planType === "BASE" ? day.id : null,
      customWorkoutDayId: plan.planType === "CUSTOM" ? day.id : null,
      isRest: false
    },
    include: { workoutDay: true, customWorkoutDay: true }
  });
}

export async function listAssignments(
  userId: string,
  startKey: string,
  days: number,
  trainingDays: 5 | 6,
  activePlan?: ActivePlanContext
) {
  const result = [];
  const resolvedPlan = activePlan ?? (await getActivePlanForUser(userId));

  for (let i = 0; i < days; i += 1) {
    const key = addDays(startKey, i);
    result.push(await resolveAssignment(userId, key, trainingDays, resolvedPlan));
  }

  return result;
}

export function assignmentMeta(assignment: {
  isRest: boolean;
  workoutDayId: string | null;
  customWorkoutDayId: string | null;
  workoutDay?: { title: string; focus: string; cardioDefault: number } | null;
  customWorkoutDay?: { name: string; focus: string; cardioDefault: number } | null;
}) {
  if (assignment.isRest) {
    return {
      dayId: null,
      title: "Descanso",
      focus: "Recuperación",
      cardioDefault: 0
    };
  }

  if (assignment.workoutDayId && assignment.workoutDay) {
    return {
      dayId: assignment.workoutDayId,
      title: assignment.workoutDay.title,
      focus: assignment.workoutDay.focus,
      cardioDefault: assignment.workoutDay.cardioDefault
    };
  }

  if (assignment.customWorkoutDayId && assignment.customWorkoutDay) {
    return {
      dayId: assignment.customWorkoutDayId,
      title: assignment.customWorkoutDay.name,
      focus: assignment.customWorkoutDay.focus,
      cardioDefault: assignment.customWorkoutDay.cardioDefault
    };
  }

  return {
    dayId: null,
    title: "Descanso",
    focus: "Recuperación",
    cardioDefault: 0
  };
}

export function beachStats(goalDate: Date) {
  const now = new Date();
  const diff = Math.ceil((goalDate.getTime() - now.getTime()) / 86_400_000);
  const daysLeft = Math.max(0, diff);
  const progressPct = Math.max(0, Math.min(100, Math.round(((56 - daysLeft) / 56) * 100)));

  return { daysLeft, progressPct };
}

export type DayStatus = "DONE" | "PARTIAL" | "REST" | "MISSED" | "PENDING";

export function statusFromSessions(params: {
  dateKey: string;
  todayDateKey?: string;
  isRest: boolean;
  hasSessionDone: boolean;
  hasSessionPartial: boolean;
}) {
  const today = params.todayDateKey ?? todayKey();

  if (params.hasSessionDone) {
    return "DONE" as const;
  }

  if (params.hasSessionPartial) {
    return "PARTIAL" as const;
  }

  if (params.isRest) {
    return "REST" as const;
  }

  return params.dateKey < today ? ("MISSED" as const) : ("PENDING" as const);
}

export function statusLabel(status: DayStatus) {
  switch (status) {
    case "DONE":
      return "Hecho ✅";
    case "PARTIAL":
      return "Parcial ⚠️";
    case "REST":
      return "Descanso ○";
    case "MISSED":
      return "Fallado —";
    default:
      return "Pendiente";
  }
}

export function computeStreak(statuses: DayStatus[]) {
  let streak = 0;
  for (const status of statuses) {
    if (status === "DONE" || status === "PARTIAL") {
      streak += 1;
      continue;
    }
    if (status === "REST") {
      continue;
    }
    break;
  }
  return streak;
}

export function compliancePercent(statuses: DayStatus[]) {
  const plannedDays = statuses.filter((status) => status !== "REST").length;
  if (!plannedDays) {
    return 100;
  }
  const completed = statuses.filter((status) => status === "DONE" || status === "PARTIAL").length;
  return Math.round((completed / plannedDays) * 100);
}

export function summarizeDailyStatus(sessions: Array<{ date: Date; status: SessionStatus }>) {
  const byDate = new Map<string, { done: boolean; partial: boolean }>();

  for (const session of sessions) {
    const key = toDateKey(session.date);
    const current = byDate.get(key) ?? { done: false, partial: false };
    if (session.status === "DONE") {
      current.done = true;
    }
    if (session.status === "PARTIAL") {
      current.partial = true;
    }
    byDate.set(key, current);
  }

  return byDate;
}
