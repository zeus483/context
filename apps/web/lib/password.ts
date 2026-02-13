import crypto from "crypto";

const KEY_LEN = 64;

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, original] = storedHash.split(":");
  if (!salt || !original) {
    return false;
  }

  const candidate = crypto.scryptSync(password, salt, KEY_LEN).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(original, "hex"));
}
