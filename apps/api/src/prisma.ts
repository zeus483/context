import { createRequire } from "module";

const require = createRequire(import.meta.url);
const prismaClientModule = require("@prisma/client") as { PrismaClient: new (...args: unknown[]) => unknown };

export const prisma = new prismaClientModule.PrismaClient() as any;
