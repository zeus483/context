import { PlanType, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getActivePlanForUser } from "./workout";

type CustomExerciseInput = {
  exerciseId: string;
  sets: number;
  reps: string;
  restSeconds: number;
};

type CustomDayInput = {
  name: string;
  focus: string;
  cardioDefault: number;
  isOptional: boolean;
  exercises: CustomExerciseInput[];
};

export type CustomPlanInput = {
  id?: string;
  name: string;
  description?: string;
  days: CustomDayInput[];
};

function isLowerBodyDay(name: string, focus: string) {
  const probe = `${name} ${focus}`.toLowerCase();
  return ["pierna", "femoral", "glúte", "tren inferior"].some((word) => probe.includes(word));
}

function lowerBodyWarning(days: CustomDayInput[]) {
  const lowerDays = days.filter((day) => isLowerBodyDay(day.name, day.focus)).length;
  if (lowerDays > 2) {
    return `Advertencia: esta rutina tiene ${lowerDays} días de tren inferior.`;
  }
  return null;
}

async function ensureUniqueCustomPlanName(userId: string, baseName: string) {
  const existing = await prisma.customWorkoutPlan.findMany({
    where: {
      userId,
      name: {
        startsWith: baseName
      }
    },
    select: { name: true }
  });

  if (!existing.length) {
    return baseName;
  }

  const taken = new Set(existing.map((item) => item.name));
  if (!taken.has(baseName)) {
    return baseName;
  }

  for (let i = 2; i < 100; i += 1) {
    const candidate = `${baseName} (${i})`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }

  return `${baseName} (${Date.now()})`;
}

async function replaceCustomPlanStructure(tx: Prisma.TransactionClient, planId: string, days: CustomDayInput[]) {
  await tx.customWorkoutExercise.deleteMany({
    where: {
      day: {
        planId
      }
    }
  });

  await tx.customWorkoutDay.deleteMany({ where: { planId } });

  for (const [dayIndex, day] of days.entries()) {
    const createdDay = await tx.customWorkoutDay.create({
      data: {
        planId,
        order: dayIndex + 1,
        name: day.name,
        focus: day.focus,
        cardioDefault: day.cardioDefault,
        isOptional: day.isOptional
      }
    });

    for (const [exerciseIndex, exercise] of day.exercises.entries()) {
      await tx.customWorkoutExercise.create({
        data: {
          dayId: createdDay.id,
          order: exerciseIndex + 1,
          exerciseId: exercise.exerciseId,
          sets: exercise.sets,
          reps: exercise.reps,
          restSeconds: exercise.restSeconds
        }
      });
    }
  }
}

export async function listPlanCatalog(userId: string) {
  const [profile, basePlans, customPlans, activePlan] = await Promise.all([
    prisma.profile.findUniqueOrThrow({ where: { userId } }),
    prisma.workoutPlan.findMany({
      where: { isActive: true },
      include: {
        workoutDays: {
          orderBy: { dayNumber: "asc" },
          select: {
            id: true,
            dayNumber: true,
            title: true,
            focus: true,
            cardioDefault: true,
            isOptional: true
          }
        }
      },
      orderBy: [{ kind: "asc" }, { name: "asc" }]
    }),
    prisma.customWorkoutPlan.findMany({
      where: { userId },
      include: {
        customWorkoutDays: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            name: true,
            focus: true,
            cardioDefault: true,
            isOptional: true
          }
        }
      },
      orderBy: [{ isArchived: "asc" }, { updatedAt: "desc" }]
    }),
    getActivePlanForUser(userId)
  ]);

  return {
    activePlanType: profile.activePlanType,
    activeBasePlanId: profile.activeBasePlanId,
    activeCustomPlanId: profile.activeCustomPlanId,
    activePlan,
    basePlans: basePlans.map((plan) => ({
      id: plan.id,
      code: plan.code,
      kind: plan.kind,
      name: plan.name,
      description: plan.description,
      isActive: profile.activePlanType === "BASE" && profile.activeBasePlanId === plan.id,
      days: plan.workoutDays.map((day) => ({
        id: day.id,
        order: day.dayNumber,
        title: day.title,
        focus: day.focus,
        cardioDefault: day.cardioDefault,
        isOptional: day.isOptional
      }))
    })),
    customPlans: customPlans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      isArchived: plan.isArchived,
      isActive: profile.activePlanType === "CUSTOM" && profile.activeCustomPlanId === plan.id,
      warning: lowerBodyWarning(
        plan.customWorkoutDays.map((day) => ({
          name: day.name,
          focus: day.focus,
          cardioDefault: day.cardioDefault,
          isOptional: day.isOptional,
          exercises: []
        }))
      ),
      days: plan.customWorkoutDays.map((day) => ({
        id: day.id,
        order: day.order,
        title: day.name,
        focus: day.focus,
        cardioDefault: day.cardioDefault,
        isOptional: day.isOptional
      }))
    }))
  };
}

export async function switchActivePlan(userId: string, input: { planType: PlanType; planId: string }) {
  if (input.planType === "BASE") {
    const basePlan = await prisma.workoutPlan.findFirst({
      where: {
        id: input.planId,
        isActive: true
      }
    });

    if (!basePlan) {
      throw new Error("Plan base no encontrado");
    }

    await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { userId },
        data: {
          activePlanType: "BASE",
          activeBasePlanId: basePlan.id,
          activeCustomPlanId: null
        }
      });

      await tx.customWorkoutPlan.updateMany({
        where: { userId },
        data: { isActive: false }
      });
    });

    return getActivePlanForUser(userId);
  }

  const customPlan = await prisma.customWorkoutPlan.findFirst({
    where: {
      id: input.planId,
      userId,
      isArchived: false
    }
  });

  if (!customPlan) {
    throw new Error("Plan personalizado no encontrado");
  }

  await prisma.$transaction(async (tx) => {
    await tx.customWorkoutPlan.updateMany({
      where: { userId },
      data: { isActive: false }
    });

    await tx.customWorkoutPlan.update({
      where: { id: customPlan.id },
      data: { isActive: true }
    });

    await tx.profile.update({
      where: { userId },
      data: {
        activePlanType: "CUSTOM",
        activeCustomPlanId: customPlan.id
      }
    });
  });

  return getActivePlanForUser(userId);
}

export async function duplicatePlanToCustom(userId: string, params: { sourcePlanType: PlanType; sourcePlanId: string; name?: string }) {
  const defaultName = params.sourcePlanType === "BASE" ? "Copia de plan base" : "Copia de mi plan";
  const requestedName = params.name?.trim() || defaultName;
  const finalName = await ensureUniqueCustomPlanName(userId, requestedName);

  const duplicate = await prisma.$transaction(async (tx) => {
    const newPlan = await tx.customWorkoutPlan.create({
      data: {
        userId,
        name: finalName,
        description: "Duplicado para personalizar",
        isArchived: false,
        isActive: false
      }
    });

    if (params.sourcePlanType === "BASE") {
      const source = await tx.workoutPlan.findFirst({
        where: { id: params.sourcePlanId, isActive: true },
        include: {
          workoutDays: {
            orderBy: { dayNumber: "asc" },
            include: {
              dayExercises: {
                orderBy: { order: "asc" }
              }
            }
          }
        }
      });

      if (!source) {
        throw new Error("Plan base origen no encontrado");
      }

      for (const day of source.workoutDays) {
        const createdDay = await tx.customWorkoutDay.create({
          data: {
            planId: newPlan.id,
            order: day.dayNumber,
            name: day.title,
            focus: day.focus,
            cardioDefault: day.cardioDefault,
            isOptional: day.isOptional
          }
        });

        for (const [index, exercise] of day.dayExercises.entries()) {
          await tx.customWorkoutExercise.create({
            data: {
              dayId: createdDay.id,
              order: index + 1,
              exerciseId: exercise.exerciseId,
              sets: exercise.suggestedSets,
              reps: exercise.suggestedReps,
              restSeconds: exercise.suggestedRestSec
            }
          });
        }
      }

      return newPlan;
    }

    const source = await tx.customWorkoutPlan.findFirst({
      where: { id: params.sourcePlanId, userId },
      include: {
        customWorkoutDays: {
          orderBy: { order: "asc" },
          include: {
            customWorkoutExercises: {
              orderBy: { order: "asc" }
            }
          }
        }
      }
    });

    if (!source) {
      throw new Error("Plan personalizado origen no encontrado");
    }

    for (const day of source.customWorkoutDays) {
      const createdDay = await tx.customWorkoutDay.create({
        data: {
          planId: newPlan.id,
          order: day.order,
          name: day.name,
          focus: day.focus,
          cardioDefault: day.cardioDefault,
          isOptional: day.isOptional
        }
      });

      for (const [index, exercise] of day.customWorkoutExercises.entries()) {
        await tx.customWorkoutExercise.create({
          data: {
            dayId: createdDay.id,
            order: index + 1,
            exerciseId: exercise.exerciseId,
            sets: exercise.sets,
            reps: exercise.reps,
            restSeconds: exercise.restSeconds
          }
        });
      }
    }

    return newPlan;
  });

  return {
    planId: duplicate.id,
    name: duplicate.name
  };
}

export async function getCustomPlan(userId: string, planId: string) {
  const plan = await prisma.customWorkoutPlan.findFirst({
    where: { id: planId, userId },
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

  if (!plan) {
    return null;
  }

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    isActive: plan.isActive,
    isArchived: plan.isArchived,
    warning: lowerBodyWarning(
      plan.customWorkoutDays.map((day) => ({
        name: day.name,
        focus: day.focus,
        cardioDefault: day.cardioDefault,
        isOptional: day.isOptional,
        exercises: day.customWorkoutExercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          sets: exercise.sets,
          reps: exercise.reps,
          restSeconds: exercise.restSeconds
        }))
      }))
    ),
    days: plan.customWorkoutDays.map((day) => ({
      id: day.id,
      order: day.order,
      name: day.name,
      focus: day.focus,
      cardioDefault: day.cardioDefault,
      isOptional: day.isOptional,
      exercises: day.customWorkoutExercises.map((exercise) => ({
        id: exercise.id,
        order: exercise.order,
        exerciseId: exercise.exerciseId,
        name: exercise.exercise.name,
        muscleGroup: exercise.exercise.muscleGroup,
        equipment: exercise.exercise.equipment,
        sets: exercise.sets,
        reps: exercise.reps,
        restSeconds: exercise.restSeconds
      }))
    }))
  };
}

export async function upsertCustomPlan(userId: string, input: CustomPlanInput) {
  if (!input.days.length) {
    throw new Error("Debes incluir al menos 1 día");
  }

  for (const day of input.days) {
    if (!day.exercises.length) {
      throw new Error(`El día ${day.name} debe tener al menos 1 ejercicio`);
    }
  }

  const warning = lowerBodyWarning(input.days);

  const existingExerciseIds = await prisma.exercise.findMany({
    where: {
      id: {
        in: input.days.flatMap((day) => day.exercises.map((exercise) => exercise.exerciseId))
      }
    },
    select: { id: true }
  });

  const validIds = new Set(existingExerciseIds.map((item) => item.id));
  for (const day of input.days) {
    for (const exercise of day.exercises) {
      if (!validIds.has(exercise.exerciseId)) {
        throw new Error("Uno o más ejercicios no existen en biblioteca");
      }
    }
  }

  if (!input.id) {
    const finalName = await ensureUniqueCustomPlanName(userId, input.name.trim());

    const created = await prisma.$transaction(async (tx) => {
      const plan = await tx.customWorkoutPlan.create({
        data: {
          userId,
          name: finalName,
          description: input.description?.trim() || null,
          isArchived: false,
          isActive: false
        }
      });

      await replaceCustomPlanStructure(tx, plan.id, input.days);
      return plan;
    });

    return { planId: created.id, warning, versionedFromPlanId: null };
  }

  const existing = await prisma.customWorkoutPlan.findFirst({
    where: { id: input.id, userId },
    include: {
      sessions: {
        select: { id: true },
        take: 1
      }
    }
  });

  if (!existing) {
    throw new Error("Plan personalizado no encontrado");
  }

  if (existing.sessions.length) {
    const versionedName = await ensureUniqueCustomPlanName(userId, `${input.name.trim()} v2`);

    const replacement = await prisma.$transaction(async (tx) => {
      const newPlan = await tx.customWorkoutPlan.create({
        data: {
          userId,
          name: versionedName,
          description: input.description?.trim() || null,
          isArchived: false,
          isActive: true
        }
      });

      await replaceCustomPlanStructure(tx, newPlan.id, input.days);

      await tx.customWorkoutPlan.update({
        where: { id: existing.id },
        data: {
          isActive: false,
          isArchived: true
        }
      });

      await tx.profile.update({
        where: { userId },
        data: {
          activePlanType: "CUSTOM",
          activeCustomPlanId: newPlan.id
        }
      });

      return newPlan;
    });

    return {
      planId: replacement.id,
      warning,
      versionedFromPlanId: existing.id
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.customWorkoutPlan.update({
      where: { id: existing.id },
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null
      }
    });

    await replaceCustomPlanStructure(tx, existing.id, input.days);
  });

  return { planId: existing.id, warning, versionedFromPlanId: null };
}

export async function deleteOrArchiveCustomPlan(userId: string, planId: string) {
  const plan = await prisma.customWorkoutPlan.findFirst({
    where: { id: planId, userId },
    include: {
      sessions: {
        select: { id: true },
        take: 1
      }
    }
  });

  if (!plan) {
    throw new Error("Plan personalizado no encontrado");
  }

  if (!plan.sessions.length) {
    await prisma.customWorkoutPlan.delete({ where: { id: plan.id } });

    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (profile?.activeCustomPlanId === plan.id) {
      const fallbackBase = await prisma.workoutPlan.findFirst({
        where: { isActive: true },
        orderBy: [{ kind: "asc" }, { name: "asc" }]
      });

      await prisma.profile.update({
        where: { userId },
        data: {
          activePlanType: "BASE",
          activeBasePlanId: fallbackBase?.id ?? null,
          activeCustomPlanId: null
        }
      });
    }

    return { archived: false, deleted: true };
  }

  await prisma.$transaction(async (tx) => {
    await tx.customWorkoutPlan.update({
      where: { id: plan.id },
      data: {
        isArchived: true,
        isActive: false
      }
    });

    const profile = await tx.profile.findUnique({ where: { userId } });
    if (profile?.activeCustomPlanId === plan.id) {
      const fallbackBase = await tx.workoutPlan.findFirst({
        where: { isActive: true },
        orderBy: [{ kind: "asc" }, { name: "asc" }]
      });

      await tx.profile.update({
        where: { userId },
        data: {
          activePlanType: "BASE",
          activeBasePlanId: fallbackBase?.id ?? null,
          activeCustomPlanId: null
        }
      });
    }
  });

  return { archived: true, deleted: false };
}
