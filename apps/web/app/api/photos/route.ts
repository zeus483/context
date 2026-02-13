import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth";
import { applyRateLimit, badRequest, unauthorized, zodToResponse } from "../../../lib/http";
import { fromDateKey, toDateKey } from "../../../lib/dates";
import { prisma } from "../../../lib/prisma";
import { photoSchema } from "../../../lib/validation";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  const photos = await prisma.progressPhoto.findMany({
    where: { userId: auth.user.id },
    orderBy: { date: "desc" }
  });

  return NextResponse.json(
    photos.map((photo) => ({
      id: photo.id,
      date: toDateKey(photo.date),
      imageUrl: photo.imageUrl,
      privacyNote: photo.privacyNote
    }))
  );
}

export async function POST(req: Request) {
  const limit = applyRateLimit(req, "photo-write", 20, 60_000);
  if (limit) {
    return limit;
  }

  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  try {
    const body = await req.json();
    const parsed = photoSchema.parse(body);

    const photo = await prisma.progressPhoto.create({
      data: {
        userId: auth.user.id,
        date: fromDateKey(parsed.date),
        imageUrl: parsed.imageUrl,
        privacyNote: parsed.privacyNote
      }
    });

    return NextResponse.json({
      id: photo.id,
      date: toDateKey(photo.date),
      imageUrl: photo.imageUrl,
      privacyNote: photo.privacyNote
    });
  } catch (error) {
    return zodToResponse(error) ?? NextResponse.json({ error: "No se pudo guardar la foto" }, { status: 500 });
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

  await prisma.progressPhoto.deleteMany({
    where: { id, userId: auth.user.id }
  });

  return NextResponse.json({ ok: true });
}
