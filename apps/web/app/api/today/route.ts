import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth";
import { unauthorized } from "../../../lib/http";
import { addDays, fromDateKey, todayKey, toDateKey, weekBounds } from "../../../lib/dates";
import {
  assignmentMeta,
  beachStats,
  compliancePercent,
  computeStreak,
  getActivePlanForUser,
  listAssignments,
  resolveAssignment,
  statusFromSessions,
  statusLabel,
  summarizeDailyStatus
} from "../../../lib/workout";
import { prisma } from "../../../lib/prisma";
import { ensureRecentRecommendation, getWeeklyState, refreshGamification } from "../../../lib/gamification";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth || !auth.profile) {
    return unauthorized();
  }

  const trainingDays = (auth.profile.trainingDays === 6 ? 6 : 5) as 5 | 6;
  const nowKey = todayKey();
  const activePlan = await getActivePlanForUser(auth.user.id);

  const todayAssignment = await resolveAssignment(auth.user.id, nowKey, trainingDays, activePlan);
  const tomorrowAssignment = await resolveAssignment(auth.user.id, addDays(nowKey, 1), trainingDays, activePlan);

  const trailingStart = addDays(nowKey, -13);
  const trailingAssignments = await listAssignments(auth.user.id, trailingStart, 14, trainingDays, activePlan);
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

  const { startKey: weekStart, endKey: weekEnd } = weekBounds(nowKey);
  const weekAssignments = await listAssignments(auth.user.id, weekStart, 7, trainingDays, activePlan);
  const weekSessions = await prisma.workoutSession.findMany({
    where: {
      userId: auth.user.id,
      date: {
        gte: fromDateKey(weekStart),
        lte: fromDateKey(weekEnd)
      }
    },
    select: {
      date: true,
      status: true
    }
  });

  const weekByDay = summarizeDailyStatus(weekSessions);

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

    const meta = assignmentMeta(assignment);
    const planType = assignment.customWorkoutDayId ? "CUSTOM" : "BASE";

    return {
      date: key,
      title: meta.title,
      dayId: meta.dayId,
      planType,
      status,
      statusLabel: statusLabel(status)
    };
  });

  const beach = beachStats(auth.profile.beachGoalDate);
  const weeklyState = await getWeeklyState(auth.user.id);
  const recommendation = await ensureRecentRecommendation(auth.user.id);
  const gamification = await refreshGamification(auth.user.id);

  const latestWeight = await prisma.bodyWeightLog.findFirst({
    where: { userId: auth.user.id },
    orderBy: { date: "desc" }
  });

  const daysWithoutWeight = latestWeight ? Math.max(0, Math.floor((Date.now() - latestWeight.date.getTime()) / 86_400_000)) : 999;

  const todayMeta = assignmentMeta(todayAssignment);
  const tomorrowMeta = assignmentMeta(tomorrowAssignment);

  return NextResponse.json({
    activePlan: {
      id: activePlan.planId,
      name: activePlan.planName,
      type: activePlan.planType,
      kind: activePlan.kind
    },
    today: {
      date: nowKey,
      dayId: todayMeta.dayId,
      planType: todayAssignment.customWorkoutDayId ? "CUSTOM" : "BASE",
      title: todayMeta.title,
      focus: todayMeta.focus,
      isRest: todayAssignment.isRest,
      cardioDefault: todayMeta.cardioDefault
    },
    tomorrow: {
      date: addDays(nowKey, 1),
      dayId: tomorrowMeta.dayId,
      planType: tomorrowAssignment.customWorkoutDayId ? "CUSTOM" : "BASE",
      title: tomorrowMeta.title,
      isRest: tomorrowAssignment.isRest
    },
    week: weekItems,
    adherence: {
      streak: computeStreak(trailingStatuses),
      complianceLast2WeeksPct: compliancePercent(trailingStatuses)
    },
    beach,
    checkin: {
      weekStartDate: weeklyState.startKey,
      weekEndDate: weeklyState.endKey,
      pendingCurrentWeek: weeklyState.pendingCurrentWeek,
      pendingPreviousWeek: weeklyState.pendingPreviousWeek
    },
    recommendation: recommendation
      ? {
          weekStartDate: toDateKey(recommendation.weekStartDate),
          compoundIncreasePct: recommendation.compoundIncreasePct,
          accessoryIncreasePct: recommendation.accessoryIncreasePct,
          message: recommendation.message
        }
      : null,
    weightNudge: {
      daysWithoutLog: daysWithoutWeight,
      shouldNudge: daysWithoutWeight > 7
    },
    gamification
  });
}
