import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { hashPassword, verifyPassword } from "./password";
import { fromDateKey, todayKey } from "./dates";
import { AUTH_COOKIE } from "./constants";

const SESSION_DAYS = 30;

function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function sessionExpiryDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + SESSION_DAYS);
  return date;
}

export async function registerUser(input: {
  email: string;
  password: string;
  profile?: {
    name?: string;
    weightKg: number;
    heightCm: number;
    age: number;
    trainingDays: 5 | 6;
    availableHours: number;
    beachGoalDate: string;
  };
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    return { ok: false, message: "El email ya está registrado" } as const;
  }

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash: hashPassword(input.password),
      profile: {
        create: {
          name: input.profile?.name,
          weightKg: input.profile?.weightKg ?? 80,
          heightCm: input.profile?.heightCm ?? 175,
          age: input.profile?.age ?? 23,
          goal: "Hipertrofia + recomposición",
          trainingDays: input.profile?.trainingDays ?? 5,
          availableHours: input.profile?.availableHours ?? 2,
          beachGoalDate: fromDateKey(input.profile?.beachGoalDate ?? todayKey())
        }
      },
      bodyWeightLogs: {
        create: {
          date: fromDateKey(todayKey()),
          weightKg: input.profile?.weightKg ?? 80
        }
      }
    },
    include: { profile: true }
  });

  await createSession(user.id);

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      profile: user.profile
    }
  } as const;
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, message: "Credenciales inválidas" } as const;
  }

  await createSession(user.id);

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      profile: user.profile
    }
  } as const;
}

export async function logoutUser() {
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  if (token) {
    await prisma.userSession.deleteMany({ where: { tokenHash: tokenHash(token) } });
  }

  cookieStore.delete(AUTH_COOKIE);
}

export async function getAuthContext() {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const session = await prisma.userSession.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: { include: { profile: true } } }
  });

  if (!session) {
    cookies().delete(AUTH_COOKIE);
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.userSession.delete({ where: { id: session.id } });
    cookies().delete(AUTH_COOKIE);
    return null;
  }

  await prisma.userSession.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() }
  });

  return {
    sessionId: session.id,
    user: session.user,
    profile: session.user.profile
  };
}

export async function requireAuthContext() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/login");
  }
  return context;
}

async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");

  await prisma.userSession.create({
    data: {
      userId,
      tokenHash: tokenHash(token),
      expiresAt: sessionExpiryDate()
    }
  });

  cookies().set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: sessionExpiryDate()
  });

  await prisma.userSession.deleteMany({
    where: {
      userId,
      OR: [{ expiresAt: { lt: new Date() } }]
    }
  });
}
