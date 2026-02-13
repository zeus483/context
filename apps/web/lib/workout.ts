import { SessionStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { addDays, fromDateKey, toDateKey, todayKey } from "./dates";
import { PLAN_NAME } from "./constants";

const SCHEDULE_5 = [0, 1, 2, 3, 4, 5, 0];
const SCHEDULE_6 = [0, 1, 2, 3, 4, 5, 6];

export async function getActivePlan() {
  const plan = await prisma.workoutPlan.findFirst({
    where: {
      name: PLAN_NAME,
      isActive: true
    },
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

function scheduleDayNumber(date: Date, trainingDays: number) {
  const dayOfWeek = date.getUTCDay();
  return trainingDays === 6 ? SCHEDULE_6[dayOfWeek] : SCHEDULE_5[dayOfWeek];
}

export async function resolveAssignment(userId: string, dateKey: string, trainingDays: 5 | 6) {
  const plan = await getActivePlan();
  const date = fromDateKey(dateKey);

  const existing = await prisma.workoutAssignment.findUnique({
    where: { userId_date: { userId, date } },
    include: { workoutDay: true }
  });

  if (existing) {
    return existing;
  }

  const plannedDayNumber = scheduleDayNumber(date, trainingDays);
  if (plannedDayNumber === 0) {
    return prisma.workoutAssignment.create({
      data: {
        userId,
        date,
        isRest: true
      },
      include: { workoutDay: true }
    });
  }

  const workoutDay = plan.workoutDays.find((day) => day.dayNumber === plannedDayNumber);
  if (!workoutDay) {
    throw new Error(`No existe día ${plannedDayNumber} en el plan activo`);
  }

  return prisma.workoutAssignment.create({
    data: {
      userId,
      date,
      workoutDayId: workoutDay.id,
      isRest: false
    },
    include: { workoutDay: true }
  });
}

export async function listAssignments(userId: string, startKey: string, days: number, trainingDays: 5 | 6) {
  const result = [];

  for (let i = 0; i < days; i += 1) {
    const key = addDays(startKey, i);
    result.push(await resolveAssignment(userId, key, trainingDays));
  }

  return result;
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
