import { existsSync, readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

function readEnvValue(filePath: string, key: string) {
  if (!existsSync(filePath)) {
    return null;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const currentKey = trimmed.slice(0, separatorIndex).trim();
    if (currentKey !== key) {
      continue;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    return value || null;
  }

  return null;
}

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return;
  }

  const candidateDirs = [process.cwd(), path.resolve(process.cwd(), ".."), path.resolve(process.cwd(), "..", "..")];

  for (const dir of candidateDirs) {
    const value = readEnvValue(path.join(dir, ".env"), "DATABASE_URL");
    if (value) {
      process.env.DATABASE_URL = value;
      return;
    }
  }
}

ensureDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    datasources: process.env.DATABASE_URL
      ? {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      : undefined
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
