import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function main() {
  const packsDir = path.join(process.cwd(), "content", "packs");
  const packIds = fs.existsSync(packsDir)
    ? fs.readdirSync(packsDir).filter((name) => fs.statSync(path.join(packsDir, name)).isDirectory())
    : [];

  const today = new Date();
  const days = 7;
  for (let i = 0; i < days; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const key = dateKey(d);
    const seed = `cc-${key}`;
    const packId = packIds[i % (packIds.length || 1)] || null;
    await prisma.dailyChallenge.upsert({
      where: { date: key },
      update: { seed, packId },
      create: { date: key, seed, packId: packId || undefined }
    });
  }

  console.log("Seeded daily challenges");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
