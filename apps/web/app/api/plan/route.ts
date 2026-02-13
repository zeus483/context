import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth";
import { unauthorized, zodToResponse } from "../../../lib/http";
import { listPlanCatalog, duplicatePlanToCustom, switchActivePlan } from "../../../lib/plans";
import { planActionSchema } from "../../../lib/validation";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  const catalog = await listPlanCatalog(auth.user.id);
  const active = catalog.activePlan;

  return NextResponse.json({
    id: active.planId,
    planType: active.planType,
    kind: active.kind,
    name: active.planName,
    description:
      catalog.basePlans.find((plan) => plan.id === active.planId)?.description ??
      catalog.customPlans.find((plan) => plan.id === active.planId)?.description ??
      null,
    days: active.days.map((day) => ({
      id: day.id,
      dayNumber: day.order,
      title: day.title,
      focus: day.focus,
      optional: day.isOptional,
      cardioDefault: day.cardioDefault,
      exercises: day.exercises.map((entry) => ({
        id: entry.exerciseId,
        name: entry.name,
        muscleGroup: entry.muscleGroup,
        equipment: entry.equipment,
        suggestedSets: entry.suggestedSets,
        suggestedReps: entry.suggestedReps,
        suggestedRestSec: entry.suggestedRestSec
      }))
    })),
    selector: {
      activePlanType: catalog.activePlanType,
      activeBasePlanId: catalog.activeBasePlanId,
      activeCustomPlanId: catalog.activeCustomPlanId,
      basePlans: catalog.basePlans,
      customPlans: catalog.customPlans
    }
  });
}

export async function POST(req: Request) {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  try {
    const body = await req.json();
    const action = planActionSchema.parse(body);

    if (action.action === "switch") {
      const activePlan = await switchActivePlan(auth.user.id, {
        planType: action.planType,
        planId: action.planId
      });

      return NextResponse.json({
        ok: true,
        activePlan
      });
    }

    const duplicated = await duplicatePlanToCustom(auth.user.id, {
      sourcePlanType: action.sourcePlanType,
      sourcePlanId: action.sourcePlanId,
      name: action.name
    });

    return NextResponse.json({ ok: true, duplicated });
  } catch (error) {
    return zodToResponse(error) ?? NextResponse.json({ error: "No se pudo procesar la acción del plan" }, { status: 500 });
  }
}
