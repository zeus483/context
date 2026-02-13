import { Prisma, QuestType, SessionStatus } from "@prisma/client";
import { addDays, fromDateKey, mondayOf, monthBoundsFromDate, toDateKey, todayKey, weekBounds } from "./dates";
import { prisma } from "./prisma";

type TxClient = Prisma.TransactionClient;

type SessionWithDetails = Prisma.WorkoutSessionGetPayload<{
  include: {
    cardioEntry: true;
    sets: { include: { exercise: true } };
    workoutDay: true;
    customWorkoutDay: true;
  };
}>;

type QuestCard = {
  id: string;
  name: string;
  type: QuestType;
  description: string;
  xpReward: number;
  progress: number;
  target: number;
  completed: boolean;
};

export type GamificationSnapshot = {
  xpTotal: number;
  level: number;
  xpInLevel: number;
  nextLevelXp: number;
  levelProgressPct: number;
  streakCount: number;
  currentTitle: string;
  xpDelta: number;
  quests: {
    daily: QuestCard[];
    weekly: QuestCard[];
    monthly: QuestCard[];
    featured: QuestCard[];
  };
  unlockedTitles: string[];
  unlockedBadges: {
    name: string;
    description: string;
    iconKey: string;
    unlockedAt: string;
  }[];
};

type EvalContext = {
  sessions: SessionWithDetails[];
  weightLogs: { date: Date }[];
  checkins: { weekStartDate: Date }[];
};

type WeekCounts = {
  weekCounts: Map<string, number>;
  weekWith80Plus: number;
  hasWeekWith5: boolean;
  weeklyBonusXp: number;
};

function trainingStatus(status: SessionStatus) {
  return status === "DONE" || status === "PARTIAL";
}

function sessionCompletionRatio(session: SessionWithDetails) {
  if (!session.sets.length) {
    return 0;
  }

  const done = session.sets.filter((set) => set.completed).length;
  return done / session.sets.length;
}

function isSessionCompletedForXp(session: SessionWithDetails) {
  if (session.status === "DONE") {
    return true;
  }
  return sessionCompletionRatio(session) >= 0.8;
}

function xpForNextLevel(level: number) {
  return 250 + level * 75;
}

function levelFromXp(xpTotal: number) {
  let level = 1;
  let inLevelXp = xpTotal;
  let next = xpForNextLevel(level);

  while (inLevelXp >= next) {
    inLevelXp -= next;
    level += 1;
    next = xpForNextLevel(level);
  }

  return {
    level,
    xpInLevel: inLevelXp,
    nextLevelXp: next,
    levelProgressPct: Math.round((inLevelXp / Math.max(1, next)) * 100)
  };
}

function streakFromSessions(sessions: SessionWithDetails[]) {
  const trainingDays = Array.from(
    new Set(
      sessions
        .filter((session) => trainingStatus(session.status))
        .map((session) => toDateKey(session.date))
    )
  ).sort();

  if (!trainingDays.length) {
    return 0;
  }

  let current = trainingDays[trainingDays.length - 1];
  let streak = 1;

  while (trainingDays.includes(addDays(current, -1))) {
    current = addDays(current, -1);
    streak += 1;
  }

  return streak;
}

function longestCheckinStreak(checkins: { weekStartDate: Date }[]) {
  if (!checkins.length) {
    return 0;
  }

  const sorted = checkins
    .map((item) => toDateKey(item.weekStartDate))
    .sort();

  let longest = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === addDays(sorted[i - 1], 7)) {
      current += 1;
      longest = Math.max(longest, current);
      continue;
    }

    current = 1;
  }

  return longest;
}

function computeWeekCounts(sessions: SessionWithDetails[]): WeekCounts {
  const weekCounts = new Map<string, number>();

  for (const session of sessions) {
    if (!trainingStatus(session.status)) {
      continue;
    }

    const weekStart = mondayOf(toDateKey(session.date));
    weekCounts.set(weekStart, (weekCounts.get(weekStart) ?? 0) + 1);
  }

  let weeklyBonusXp = 0;
  let weekWith80Plus = 0;
  let hasWeekWith5 = false;

  for (const count of weekCounts.values()) {
    if (count >= 5) {
      weeklyBonusXp += 180;
      hasWeekWith5 = true;
    } else if (count >= 3) {
      weeklyBonusXp += 100;
    }

    if (count >= 4) {
      weekWith80Plus += 1;
    }
  }

  return {
    weekCounts,
    weekWith80Plus,
    hasWeekWith5,
    weeklyBonusXp
  };
}

function periodForQuest(type: QuestType) {
  const anchor = todayKey();

  if (type === "DAILY") {
    return { startKey: anchor, endKey: anchor };
  }

  if (type === "WEEKLY") {
    return weekBounds(anchor);
  }

  return monthBoundsFromDate(anchor);
}

function keyInRange(key: string, startKey: string, endKey: string) {
  return key >= startKey && key <= endKey;
}

function sessionLabel(session: SessionWithDetails) {
  const base = session.workoutDay?.title ?? "";
  const custom = session.customWorkoutDay?.name ?? "";
  return `${base} ${custom}`.toLowerCase();
}

function numericCriteria(criteria: Prisma.JsonValue, field: string, fallback: number) {
  if (!criteria || typeof criteria !== "object" || Array.isArray(criteria)) {
    return fallback;
  }

  const value = (criteria as Record<string, unknown>)[field];
  if (typeof value === "number") {
    return value;
  }
  return fallback;
}

function stringCriteria(criteria: Prisma.JsonValue, field: string, fallback = "") {
  if (!criteria || typeof criteria !== "object" || Array.isArray(criteria)) {
    return fallback;
  }

  const value = (criteria as Record<string, unknown>)[field];
  if (typeof value === "string") {
    return value;
  }
  return fallback;
}

function evaluateQuestProgress(
  quest: {
    type: QuestType;
    criteriaJson: Prisma.JsonValue;
  },
  context: EvalContext
) {
  const { startKey, endKey } = periodForQuest(quest.type);
  const metric = stringCriteria(quest.criteriaJson, "metric");
  const filter = stringCriteria(quest.criteriaJson, "filter");
  const target = Math.max(1, numericCriteria(quest.criteriaJson, "target", 1));

  const sessionsInPeriod = context.sessions.filter((session) => {
    const key = toDateKey(session.date);
    return keyInRange(key, startKey, endKey) && trainingStatus(session.status);
  });

  const checkinsInPeriod = context.checkins.filter((item) => {
    const key = toDateKey(item.weekStartDate);
    return keyInRange(key, startKey, endKey);
  });

  const weightInPeriod = context.weightLogs.filter((item) => {
    const key = toDateKey(item.date);
    return keyInRange(key, startKey, endKey);
  });

  if (metric === "sessions") {
    if (filter === "chest") {
      const chestSessions = sessionsInPeriod.filter((session) => sessionLabel(session).includes("pecho"));
      return { progress: chestSessions.length, target, startKey, endKey };
    }

    return { progress: sessionsInPeriod.length, target, startKey, endKey };
  }

  if (metric === "cardio_minutes") {
    const minutes = sessionsInPeriod.reduce((total, session) => total + (session.cardioEntry?.minutes ?? 0), 0);
    return { progress: minutes, target, startKey, endKey };
  }

  if (metric === "weight_logs") {
    const uniqueDays = new Set(weightInPeriod.map((item) => toDateKey(item.date)));
    return { progress: uniqueDays.size, target, startKey, endKey };
  }

  if (metric === "checkin") {
    return { progress: checkinsInPeriod.length, target, startKey, endKey };
  }

  if (metric === "pr") {
    const pattern = stringCriteria(quest.criteriaJson, "exerciseIncludes").toLowerCase();
    const currentSets = context.sessions
      .flatMap((session) =>
        session.sets.map((set) => ({
          date: toDateKey(session.date),
          weightKg: set.weightKg ?? 0,
          exerciseName: set.exercise.name.toLowerCase()
        }))
      )
      .filter((item) => item.exerciseName.includes(pattern));

    const currentMax = currentSets
      .filter((item) => keyInRange(item.date, startKey, endKey))
      .reduce((max, item) => Math.max(max, item.weightKg), 0);

    const previousMax = currentSets
      .filter((item) => item.date < startKey)
      .reduce((max, item) => Math.max(max, item.weightKg), 0);

    const progress = currentMax > previousMax && currentMax > 0 ? 1 : 0;
    return { progress, target, startKey, endKey };
  }

  return { progress: 0, target, startKey, endKey };
}

async function syncQuestProgress(tx: TxClient, userId: string, context: EvalContext) {
  const quests = await tx.quest.findMany({ where: { isActive: true }, orderBy: [{ type: "asc" }, { name: "asc" }] });

  const questCards: QuestCard[] = [];

  for (const quest of quests) {
    const evalResult = evaluateQuestProgress(quest, context);
    const completed = evalResult.progress >= evalResult.target;
    const periodStartDate = fromDateKey(evalResult.startKey);
    const periodEndDate = fromDateKey(evalResult.endKey);

    const existing = await tx.userQuestProgress.findUnique({
      where: {
        userId_questId_periodStartDate: {
          userId,
          questId: quest.id,
          periodStartDate
        }
      }
    });

    const completedAt = completed ? existing?.completedAt ?? new Date() : null;

    await tx.userQuestProgress.upsert({
      where: {
        userId_questId_periodStartDate: {
          userId,
          questId: quest.id,
          periodStartDate
        }
      },
      update: {
        periodEndDate,
        progress: evalResult.progress,
        completedAt
      },
      create: {
        userId,
        questId: quest.id,
        periodStartDate,
        periodEndDate,
        progress: evalResult.progress,
        completedAt
      }
    });

    if (quest.type === "DAILY" || quest.type === "WEEKLY" || quest.type === "MONTHLY") {
      questCards.push({
        id: quest.id,
        name: quest.name,
        type: quest.type,
        description: quest.description,
        xpReward: quest.xpReward,
        progress: evalResult.progress,
        target: evalResult.target,
        completed
      });
    }
  }

  const completedQuestRows = await tx.userQuestProgress.findMany({
    where: {
      userId,
      completedAt: { not: null }
    },
    include: {
      quest: true
    }
  });

  const questXp = completedQuestRows.reduce((sum, row) => sum + row.quest.xpReward, 0);

  return {
    questXp,
    quests: {
      daily: questCards.filter((quest) => quest.type === "DAILY").slice(0, 3),
      weekly: questCards.filter((quest) => quest.type === "WEEKLY").slice(0, 4),
      monthly: questCards.filter((quest) => quest.type === "MONTHLY").slice(0, 3)
    }
  };
}

async function unlockTitlesAndBadges(params: {
  tx: TxClient;
  userId: string;
  level: number;
  streakCount: number;
  weekWith80Plus: number;
  beachCompleted: boolean;
  checkinStreak: number;
  hasWeekWith5: boolean;
}) {
  const { tx, userId, level, streakCount, weekWith80Plus, beachCompleted, checkinStreak, hasWeekWith5 } = params;

  const [titles, badges] = await Promise.all([
    tx.title.findMany({ orderBy: { unlockValue: "asc" } }),
    tx.badge.findMany({ orderBy: { name: "asc" } })
  ]);

  const unlockedTitleIds = new Set<string>();

  const achievementUnlocks: Record<string, boolean> = {
    Imparable: streakCount >= 7,
    "Pulso de Hierro": weekWith80Plus >= 4,
    "No Falla": beachCompleted,
    Disciplina: checkinStreak >= 6
  };

  for (const title of titles) {
    const unlocked =
      title.unlockType === "LEVEL"
        ? level >= title.unlockValue
        : Boolean(achievementUnlocks[title.name]);

    if (!unlocked) {
      continue;
    }

    unlockedTitleIds.add(title.id);

    await tx.userTitle.upsert({
      where: { userId_titleId: { userId, titleId: title.id } },
      update: {},
      create: {
        userId,
        titleId: title.id
      }
    });
  }

  const badgeUnlocks: Record<string, boolean> = {
    "7 días seguidos": streakCount >= 7,
    "4 semanas 80%+": weekWith80Plus >= 4,
    "Semana de 5 entrenos": hasWeekWith5,
    "Plan playa completado": beachCompleted,
    "Check-in maestro": checkinStreak >= 6
  };

  for (const badge of badges) {
    if (!badgeUnlocks[badge.name]) {
      continue;
    }

    await tx.userBadge.upsert({
      where: {
        userId_badgeId: {
          userId,
          badgeId: badge.id
        }
      },
      update: {},
      create: {
        userId,
        badgeId: badge.id
      }
    });
  }

  return { unlockedTitleIds };
}

function buildFeaturedQuests(quests: { daily: QuestCard[]; weekly: QuestCard[]; monthly: QuestCard[] }) {
  const all = [...quests.daily, ...quests.weekly, ...quests.monthly];

  return all
    .sort((a, b) => {
      const aPct = a.target ? a.progress / a.target : 0;
      const bPct = b.target ? b.progress / b.target : 0;
      return bPct - aPct;
    })
    .slice(0, 3);
}

export async function refreshGamification(userId: string) {
  return prismaTransaction(async (tx) => {
    const [sessions, weightLogs, checkins, currentStats, beachPlans] = await Promise.all([
      tx.workoutSession.findMany({
        where: { userId },
        include: {
          cardioEntry: true,
          sets: {
            include: { exercise: true }
          },
          workoutDay: true,
          customWorkoutDay: true
        },
        orderBy: { date: "asc" }
      }),
      tx.bodyWeightLog.findMany({
        where: { userId },
        orderBy: { date: "asc" },
        select: { date: true }
      }),
      tx.weeklyCheckin.findMany({
        where: { userId },
        orderBy: { weekStartDate: "asc" },
        select: { weekStartDate: true }
      }),
      tx.userStats.findUnique({ where: { userId } }),
      tx.workoutPlan.findMany({ where: { kind: "BEACH" }, select: { id: true } })
    ]);

    const completedSessions = sessions.filter((session) => isSessionCompletedForXp(session));
    const cardioSessions = sessions.filter((session) => (session.cardioEntry?.minutes ?? 0) >= 10);
    const uniqueWeightDays = new Set(weightLogs.map((row) => toDateKey(row.date)));
    const streakCount = streakFromSessions(sessions);
    const streakXp = Math.min(7, streakCount) * 10;

    const { weekCounts, weekWith80Plus, hasWeekWith5, weeklyBonusXp } = computeWeekCounts(sessions);

    const baseXp =
      completedSessions.length * 120 +
      cardioSessions.length * 40 +
      uniqueWeightDays.size * 20 +
      checkins.length * 60 +
      streakXp +
      weeklyBonusXp;

    const context: EvalContext = {
      sessions,
      weightLogs,
      checkins
    };

    const questState = await syncQuestProgress(tx, userId, context);
    const totalXp = baseXp + questState.questXp;

    const levelState = levelFromXp(totalXp);
    const checkinStreak = longestCheckinStreak(checkins);

    const beachPlanIds = new Set(beachPlans.map((plan) => plan.id));
    const beachWeeks = new Set<string>();

    for (const session of sessions) {
      if (!trainingStatus(session.status)) {
        continue;
      }
      if (!session.basePlanId || !beachPlanIds.has(session.basePlanId)) {
        continue;
      }
      beachWeeks.add(mondayOf(toDateKey(session.date)));
    }

    const beachCompleted = beachWeeks.size >= 8;

    const unlocks = await unlockTitlesAndBadges({
      tx,
      userId,
      level: levelState.level,
      streakCount,
      weekWith80Plus,
      beachCompleted,
      checkinStreak,
      hasWeekWith5
    });

    const unlockedTitles = await tx.userTitle.findMany({
      where: { userId },
      include: { title: true },
      orderBy: { unlockedAt: "asc" }
    });

    const validCurrentTitle = currentStats?.currentTitleId && unlocks.unlockedTitleIds.has(currentStats.currentTitleId);
    let currentTitleId = validCurrentTitle ? currentStats.currentTitleId : null;

    if (!currentTitleId) {
      const highestLevelTitle = unlockedTitles
        .filter((entry) => entry.title.unlockType === "LEVEL")
        .sort((a, b) => b.title.unlockValue - a.title.unlockValue)[0];
      currentTitleId = highestLevelTitle?.titleId ?? unlockedTitles[0]?.titleId ?? null;
    }

    const statsRow = await tx.userStats.upsert({
      where: { userId },
      update: {
        xpTotal: totalXp,
        level: levelState.level,
        streakCount,
        currentTitleId
      },
      create: {
        userId,
        xpTotal: totalXp,
        level: levelState.level,
        streakCount,
        currentTitleId
      },
      include: { currentTitle: true }
    });

    const unlockedBadges = await tx.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { unlockedAt: "desc" }
    });

    const xpDelta = totalXp - (currentStats?.xpTotal ?? 0);
    const quests = {
      ...questState.quests,
      featured: buildFeaturedQuests(questState.quests)
    };

    return {
      xpTotal: statsRow.xpTotal,
      level: statsRow.level,
      xpInLevel: levelState.xpInLevel,
      nextLevelXp: levelState.nextLevelXp,
      levelProgressPct: levelState.levelProgressPct,
      streakCount: statsRow.streakCount,
      currentTitle: statsRow.currentTitle?.name ?? "Recluta",
      xpDelta,
      quests,
      unlockedTitles: unlockedTitles.map((item) => item.title.name),
      unlockedBadges: unlockedBadges.map((item) => ({
        name: item.badge.name,
        description: item.badge.description,
        iconKey: item.badge.iconKey,
        unlockedAt: item.unlockedAt.toISOString()
      }))
    } satisfies GamificationSnapshot;
  });
}

function recommendationMessage(params: {
  canIncrease: boolean;
  compoundIncreasePct: number;
  accessoryIncreasePct: number;
  effortScore: number;
  fatigueFlag: boolean;
  sessionsCount: number;
  liftHints: string[];
}) {
  const { canIncrease, compoundIncreasePct, accessoryIncreasePct, effortScore, fatigueFlag, sessionsCount, liftHints } = params;

  if (sessionsCount < 3) {
    return "Entrenaste menos de 3 días esta semana. Prioriza consistencia antes de subir cargas.";
  }

  if (fatigueFlag) {
    return "Marcaste fatiga alta. Mantén o baja carga (deload suave), cuida técnica, sueño y recuperación.";
  }

  if (!canIncrease && effortScore === 10) {
    return "Esfuerzo máximo detectado: aplica deload (-5%) y enfoca la semana en técnica y recuperación.";
  }

  const base = `Sugerencia semanal: compuestos ${compoundIncreasePct >= 0 ? "+" : ""}${compoundIncreasePct}% y aislados ${accessoryIncreasePct >= 0 ? "+" : ""}${accessoryIncreasePct}%`;

  if (!liftHints.length) {
    return `${base}.`;
  }

  return `${base}. ${liftHints.join(" · ")}`;
}

async function buildLiftHints(tx: TxClient, userId: string, compoundIncreasePct: number) {
  const targetExercises = [
    { includes: "press banca", label: "Press banca" },
    { includes: "press inclinado", label: "Press inclinado" },
    { includes: "sentadilla", label: "Sentadilla" },
    { includes: "prensa", label: "Prensa" },
    { includes: "remo", label: "Remo" },
    { includes: "rumano", label: "RDL" },
    { includes: "hip thrust", label: "Hip thrust" }
  ] as const;

  const recentSets = await tx.exerciseSet.findMany({
    where: {
      completed: true,
      workoutSession: { userId }
    },
    include: {
      exercise: true,
      workoutSession: true
    },
    orderBy: [{ workoutSession: { date: "desc" } }],
    take: 300
  });

  const hints: string[] = [];

  for (const target of targetExercises) {
    const set = recentSets.find((item) => item.exercise.name.toLowerCase().includes(target.includes) && (item.weightKg ?? 0) > 0);
    if (!set || set.weightKg == null) {
      continue;
    }

    const nextLoad = Math.max(0, Math.round(set.weightKg * (1 + compoundIncreasePct / 100)));
    hints.push(`${target.label}: ${Math.round(set.weightKg)} kg -> ${nextLoad} kg aprox`);

    if (hints.length >= 2) {
      break;
    }
  }

  return hints;
}

export async function upsertWeeklyRecommendation(userId: string, weekStartKey: string) {
  return prismaTransaction(async (tx) => {
    const startKey = weekStartKey;
    const endKey = addDays(startKey, 6);

    const [checkin, sessions] = await Promise.all([
      tx.weeklyCheckin.findUnique({
        where: {
          userId_weekStartDate: {
            userId,
            weekStartDate: fromDateKey(startKey)
          }
        }
      }),
      tx.workoutSession.findMany({
        where: {
          userId,
          date: {
            gte: fromDateKey(startKey),
            lte: fromDateKey(endKey)
          },
          status: {
            in: ["DONE", "PARTIAL"]
          }
        }
      })
    ]);

    if (!checkin) {
      return null;
    }

    const sessionsCount = sessions.length;
    let compoundIncreasePct = 0;
    let accessoryIncreasePct = 0;

    if (sessionsCount < 3 || checkin.fatigueFlag) {
      compoundIncreasePct = 0;
      accessoryIncreasePct = 0;
    } else if (checkin.effortScore <= 3) {
      compoundIncreasePct = 5;
      accessoryIncreasePct = 2.5;
    } else if (checkin.effortScore <= 6) {
      compoundIncreasePct = 2.5;
      accessoryIncreasePct = 2.5;
    } else if (checkin.effortScore <= 8) {
      compoundIncreasePct = 1.5;
      accessoryIncreasePct = 0;
    } else if (checkin.effortScore === 9) {
      compoundIncreasePct = 0;
      accessoryIncreasePct = 0;
    } else {
      compoundIncreasePct = -5;
      accessoryIncreasePct = -5;
    }

    compoundIncreasePct = Math.min(5, compoundIncreasePct);
    const liftHints = await buildLiftHints(tx, userId, compoundIncreasePct);

    const message = recommendationMessage({
      canIncrease: compoundIncreasePct > 0,
      compoundIncreasePct,
      accessoryIncreasePct,
      effortScore: checkin.effortScore,
      fatigueFlag: checkin.fatigueFlag,
      sessionsCount,
      liftHints
    });

    return tx.weeklyRecommendation.upsert({
      where: {
        userId_weekStartDate: {
          userId,
          weekStartDate: fromDateKey(startKey)
        }
      },
      update: {
        compoundIncreasePct,
        accessoryIncreasePct,
        message
      },
      create: {
        userId,
        weekStartDate: fromDateKey(startKey),
        compoundIncreasePct,
        accessoryIncreasePct,
        message
      }
    });
  });
}

export async function getWeeklyState(userId: string, dateKey = todayKey()) {
  const { startKey, endKey } = weekBounds(dateKey);
  const prevWeekStart = addDays(startKey, -7);
  const prevWeekEnd = addDays(startKey, -1);

  const [checkin, previousCheckin, recommendation] = await Promise.all([
    prisma.weeklyCheckin.findUnique({
      where: {
        userId_weekStartDate: {
          userId,
          weekStartDate: fromDateKey(startKey)
        }
      }
    }),
    prisma.weeklyCheckin.findUnique({
      where: {
        userId_weekStartDate: {
          userId,
          weekStartDate: fromDateKey(prevWeekStart)
        }
      }
    }),
    prisma.weeklyRecommendation.findUnique({
      where: {
        userId_weekStartDate: {
          userId,
          weekStartDate: fromDateKey(startKey)
        }
      }
    })
  ]);

  return {
    startKey,
    endKey,
    pendingCurrentWeek: !checkin,
    pendingPreviousWeek: !previousCheckin,
    previousWeekStart: prevWeekStart,
    previousWeekEnd: prevWeekEnd,
    checkin,
    recommendation
  };
}

export async function ensureRecentRecommendation(userId: string) {
  const week = await getWeeklyState(userId);
  if (week.recommendation) {
    return week.recommendation;
  }

  if (week.checkin) {
    return upsertWeeklyRecommendation(userId, week.startKey);
  }

  return prisma.weeklyRecommendation.findFirst({
    where: { userId },
    orderBy: { weekStartDate: "desc" }
  });
}

function prismaTransaction<T>(callback: (tx: TxClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => callback(tx));
}
