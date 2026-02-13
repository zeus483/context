import { NextResponse } from "next/server";
import { getAuthContext } from "../../../../lib/auth";
import { badRequest, unauthorized, zodToResponse } from "../../../../lib/http";
import { prisma } from "../../../../lib/prisma";
import { activeTitleSchema } from "../../../../lib/validation";
import { refreshGamification } from "../../../../lib/gamification";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  await refreshGamification(auth.user.id);

  const [stats, titles] = await Promise.all([
    prisma.userStats.findUnique({
      where: { userId: auth.user.id },
      include: { currentTitle: true }
    }),
    prisma.userTitle.findMany({
      where: { userId: auth.user.id },
      include: { title: true },
      orderBy: [{ unlockedAt: "asc" }]
    })
  ]);

  return NextResponse.json({
    currentTitleId: stats?.currentTitleId ?? null,
    currentTitle: stats?.currentTitle?.name ?? null,
    unlockedTitles: titles.map((row) => ({
      id: row.title.id,
      name: row.title.name,
      description: row.title.description,
      unlockedAt: row.unlockedAt.toISOString()
    }))
  });
}

export async function POST(req: Request) {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  try {
    const body = await req.json();
    const parsed = activeTitleSchema.parse(body);

    const unlocked = await prisma.userTitle.findUnique({
      where: {
        userId_titleId: {
          userId: auth.user.id,
          titleId: parsed.titleId
        }
      }
    });

    if (!unlocked) {
      return badRequest("Ese título no está desbloqueado");
    }

    await prisma.userStats.upsert({
      where: { userId: auth.user.id },
      update: {
        currentTitleId: parsed.titleId
      },
      create: {
        userId: auth.user.id,
        xpTotal: 0,
        level: 1,
        streakCount: 0,
        currentTitleId: parsed.titleId
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return zodToResponse(error) ?? NextResponse.json({ error: "No se pudo actualizar el título" }, { status: 500 });
  }
}
