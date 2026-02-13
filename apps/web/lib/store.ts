import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const FILE = path.join(process.cwd(), "storage", "app-data.json");

type Data = any;

const base: Data = {
  users: [{ id: "u1", email: "demo@transformacion.app", passwordHash: crypto.createHash("sha256").update("demo1234").digest("hex") }],
  profiles: [{ userId: "u1", weightKg: 80, heightCm: 175, age: 23, goal: "Hipertrofia + recomposición", trainingDays: 5, availableHours: 2, beachGoalDate: new Date(Date.now() + 56 * 86400000).toISOString() }],
  sessions: [],
  bodyWeights: [{ userId: "u1", date: new Date().toISOString(), weightKg: 80 }],
  plan: {
    id: "fase-playa-8-semanas",
    name: "Fase Playa 8 Semanas",
    days: [
      { id: "d1", dayNumber: 1, title: "Pecho fuerza + tríceps", cardioDefault: 20, optional: false, exercises: ["Press banca", "Press inclinado", "Fondos"] },
      { id: "d2", dayNumber: 2, title: "Espalda + bíceps", cardioDefault: 15, optional: false, exercises: ["Jalón", "Remo", "Curl barra"] },
      { id: "d3", dayNumber: 3, title: "Pierna cuádriceps", cardioDefault: 20, optional: false, exercises: ["Prensa", "Zancadas", "Extensión"] },
      { id: "d4", dayNumber: 4, title: "Pecho hipertrofia + hombro", cardioDefault: 20, optional: false, exercises: ["Press inclinado", "Aperturas", "Laterales"] },
      { id: "d5", dayNumber: 5, title: "Espalda + brazos", cardioDefault: 15, optional: false, exercises: ["Remo", "Jalón", "Curl"] },
      { id: "d6", dayNumber: 6, title: "Pierna posterior + abs", cardioDefault: 25, optional: true, exercises: ["RDL", "Hip thrust", "Plancha"] }
    ]
  },
  library: [
    { id: "e1", name: "Press banca", muscleGroup: "Pecho", equipment: "Barra", imageUrl: "https://placehold.co/640x420/png?text=Press+Banca", instructions: "Escápulas juntas, baja controlado, empuja vertical.", tips: "No rebotes.", alternatives: "Press en máquina" },
    { id: "e2", name: "Jalón al pecho", muscleGroup: "Espalda", equipment: "Polea", imageUrl: "https://placehold.co/640x420/png?text=Jalon", instructions: "Pecho arriba, lleva codos a costillas.", tips: "Evita tirón de espalda baja.", alternatives: "Dominadas asistidas" }
  ]
};

export async function readData() {
  try { return JSON.parse(await fs.readFile(FILE, "utf8")); }
  catch { await fs.mkdir(path.dirname(FILE), { recursive: true }); await fs.writeFile(FILE, JSON.stringify(base, null, 2)); return base; }
}
export async function writeData(data: Data) { await fs.writeFile(FILE, JSON.stringify(data, null, 2)); }
export const hash = (input: string) => crypto.createHash("sha256").update(input).digest("hex");
