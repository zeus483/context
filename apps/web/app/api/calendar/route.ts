import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth";
import { unauthorized } from "../../../lib/http";
import { addDays, formatLongDate, fromDateKey, monthBounds, todayKey, toDateKey } from "../../../lib/dates";
import { prisma } from "../../../lib/prisma";
import {
  assignmentMeta,
  getActivePlanForUser,
  listAssignments,
  statusFromSessions,
  statusLabel,
  summarizeDailyStatus
} from "../../../lib/workout";

export async function GET(req: Request) {
  const auth = await getAuthContext();
  if (!auth || !auth.profile) {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ?? todayKey().slice(0, 7);
  const selectedDate = searchParams.get("date");
  const trainingDays = (auth.profile.trainingDays === 6 ? 6 : 5) as 5 | 6;

  const { startKey, endKey } = monthBounds(month);
  const totalDays = Math.max(1, Number(endKey.slice(8, 10)));
  const activePlan = await getActivePlanForUser(auth.user.id);
  const assignments = await listAssignments(auth.user.id, startKey, totalDays, trainingDays, activePlan);

  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId: auth.user.id,
      date: {
        gte: fromDateKey(startKey),
        lte: fromDateKey(endKey)
      }
    },
    include: { workoutDay: true, customWorkoutDay: true, cardioEntry: true }
  });

  const summaryByDate = summarizeDailyStatus(
    sessions.map((session) => ({
      date: session.date,
      status: session.status
    }))
  );

  const nowKey = todayKey();
  const cells = assignments.map((assignment) => {
    const key = toDateKey(assignment.date);
    const summary = summaryByDate.get(key);
    const status = statusFromSessions({
      dateKey: key,
      todayDateKey: nowKey,
      isRest: assignment.isRest,
      hasSessionDone: summary?.done ?? false,
      hasSessionPartial: summary?.partial ?? false
    });

    const meta = assignmentMeta(assignment);

    return {
      date: key,
      dayOfMonth: Number(key.slice(8, 10)),
      title: meta.title,
      dayId: meta.dayId,
      planType: assignment.customWorkoutDayId ? "CUSTOM" : "BASE",
      status,
      statusLabel: statusLabel(status)
    };
  });

  let details = null;
  if (selectedDate) {
    const detailSessions = await prisma.workoutSession.findMany({
      where: {
        userId: auth.user.id,
        date: fromDateKey(selectedDate)
      },
      include: {
        workoutDay: true,
        customWorkoutDay: true,
        cardioEntry: true,
        sets: {
          include: { exercise: true },
          orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }]
        }
      }
    });

    details = {
      date: selectedDate,
      label: formatLongDate(selectedDate),
      sessions: detailSessions.map((session) => ({
        id: session.id,
        status: session.status,
        notes: session.notes,
        planType: session.planType,
        dayId: session.planType === "BASE" ? session.workoutDayId : session.customWorkoutDayId,
        dayTitle: session.workoutDay?.title ?? session.customWorkoutDay?.name ?? "Sesión",
        cardioEntry: session.cardioEntry,
        sets: session.sets
      }))
    };
  }

  const upcoming = cells.filter((cell) => cell.date >= nowKey).slice(0, 7);
  const recentSessions = await prisma.workoutSession.findMany({
    where: { userId: auth.user.id },
    orderBy: { date: "desc" },
    take: 12,
    include: {
      workoutDay: true,
      customWorkoutDay: true,
      cardioEntry: true
    }
  });

  return NextResponse.json({
    month,
    startKey,
    endKey,
    cells,
    details,
    upcoming,
    recentSessions: recentSessions.map((session) => ({
      id: session.id,
      date: toDateKey(session.date),
      status: session.status,
      planType: session.planType,
      dayId: session.planType === "BASE" ? session.workoutDayId : session.customWorkoutDayId,
      title: session.workoutDay?.title ?? session.customWorkoutDay?.name ?? "Sesión",
      cardioMinutes: session.cardioEntry?.minutes ?? 0
    })),
    quickRange: {
      today: nowKey,
      tomorrow: addDays(nowKey, 1)
    }
  });
}
