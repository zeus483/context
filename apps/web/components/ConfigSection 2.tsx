"use client";

import { useState, type ReactNode, type RefObject } from "react";
import type { Difficulty, GamePreset, TieStrategy } from "../src/types";

type ConfigSectionProps = {
  headingRef?: RefObject<HTMLHeadingElement>;
  playerCount: number;
  impostorCount: number;
  maxImpostors: number;
  showCategoryToImpostor: boolean;
  durationMinutes: number;
  recommendedMinutes: number;
  timerCapMinutes: number;
  difficulty: Difficulty;
  tieStrategy: TieStrategy;
  preset: GamePreset | null;
  includeHardAmbiguous: boolean;
  accessibleRevealMode: boolean;
  enableHaptics: boolean;
  enableFinalBeep: boolean;
  errors: string[];
  onApplyPreset: (preset: GamePreset) => void;
  onPlayerCountChange: (value: number) => void;
  onImpostorCountChange: (value: number) => void;
  onShowCategoryToggle: (value: boolean) => void;
  onDurationChange: (value: number) => void;
  onDurationReset: () => void;
  onDifficultyChange: (value: Difficulty) => void;
  onTieStrategyChange: (value: TieStrategy) => void;
  onTimerCapChange: (value: number) => void;
  onIncludeHardAmbiguousChange: (value: boolean) => void;
  onAccessibleRevealModeChange: (value: boolean) => void;
  onEnableHapticsChange: (value: boolean) => void;
  onEnableFinalBeepChange: (value: boolean) => void;
  onPrepare: () => void;
  onReset: () => void;
  onRestartGame: () => void;
  onOpenHowToPlay: () => void;
  children?: ReactNode;
};

type CounterFieldProps = {
  label: string;
  value: number;
  helper: string;
  canDecrease: boolean;
  canIncrease: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
};

const PRESETS: Array<{ id: GamePreset; name: string; description: string }> = [
  { id: "QUICK", name: "Rápida", description: "Partidas cortas y directas." },
  { id: "CLASSIC", name: "Clásica", description: "Balanceada para la mayoría de grupos." },
  { id: "LONG", name: "Larga", description: "Más discusión y rondas profundas." }
];

const TIE_STRATEGY_LABELS: Record<TieStrategy, string> = {
  MINI_REVOTE: "Empate => mini-ronda 30s + revoto",
  NO_ELIMINATION: "Empate => no se elimina nadie",
  RANDOM_TIED: "Empate => eliminación aleatoria entre empatados"
};

function CounterField({
  label,
  value,
  helper,
  canDecrease,
  canIncrease,
  onDecrease,
  onIncrease
}: CounterFieldProps) {
  return (
    <div className="grid gap-3 rounded-2xl border border-white/10 bg-surface/60 p-4">
      <label className="text-sm text-muted">{label}</label>
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
        <button
          type="button"
          className="btn-secondary min-h-11 min-w-11 rounded-xl px-0 text-lg"
          onClick={onDecrease}
          disabled={!canDecrease}
          aria-label={`Reducir ${label.toLowerCase()}`}
        >
          -
        </button>
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
        <button
          type="button"
          className="btn-secondary min-h-11 min-w-11 rounded-xl px-0 text-lg"
          onClick={onIncrease}
          disabled={!canIncrease}
          aria-label={`Aumentar ${label.toLowerCase()}`}
        >
          +
        </button>
      </div>
      <p className="text-xs text-muted">{helper}</p>
    </div>
  );
}

export default function ConfigSection({
  headingRef,
  playerCount,
  impostorCount,
  maxImpostors,
  showCategoryToImpostor,
  durationMinutes,
  recommendedMinutes,
  timerCapMinutes,
  difficulty,
  tieStrategy,
  preset,
  includeHardAmbiguous,
  accessibleRevealMode,
  enableHaptics,
  enableFinalBeep,
  errors,
  onApplyPreset,
  onPlayerCountChange,
  onImpostorCountChange,
  onShowCategoryToggle,
  onDurationChange,
  onDurationReset,
  onDifficultyChange,
  onTieStrategyChange,
  onTimerCapChange,
  onIncludeHardAmbiguousChange,
  onAccessibleRevealModeChange,
  onEnableHapticsChange,
  onEnableFinalBeepChange,
  onPrepare,
  onReset,
  onRestartGame,
  onOpenHowToPlay,
  children
}: ConfigSectionProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <section className="card p-6 md:p-8">
      <header className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Paso 1</p>
          <button type="button" className="btn-ghost" onClick={onOpenHowToPlay}>
            Cómo jugar
          </button>
        </div>
        <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl focus:outline-none">
          Configuración de partida
        </h2>
        <p className="text-sm text-muted">Empieza en 5 segundos con un preset y ajusta solo lo necesario.</p>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {PRESETS.map((presetOption) => {
          const isActive = presetOption.id === preset;
          return (
            <button
              key={presetOption.id}
              type="button"
              onClick={() => onApplyPreset(presetOption.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                isActive ? "border-accent/60 bg-accent/10" : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <p className="font-semibold">{presetOption.name}</p>
              <p className="mt-1 text-xs text-muted">{presetOption.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <CounterField
          label="Número de jugadores"
          value={playerCount}
          helper="Entre 3 y 20 jugadores."
          canDecrease={playerCount > 3}
          canIncrease={playerCount < 20}
          onDecrease={() => onPlayerCountChange(playerCount - 1)}
          onIncrease={() => onPlayerCountChange(playerCount + 1)}
        />

        <CounterField
          label="Número de impostores"
          value={impostorCount}
          helper={`Máximo ${maxImpostors} impostores.`}
          canDecrease={impostorCount > 1}
          canIncrease={impostorCount < maxImpostors}
          onDecrease={() => onImpostorCountChange(impostorCount - 1)}
          onIncrease={() => onImpostorCountChange(impostorCount + 1)}
        />
      </div>

      <div className="mt-6 grid gap-4">{children}</div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-surface/60 p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left"
          onClick={() => setShowAdvanced((value) => !value)}
          aria-expanded={showAdvanced}
        >
          <span className="font-semibold">Avanzado</span>
          <span className="text-sm text-muted">{showAdvanced ? "Ocultar" : "Mostrar"}</span>
        </button>

        {showAdvanced ? (
          <div className="mt-4 grid gap-4">
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-muted">Duración de ronda</label>
                <span className="chip">Recomendado: {recommendedMinutes} min</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-center text-3xl font-semibold tabular-nums">{durationMinutes} min</div>
                <button type="button" className="btn-ghost" onClick={onDurationReset}>
                  Reset recomendado
                </button>
              </div>
              <input
                type="range"
                min={5}
                max={timerCapMinutes}
                step={1}
                value={durationMinutes}
                onChange={(event) => onDurationChange(Number(event.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
                aria-label="Duración de ronda"
              />
            </div>

            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <label className="text-sm text-muted">Dificultad de palabras</label>
              <div className="grid gap-3 sm:grid-cols-3">
                {(["easy", "medium", "hard"] as Difficulty[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={difficulty === option ? "btn-primary" : "btn-secondary"}
                    onClick={() => onDifficultyChange(option)}
                  >
                    {option === "easy" ? "Fácil" : option === "medium" ? "Media" : "Difícil"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <label className="text-sm text-muted">Modo pista para impostor</label>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className={showCategoryToImpostor ? "btn-primary" : "btn-secondary"}
                  onClick={() => onShowCategoryToggle(true)}
                >
                  Mostrar categoría
                </button>
                <button
                  type="button"
                  className={!showCategoryToImpostor ? "btn-primary" : "btn-secondary"}
                  onClick={() => onShowCategoryToggle(false)}
                >
                  Sin pista
                </button>
              </div>
            </div>

            <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
              <label className="text-sm text-muted">Regla de empate</label>
              <select
                value={tieStrategy}
                onChange={(event) => onTieStrategyChange(event.target.value as TieStrategy)}
                className="input"
              >
                {Object.entries(TIE_STRATEGY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
              <label className="text-sm text-muted">Límite superior del timer</label>
              <div className="grid grid-cols-2 gap-3">
                {[12, 15].map((cap) => (
                  <button
                    key={cap}
                    type="button"
                    className={timerCapMinutes === cap ? "btn-primary" : "btn-secondary"}
                    onClick={() => onTimerCapChange(cap)}
                  >
                    {cap} min
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <span>Incluir palabras difíciles/ambiguas</span>
              <input
                type="checkbox"
                checked={includeHardAmbiguous}
                onChange={(event) => onIncludeHardAmbiguousChange(event.target.checked)}
                className="h-5 w-5 accent-accent"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <span>Modo accesible (mantener presionado)</span>
              <input
                type="checkbox"
                checked={accessibleRevealMode}
                onChange={(event) => onAccessibleRevealModeChange(event.target.checked)}
                className="h-5 w-5 accent-accent"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <span>Vibración al revelar</span>
              <input
                type="checkbox"
                checked={enableHaptics}
                onChange={(event) => onEnableHapticsChange(event.target.checked)}
                className="h-5 w-5 accent-accent"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <span>Beep en últimos 10s</span>
              <input
                type="checkbox"
                checked={enableFinalBeep}
                onChange={(event) => onEnableFinalBeepChange(event.target.checked)}
                className="h-5 w-5 accent-accent"
              />
            </label>

            <button type="button" className="btn-danger" onClick={onRestartGame}>
              Reiniciar partida
            </button>
          </div>
        ) : null}
      </div>

      {errors.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          <ul className="list-disc space-y-1 pl-4">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:flex sm:items-center sm:justify-between">
        <button
          type="button"
          className="btn-primary w-full justify-center py-4 text-base sm:w-auto sm:min-w-[280px]"
          onClick={onPrepare}
          disabled={errors.length > 0}
        >
          Jugar
        </button>
        <button type="button" className="btn-secondary w-full justify-center sm:w-auto" onClick={onReset}>
          Reset configuración
        </button>
      </div>
    </section>
  );
}
