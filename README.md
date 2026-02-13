# Transformación 2026

Aplicación web mobile-first para hipertrofia + cardio, con enfoque en adherencia real y progreso continuo. Stack full-stack Node.js (Next.js App Router + Prisma + Postgres), lista para Vercel.

## Iteración 4 incluida
- Multi-plan completo:
  - Plan base `Fase Playa 8 Semanas`
  - Plan base `Rutina Normal (Anual)` (seed desde PDF del proyecto)
  - Rutinas personalizadas por usuario
- Selector de plan y cambio de plan sin perder historial.
- CRUD de rutinas personalizadas:
  - crear, editar, duplicar, eliminar/archivar
  - edición segura (si hay sesiones históricas, versiona para no romperlas)
- Sesiones extendidas:
  - sesión asociada a `planType` (`BASE`/`CUSTOM`) + `planId`
  - autoguardado
  - cardio obligatorio (0 permitido con motivo)
- Calendario + historial:
  - estados diarios `✅ ⚠️ ○ —`
  - detalle editable por día
  - lista de últimos entrenos
- Registro de peso corporal + gráfico.
- Check-in semanal + motor de recomendación:
  - esfuerzo 1-10
  - bandera de fatiga
  - recomendación con incrementos seguros
- Gamificación tipo RPG (estilo Solo Leveling):
  - XP, niveles, barra de progreso
  - títulos desbloqueables y título activo
  - quests diarias/semanales/mensuales
  - badges por hitos
  - microcelebración `+XP` al guardar sesión/peso/check-in

## Stack
- Next.js 14 + App Router + TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL (recomendado: Supabase)

## Modelo de datos
Definido en `/Users/cristiancastro/Documents/Proyector Personales/Contexta/prisma/schema.prisma`.

Incluye:
- Auth/perfil: `User`, `UserSession`, `Profile`
- Planes base: `WorkoutPlan`, `WorkoutDay`, `DayExercise`, `Exercise`
- Planes custom: `CustomWorkoutPlan`, `CustomWorkoutDay`, `CustomWorkoutExercise`
- Entrenos: `WorkoutAssignment`, `WorkoutSession`, `ExerciseSet`, `CardioEntry`
- Progreso: `BodyWeightLog`, `ProgressPhoto`
- Check-in/recomendación: `WeeklyCheckin`, `WeeklyRecommendation`
- Gamificación: `UserStats`, `Title`, `UserTitle`, `Quest`, `UserQuestProgress`, `Badge`, `UserBadge`

## Variables de entorno
Copia `.env.example` a `.env` y define:

```bash
DATABASE_URL="postgresql://..."
NODE_ENV="development"
```

## Setup local
```bash
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

## Usuario demo
- Email: `demo@transformacion.app`
- Password: `demo1234`

## Scripts útiles
```bash
pnpm build
pnpm test
pnpm test:e2e
pnpm db:generate
pnpm db:push
pnpm db:seed
```

## Despliegue Vercel
Configura el proyecto con:
- Root Directory: repo root (`/Users/cristiancastro/Documents/Proyector Personales/Contexta`), no `apps/web`
- Install Command: `pnpm install`
- Build Command: `pnpm build`
- Output: automático Next.js

Variables en Vercel:
- `DATABASE_URL` (Supabase Pooler recomendado)

Después del primer deploy, aplica esquema en Supabase:
```bash
pnpm db:push
pnpm db:seed
```

## Notas de producción
- El build ejecuta `prisma generate` para evitar error de Prisma Client desactualizado en Vercel.
- Si `DATABASE_URL` falta o el esquema no está aplicado, las APIs devuelven error explícito con acción sugerida.

## UX/UI docs
- Tokens y componentes: `/Users/cristiancastro/Documents/Proyector Personales/Contexta/docs/ui-kit.md`
