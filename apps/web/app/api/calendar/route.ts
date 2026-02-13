import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth";
import { unauthorized } from "../../../lib/http";
import { addDays, formatLongDate, fromDateKey, monthBounds, todayKey, toDateKey } from "../../../lib/dates";
import { prisma } from "../../../lib/prisma";
import { listAssignments, statusFromSessions, statusLabel, summarizeDailyStatus } from "../../../lib/workout";

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
  const assignments = await listAssignments(auth.user.id, startKey, totalDays, trainingDays);

  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId: auth.user.id,
      date: {
        gte: fromDateKey(startKey),
        lte: fromDateKey(endKey)
      }
    },
    include: { workoutDay: true, cardioEntry: true }
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

    return {
      date: key,
      dayOfMonth: Number(key.slice(8, 10)),
      title: assignment.workoutDay?.title ?? "Descanso",
      dayId: assignment.workoutDayId,
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
      sessions: detailSessions
    };
  }

  const upcoming = cells.filter((cell) => cell.date >= nowKey).slice(0, 7);

  return NextResponse.json({
    month,
    startKey,
    endKey,
    cells,
    details,
    upcoming,
    quickRange: {
      today: nowKey,
      tomorrow: addDays(nowKey, 1)
    }
  });
}
