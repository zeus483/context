import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth";
import { badRequest, unauthorized, zodToResponse } from "../../../lib/http";
import { customPlanSchema } from "../../../lib/validation";
import { deleteOrArchiveCustomPlan, getCustomPlan, listPlanCatalog, upsertCustomPlan } from "../../../lib/plans";

export async function GET(req: Request) {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const detail = await getCustomPlan(auth.user.id, id);
    if (!detail) {
      return badRequest("Plan personalizado no encontrado");
    }
    return NextResponse.json(detail);
  }

  const catalog = await listPlanCatalog(auth.user.id);
  return NextResponse.json({
    customPlans: catalog.customPlans
  });
}

export async function POST(req: Request) {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  try {
    const body = await req.json();
    const parsed = customPlanSchema.parse(body);
    const result = await upsertCustomPlan(auth.user.id, parsed);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return zodToResponse(error) ?? NextResponse.json({ error: "No se pudo guardar la rutina personalizada" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return badRequest("id requerido");
  }

  try {
    const result = await deleteOrArchiveCustomPlan(auth.user.id, id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "No se pudo eliminar la rutina" }, { status: 400 });
  }
}
