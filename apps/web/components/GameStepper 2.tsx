type GameStepperProps = {
  currentStep: number;
  totalSteps: number;
  currentLabel: string;
  stepLabels: string[];
};

export default function GameStepper({
  currentStep,
  totalSteps,
  currentLabel,
  stepLabels
}: GameStepperProps) {
  const progress = Math.min(100, Math.max(0, (currentStep / totalSteps) * 100));

  return (
    <nav
      className="sticky top-2 z-40 rounded-3xl border border-white/10 bg-base/90 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur"
      aria-label="Progreso de la partida"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-muted">
            Paso {currentStep} de {totalSteps}
          </p>
          <p className="font-display text-xl">{currentLabel}</p>
        </div>
        <span className="chip">{Math.round(progress)}%</span>
      </div>

      <div className="mt-3 h-2 rounded-full bg-white/10" aria-hidden="true">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ol className="mt-4 grid gap-2 text-xs text-muted sm:grid-cols-4">
        {stepLabels.map((label, index) => {
          const stepNumber = index + 1;
          const isDone = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          return (
            <li
              key={label}
              className={`rounded-xl border px-3 py-2 transition ${
                isCurrent
                  ? "border-accent/60 bg-accent/10 text-ink"
                  : isDone
                    ? "border-white/20 bg-white/10 text-ink"
                    : "border-white/10 bg-white/5"
              }`}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className="font-semibold">{stepNumber}.</span> {label}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
