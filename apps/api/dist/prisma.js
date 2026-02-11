import { createRequire } from "module";
const require = createRequire(import.meta.url);
const prismaClientModule = require("@prisma/client");
export const prisma = new prismaClientModule.PrismaClient();
