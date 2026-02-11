import { NextResponse } from "next/server";

const notConfigured = () =>
  NextResponse.json(
    {
      ok: false,
      message: "Auth no está configurado en esta versión de Impostor Clásico."
    },
    { status: 501 }
  );

export const handlers = {
  GET: notConfigured,
  POST: notConfigured
};
