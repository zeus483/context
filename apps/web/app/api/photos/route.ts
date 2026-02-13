import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth";
import { applyRateLimit, badRequest, unauthorized } from "../../../lib/http";
import { fromDateKey, toDateKey } from "../../../lib/dates";
import { prisma } from "../../../lib/prisma";
import { uploadPhoto, deletePhoto } from "../../../lib/storage";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) {
    return unauthorized();
  }

  const photos = await prisma.progressPhoto.findMany({
    where: { userId: auth.user.id },
    orderBy: { date: "desc" },
    take: 50
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
    const formData = await req.formData();
    const file = formData.get("file");
    const date = formData.get("date");
    const privacyNote = formData.get("privacyNote");

    if (!file || !(file instanceof File)) {
      return badRequest("Se requiere un archivo de imagen");
    }

    if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return badRequest("Fecha inválida (formato: YYYY-MM-DD)");
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return badRequest("Tipo de archivo no permitido. Usa JPG, PNG o WebP.");
    }

    if (file.size > MAX_FILE_SIZE) {
      return badRequest("La imagen es demasiado grande (máximo 4MB)");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageUrl = await uploadPhoto(auth.user.id, file.name, buffer, file.type);

    const photo = await prisma.progressPhoto.create({
      data: {
        userId: auth.user.id,
        date: fromDateKey(date),
        imageUrl,
        privacyNote: typeof privacyNote === "string" ? privacyNote.slice(0, 200) : undefined
      }
    });

    return NextResponse.json({
      id: photo.id,
      date: toDateKey(photo.date),
      imageUrl: photo.imageUrl,
      privacyNote: photo.privacyNote
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la foto";
    return NextResponse.json({ error: message }, { status: 500 });
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

  const photo = await prisma.progressPhoto.findFirst({
    where: { id, userId: auth.user.id }
  });

  if (photo) {
    await deletePhoto(photo.imageUrl);
    await prisma.progressPhoto.delete({ where: { id: photo.id } });
  }

  return NextResponse.json({ ok: true });
}
