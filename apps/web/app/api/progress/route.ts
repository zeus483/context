import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth";
import { unauthorized } from "../../../lib/http";
import { addDays, fromDateKey, todayKey, toDateKey } from "../../../lib/dates";
import { prisma } from "../../../lib/prisma";
import {
  beachStats,
  compliancePercent,
  computeStreak,
  listAssignments,
  statusFromSessions,
  summarizeDailyStatus
} from "../../../lib/workout";

const PR_GROUPS = [
  { key: "pressBanca", label: "Press banca", matches: ["press banca"] },
  { key: "pressInclinado", label: "Press inclinado", matches: ["press inclinado"] },
  { key: "sentadillaPrensa", label: "Sentadilla/Prensa", matches: ["sentadilla", "prensa"] },
  { key: "dominadasRemo", label: "Dominadas/Remo", matches: ["dominadas", "remo", "jalón"] },
  { key: "rdlHipThrust", label: "RDL/Hip thrust", matches: ["rumano", "hip thrust"] }
] as const;

export async function GET() {
  const auth = await getAuthContext();
  if (!auth || !auth.profile) {
    return unauthorized();
  }

  const now = todayKey();
  const fourteenDaysAgo = addDays(now, -13);
  const weekAgo = addDays(now, -6);

  const [weightLogs, sessionsLast14, sessionsLast56, photos, recentAssignments] = await Promise.all([
    prisma.bodyWeightLog.findMany({
      where: { userId: auth.user.id },
      orderBy: { date: "asc" }
    }),
    prisma.workoutSession.findMany({
      where: {
        userId: auth.user.id,
        date: { gte: fromDateKey(fourteenDaysAgo), lte: fromDateKey(now) }
      },
      select: { date: true, status: true }
    }),
    prisma.workoutSession.findMany({
      where: {
        userId: auth.user.id,
        date: { gte: fromDateKey(addDays(now, -55)), lte: fromDateKey(now) }
      },
      include: {
        sets: {
          where: { completed: true },
          include: { exercise: true }
        }
      }
    }),
    prisma.progressPhoto.findMany({
      where: { userId: auth.user.id },
      orderBy: { date: "desc" },
      take: 12
    }),
    listAssignments(auth.user.id, fourteenDaysAgo, 14, (auth.profile.trainingDays === 6 ? 6 : 5) as 5 | 6)
  ]);

  const summary = summarizeDailyStatus(sessionsLast14);
  const dailyStatuses = recentAssignments
    .map((assignment) => {
      const key = toDateKey(assignment.date);
      const day = summary.get(key);
      return statusFromSessions({
        dateKey: key,
        todayDateKey: now,
        isRest: assignment.isRest,
        hasSessionDone: day?.done ?? false,
        hasSessionPartial: day?.partial ?? false
      });
    })
    .reverse();

  const beach = beachStats(auth.profile.beachGoalDate);

  const weekSets = sessionsLast56
    .filter((session) => toDateKey(session.date) >= weekAgo)
    .flatMap((session) => session.sets)
    .filter((set) => set.completed);

  const volumeByMuscle = weekSets.reduce<Record<string, number>>((acc, set) => {
    const group = set.exercise.muscleGroup;
    acc[group] = (acc[group] ?? 0) + 1;
    return acc;
  }, {});

  const allSets = sessionsLast56.flatMap((session) =>
    session.sets.map((set) => ({
      name: set.exercise.name.toLowerCase(),
      weightKg: set.weightKg ?? 0,
      reps: set.reps ?? 0,
      date: toDateKey(session.date)
    }))
  );

  const prs = PR_GROUPS.map((group) => {
    const match = allSets
      .filter((set) => group.matches.some((needle) => set.name.includes(needle)))
      .sort((a, b) => b.weightKg - a.weightKg || b.reps - a.reps)[0];

    return {
      key: group.key,
      label: group.label,
      value: match ? `${match.weightKg} kg x ${match.reps}` : "Sin registros",
      date: match?.date ?? null
    };
  });

  return NextResponse.json({
    beach,
    adherence: {
      streak: computeStreak(dailyStatuses),
      complianceLast2WeeksPct: compliancePercent(dailyStatuses)
    },
    weight: weightLogs.map((entry) => ({
      id: entry.id,
      date: toDateKey(entry.date),
      weightKg: entry.weightKg
    })),
    volumeByMuscle: Object.entries(volumeByMuscle)
      .map(([muscle, sets]) => ({ muscle, sets }))
      .sort((a, b) => b.sets - a.sets),
    prs,
    photos: photos.map((photo) => ({
      id: photo.id,
      date: toDateKey(photo.date),
      imageUrl: photo.imageUrl,
      privacyNote: photo.privacyNote
    }))
  });
}
