# UI Kit — Transformación 2026

## Mapa de navegación
- `/login`: login + registro
- `/today`: resumen Hoy/Mañana/Esta semana + adherencia
- `/session/[dayId]`: sesión guiada con sets + cardio + autoguardado
- `/calendar`: calendario mensual + detalle diario + reprogramación
- `/progress`: dashboards (peso, volumen, PRs, fotos, export)
- `/library`: biblioteca de ejercicios (cómo, tips, errores, alternativas)
- `/settings`: perfil y preferencias (5/6 días, meta playa)

## Flujo principal
1. Onboarding/Login
2. Ver “Hoy”
3. Iniciar sesión
4. Registrar sets y cardio (autoguardado)
5. Guardar sesión
6. Revisar calendario/progreso

## Wireframes (texto)
- Login:
  - Hero breve + tabs `Iniciar sesión | Crear cuenta`
  - Formulario de credenciales
  - Registro con datos de perfil mínimos
- Home/Hoy:
  - Card de “Playa en X días” con barra de avance
  - Card de entrenamiento actual y CTA
  - Cards de racha y cumplimiento
  - Lista semanal con estado
- Sesión:
  - Header con título/foco/fecha
  - Bloques por ejercicio
  - Filas por set (kg/reps/RIR/notas/completado)
  - Card de cardio final + motivo si 0
  - Guardar + autoguardado
- Calendario:
  - Selector de mes
  - Grid mensual con estados ✅ ⚠️ ○ —
  - Detalle del día y edición
  - Form de reprogramación
- Progreso:
  - Beach panel
  - Peso corporal (línea)
  - Volumen semanal por músculo
  - PR cards
  - Fotos privadas + export
- Biblioteca:
  - Cards con imagen
  - Cómo se hace / tips / errores / alternativas

## Tokens
- Colores:
  - `--bg: #06090f`
  - `--surface: #0d111a`
  - `--surface-2: #131a26`
  - `--border: #222c3f`
  - `--text: #f2f5fa`
  - `--muted: #9ca8bf`
  - `--accent: #1be48f`
  - `--accent-2: #f9b233`
- Tipografía:
  - Sans legible optimizada para móvil
  - Jerarquía: `.h1`, `.h2`, `.metric`, `.label`
- Espaciado:
  - Escala de 4/8/12/16/24 px vía utilidades Tailwind
- Radius:
  - `rounded-xl`, `rounded-2xl`
- Sombra:
  - `shadow-[0_16px_42px_rgba(0,0,0,0.35)]`

## Componentes base
- `Card`, `CardMuted`
- `Button` (`.btn`, `.btn-secondary`)
- `Input`/`Select`/`Textarea` (`.input`)
- `Bottom Nav`
- `Calendar Day Cell`
- `Exercise Set Row`
- `Status Pill`

## Accesibilidad
- Contraste mínimo AA en texto principal sobre superficies oscuras.
- Targets táctiles >= 40px.
- Estados explícitos de carga/error/guardado.
