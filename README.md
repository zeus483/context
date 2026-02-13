# Transformación 2026

App mobile-first para hipertrofia + cardio (fase playa 8 semanas), lista para desplegar en Vercel con Next.js (App Router).

## Producto entregado
- Login real con credenciales (email/password con cookie de sesión).
- Home "Hoy" con día asignado, CTA de sesión, progreso hacia playa.
- Modo sesión con guardado de sets + cardio + notas.
- Calendario simple con estado ✅/⚠️.
- Progreso con peso corporal (gráfico SVG) + volumen básico.
- Biblioteca de ejercicios con imagen placeholder reemplazable.
- Exportación CSV desde `/api/export`.

## UX/UI entregables
- **Mapa navegación:** Login → Hoy → Sesión → Calendario / Progreso / Biblioteca.
- **Flujo principal:** login → ver “Hoy” → iniciar sesión → guardar → revisar calendario/progreso.
- **Wireframe textual:**
  - Login: héroe + formulario simple.
  - Hoy: barra “Playa en X días”, tarjeta entrenamiento y acceso sesión.
  - Sesión: lista ejercicios + cardio + guardar.
  - Calendario: lista de días recientes con estado.
  - Progreso: gráfica peso + resumen volumen.
  - Biblioteca: catálogo en cards con instrucciones y alternativas.
- **UI Kit (tokens):**
  - Colores: `zinc-950` fondo, `zinc-900` surfaces, `emerald-500` acento.
  - Tipografía: sistema sans.
  - Espaciado: escala Tailwind 2/3/4/6.
  - Radius: `rounded-xl`, `rounded-2xl`.
  - Sombras: `shadow-xl shadow-black/20`.

## Arquitectura técnica
- Front+Back: Next.js App Router (Node full-stack).
- Persistencia actual: JSON file (`apps/web/storage/app-data.json`) para ejecutar out-of-the-box.
- Seguridad: rutas privadas por middleware + sesión httpOnly cookie.
- Validación funcional base en endpoints de sesión/progreso/export.

## Variables de entorno
No obligatorias para correr en modo actual.

## Setup local
```bash
pnpm install
pnpm dev
```

## Usuario demo
- `demo@transformacion.app`
- `demo1234`

## Testing
```bash
pnpm --filter @cc/web test
pnpm --filter @cc/web build
```

## Deploy Vercel
1. Importar repo en Vercel.
2. Build command: `pnpm build`.
3. Start command: `pnpm start`.

## Supuestos
- Se dejó schema Prisma + seed para futura migración a PostgreSQL sin rehacer dominio.
- Fotos y PRs avanzados quedan preparados a nivel de arquitectura para iteración siguiente.
