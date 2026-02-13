# UI Kit — Transformación 2026 (Iteración 4)

## Mapa de navegación
- `/login`: login + registro
- `/today`: Home “Hoy” + XP/Nivel/Título + quests + check-in
- `/plans`: selector de plan + editor de rutinas personalizadas
- `/session/[dayId]`: sesión guiada (sets/reps/kg/cardio/notas)
- `/calendar`: calendario mensual + detalle por día + historial
- `/progress`: RPG profile + peso + volumen + PRs + badges
- `/library`: biblioteca de ejercicios
- `/settings`: perfil y preferencias

## Flujos clave
1. Onboarding/Login -> Home -> Iniciar entrenamiento -> Guardar -> Calendario
2. Home -> Planes -> Duplicar plan base -> Editar -> Activar
3. Home -> Check-in semanal -> Recomendación -> Progreso

## Pantallas nuevas
- Selector de plan (base + custom)
- Wizard/editor de rutina personalizada
- Home con gamificación (XP bar, título, quests)
- Check-in semanal (esfuerzo/fatiga)
- Perfil RPG (títulos, badges, quests)

## Principios UI
- Mobile-first, acción rápida (1–2 taps en flujo principal)
- Estética premium oscura + acento energético
- Densidad de info controlada: motivación visible sin saturación

## Tokens
- `--bg: #06090f`
- `--surface: #0d111a`
- `--surface-2: #131a26`
- `--border: #222c3f`
- `--text: #f2f5fa`
- `--muted: #9ca8bf`
- `--accent: #1be48f`
- `--accent-2: #f9b233`

## Componentes
- `Card`, `CardMuted`
- `Button` (`.btn`, `.btn-secondary`)
- `Input` / `Select` / `Textarea`
- `Bottom Nav`
- `Calendar Cell`
- `Quest Progress Row`
- `XP Progress Bar`
- `Exercise Set Row`

## Accesibilidad
- Contraste AA en superficies principales
- Targets táctiles grandes (`>=40px`)
- Estados claros de loading/error/success
