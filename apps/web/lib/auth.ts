import { cookies } from "next/headers";
import { hash, readData } from "./store";

export async function login(email: string, password: string) {
  const data = await readData();
  const user = data.users.find((u: any) => u.email === email && u.passwordHash === hash(password));
  if (!user) return false;
  cookies().set("session", user.id, { httpOnly: true, sameSite: "lax", secure: false, path: "/" });
  return true;
}

export function logout() { cookies().delete("session"); }
export function getUserId() { return cookies().get("session")?.value ?? null; }
