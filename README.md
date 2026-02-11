# Impostor Clásico

Juego social en **un solo celular**: roles secretos, revelación privada con gesto, timer y votación con reglas de empate. Funciona offline como PWA.

## Requisitos

- Node.js 20+
- pnpm 9+

## Instalar

```bash
pnpm install
```

## Desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Build de producción

```bash
pnpm build
pnpm start
```

## Flujo principal

1. **Configuración**: presets (Rápida/Clásica/Larga), jugadores, impostores y categorías.
2. **Revelación**: móvil con cortina peek-to-read (o modo accesible mantener presionado), desktop con flip card.
3. **Ronda**: timer + votación simple (seleccionar, confirmar, revelar resultado).
4. **Resultado**: revancha 1 toque, cambiar palabra y volver a configuración.

## Persistencia de partida activa (reanudar tras reload)

La app guarda en `localStorage` el estado activo para resistir recargas/cierre:

- fase actual (`REVEAL`, `RUNNING`, `ENDED`)
- configuración de partida
- categoría/palabra seleccionadas
- roles y progreso de revelación
- timer restante con `roundEndsAt` (timestamp)
- progreso de jugadores ya revelados

Al abrir de nuevo, si existe partida activa, se muestra modal:
- **Reanudar**: restaura estado y timer correctamente por timestamp.
- **Reiniciar**: descarta snapshot y vuelve a configuración.

## Categorías, dificultad y palabras

### Categorías base

Archivo:

- `/Users/cristiancastro/Documents/Proyector Personales/Contexta/apps/web/src/content/categories.ts`

Cada palabra usa estructura:

```ts
{ word: string; difficulty: 'easy' | 'medium' | 'hard'; flags?: { ambiguous?: boolean } }
```

### Categorías personalizadas

Se crean desde UI y se guardan en `localStorage`.

### Dificultad y curación

- Selector de dificultad: `easy | medium | hard`
- Palabras ambiguas excluidas por defecto
- En Avanzado: toggle **Incluir palabras difíciles/ambiguas**
- Anti-repetición: historial local de últimas 50 palabras + evita repetir categoría consecutiva cuando hay variedad

## Reglas de empate

Visible en Avanzado (placeholder de producto):

- `Empate => mini-ronda 30s + revoto`
- `Empate => no se elimina nadie`
- `Empate => eliminación aleatoria entre empatados`

## Extras de producto

- Onboarding express (3 slides), auto primera vez, reabrible desde “Cómo jugar”
- Botón fijo “Siguiente” en revelación (se habilita tras peek suficiente)
- Toggle de vibración al revelar y beep opcional en últimos 10s
