# Transformación 2026

Aplicación web mobile-first para hipertrofia + cardio, enfocada en el bloque **Fase Playa 8 semanas** y continuidad anual. Stack full-stack Node.js en un solo repo con Next.js App Router y Postgres/Prisma, lista para Vercel.

## Qué incluye
- Login + registro real (`email/password`) con sesión segura en DB.
- Home “Hoy” en menos de 3 taps: día actual, mañana, semana, racha y cumplimiento.
- Sesión guiada completa:
  - sets por ejercicio (`kg`, `reps`, `RIR`, notas, completado)
  - cardio final obligatorio (permite `0` con motivo)
  - autoguardado por cambios + intervalo
  - sugerencia de cargas de la última sesión
- Calendario mensual con estados:
  - `✅ Hecho`, `⚠️ Parcial`, `○ Descanso`, `— Fallado`
  - detalle diario editable y reprogramación de día
- Progreso:
  - panel “Playa en X días”
  - peso corporal (línea)
  - volumen semanal por grupo muscular
  - PRs recientes por levantamiento clave
  - fotos de progreso opcionales (URL + nota privada)
- Biblioteca de ejercicios:
  - imagen/placeholder
  - cómo se hace, tips, errores, alternativas
- Ajustes:
  - perfil físico
  - preferencia 5/6 días
  - horas disponibles
  - fecha objetivo playa
- Exportación de entrenos en CSV y JSON.

## Entregables UX/UI
- Mapa de navegación, flujo principal, wireframes textuales, tokens y componentes en:
  - `docs/ui-kit.md`

## Arquitectura
- Front + Back: Next.js (App Router) + TypeScript
- UI: Tailwind + componentes propios
- DB: PostgreSQL + Prisma
- Auth: credenciales con tabla `UserSession`
- Validación: Zod
- Seguridad:
  - cookies httpOnly
  - middleware de protección de rutas
  - rate limiting básico por IP en endpoints críticos

## Modelo de datos
Definido en `prisma/schema.prisma`:
- `User`, `UserSession`, `Profile`
- `WorkoutPlan`, `WorkoutDay`, `Exercise`, `DayExercise`
- `WorkoutAssignment` (reprogramación/flexibilidad)
- `WorkoutSession`, `ExerciseSet`, `CardioEntry`
- `BodyWeightLog`, `ProgressPhoto`

## Variables de entorno
Copia `.env.example` a `.env`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/transformacion"
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

## Pruebas
### Unit
```bash
pnpm test
```

### E2E smoke
```bash
pnpm test:e2e
```

Flujo smoke cubierto: login -> abrir día de sesión -> guardar sesión -> validar calendario.

## Deploy en Vercel
1. Importa el repo en Vercel.
2. Configura variable `DATABASE_URL` (Postgres en producción).
3. Build command:
   - `pnpm db:generate && pnpm build`
4. Install command:
   - `pnpm install`
5. Start command:
   - `pnpm start`

## Supuestos tomados
- Fotos de progreso se guardan como URL (la app queda lista para conectar storage S3/Vercel Blob sin romper el dominio).
- El plan base está validado para no exceder 2 días de tren inferior.
- La base planificada para 5 días deja el día 6 como opcional y reprogramable.
