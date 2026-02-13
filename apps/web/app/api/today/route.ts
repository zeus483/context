import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth";
import { unauthorized } from "../../../lib/http";
import { addDays, fromDateKey, todayKey, toDateKey } from "../../../lib/dates";
import {
  beachStats,
  compliancePercent,
  computeStreak,
  listAssignments,
  resolveAssignment,
  statusFromSessions,
  statusLabel,
  summarizeDailyStatus
} from "../../../lib/workout";
import { prisma } from "../../../lib/prisma";

function mondayOf(dateKey: string) {
  const date = fromDateKey(dateKey);
  const day = date.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + delta);
  return toDateKey(date);
}

export async function GET() {
  const auth = await getAuthContext();
  if (!auth || !auth.profile) {
    return unauthorized();
  }

  const trainingDays = (auth.profile.trainingDays === 6 ? 6 : 5) as 5 | 6;
  const nowKey = todayKey();
  const todayAssignment = await resolveAssignment(auth.user.id, nowKey, trainingDays);
  const tomorrowAssignment = await resolveAssignment(auth.user.id, addDays(nowKey, 1), trainingDays);

  const trailingStart = addDays(nowKey, -13);
  const trailingAssignments = await listAssignments(auth.user.id, trailingStart, 14, trainingDays);
  const trailingSessions = await prisma.workoutSession.findMany({
    where: {
      userId: auth.user.id,
      date: {
        gte: fromDateKey(trailingStart),
        lte: fromDateKey(nowKey)
      }
    },
    select: { date: true, status: true }
  });

  const trailingByDay = summarizeDailyStatus(trailingSessions);
  const trailingStatuses = trailingAssignments
    .map((assignment) => {
      const dateKey = toDateKey(assignment.date);
      const summary = trailingByDay.get(dateKey);
      return statusFromSessions({
        dateKey,
        todayDateKey: nowKey,
        isRest: assignment.isRest,
        hasSessionDone: summary?.done ?? false,
        hasSessionPartial: summary?.partial ?? false
      });
    })
    .reverse();

  const weekStart = mondayOf(nowKey);
  const weekAssignments = await listAssignments(auth.user.id, weekStart, 7, trainingDays);
  const weekSessions = await prisma.workoutSession.findMany({
    where: {
      userId: auth.user.id,
      date: {
        gte: fromDateKey(weekStart),
        lte: fromDateKey(addDays(weekStart, 6))
      }
    },
    include: { workoutDay: true }
  });

  const weekByDay = summarizeDailyStatus(
    weekSessions.map((session) => ({
      date: session.date,
      status: session.status
    }))
  );

  const weekItems = weekAssignments.map((assignment) => {
    const key = toDateKey(assignment.date);
    const summary = weekByDay.get(key);
    const status = statusFromSessions({
      dateKey: key,
      todayDateKey: nowKey,
      isRest: assignment.isRest,
      hasSessionDone: summary?.done ?? false,
      hasSessionPartial: summary?.partial ?? false
    });

    return {
      date: key,
      title: assignment.workoutDay?.title ?? "Descanso",
      dayId: assignment.workoutDayId,
      status,
      statusLabel: statusLabel(status)
    };
  });

  const beach = beachStats(auth.profile.beachGoalDate);

  return NextResponse.json({
    today: {
      date: nowKey,
      dayId: todayAssignment.workoutDayId,
      title: todayAssignment.workoutDay?.title ?? "Descanso",
      focus: todayAssignment.workoutDay?.focus ?? "Recuperación",
      isRest: todayAssignment.isRest,
      cardioDefault: todayAssignment.workoutDay?.cardioDefault ?? 0
    },
    tomorrow: {
      date: addDays(nowKey, 1),
      dayId: tomorrowAssignment.workoutDayId,
      title: tomorrowAssignment.workoutDay?.title ?? "Descanso",
      isRest: tomorrowAssignment.isRest
    },
    week: weekItems,
    adherence: {
      streak: computeStreak(trailingStatuses),
      complianceLast2WeeksPct: compliancePercent(trailingStatuses)
    },
    beach
  });
}
