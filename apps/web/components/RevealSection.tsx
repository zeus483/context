"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
  type TouchEvent
} from "react";
import type { Category, Player } from "../src/types";

type RevealState = "HANDOFF" | "ARMED" | "PEEKING" | "REVEALED_PERSISTENT" | "DONE_PLAYER";

type RevealSectionProps = {
  headingRef?: RefObject<HTMLHeadingElement>;
  players: Player[];
  category: Category | null;
  word: string | null;
  showCategoryToImpostor: boolean;
  accessibleRevealMode: boolean;
  enableHaptics: boolean;
  onPlayerRevealed: (id: string) => void;
  onStartRound: () => void;
};

const MAX_DRAG_DISTANCE = 320;
const SAFE_READING_THRESHOLD = 0.7;
const HOLD_REVEAL_THRESHOLD_MS = 500;
const HOLD_PASS_THRESHOLD_MS = 800;
const ARMING_DELAY_MS = 900;

function triggerHaptic(enabled: boolean) {
  if (!enabled || typeof navigator === "undefined") return;
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(20);
  }
}

export default function RevealSection({
  headingRef,
  players,
  category,
  word,
  showCategoryToImpostor,
  accessibleRevealMode,
  enableHaptics,
  onPlayerRevealed,
  onStartRound
}: RevealSectionProps) {
  const currentPlayerIndex = useMemo(
    () => players.findIndex((player) => !player.revealed),
    [players]
  );
  const currentPlayer = currentPlayerIndex >= 0 ? players[currentPlayerIndex] : null;

  const [revealState, setRevealState] = useState<RevealState>("HANDOFF");
  const [desktopMode, setDesktopMode] = useState(false);
  const [isArming, setIsArming] = useState(false);
  const [peekRatio, setPeekRatio] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hasPeekedEnough, setHasPeekedEnough] = useState(false);
  const [failedDragAttempts, setFailedDragAttempts] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [holdPressed, setHoldPressed] = useState(false);

  const dragStartRef = useRef<number | null>(null);
  const dragDistanceRef = useRef(0);
  const crossedThresholdRef = useRef(false);
  const holdRevealReadyRef = useRef(false);
  const armingTimerRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const holdRafRef = useRef<number | null>(null);

  const revealedCount = useMemo(
    () => players.filter((player) => player.revealed).length,
    [players]
  );

  const progress = players.length > 0 ? (revealedCount / players.length) * 100 : 0;
  const currentDisplayIndex = currentPlayer ? currentPlayerIndex + 1 : players.length;
  const canGoNext = Boolean(currentPlayer && hasPeekedEnough);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const query = window.matchMedia("(pointer: fine), (min-width: 1024px)");
    const update = () => setDesktopMode(query.matches);
    update();

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }

    query.addListener(update);
    return () => query.removeListener(update);
  }, []);

  useEffect(() => {
    setRevealState("HANDOFF");
    setIsArming(false);
    setPeekRatio(0);
    setIsDragging(false);
    setHasPeekedEnough(false);
    setFailedDragAttempts(0);
    setHoldProgress(0);
    setHoldPressed(false);
    dragStartRef.current = null;
    dragDistanceRef.current = 0;
    crossedThresholdRef.current = false;
    holdRevealReadyRef.current = false;
    holdStartRef.current = null;

    if (armingTimerRef.current !== null) {
      window.clearTimeout(armingTimerRef.current);
      armingTimerRef.current = null;
    }
    if (holdRafRef.current !== null) {
      window.cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }
  }, [currentPlayer?.id]);

  useEffect(() => {
    return () => {
      if (armingTimerRef.current !== null) {
        window.clearTimeout(armingTimerRef.current);
      }
      if (holdRafRef.current !== null) {
        window.cancelAnimationFrame(holdRafRef.current);
      }
    };
  }, []);

  const markPeekAsRead = () => {
    if (!hasPeekedEnough) {
      setHasPeekedEnough(true);
      triggerHaptic(enableHaptics);
    }
  };

  const startArming = () => {
    if (isArming) return;
    setIsArming(true);
    armingTimerRef.current = window.setTimeout(() => {
      setIsArming(false);
      setRevealState("ARMED");
      armingTimerRef.current = null;
    }, ARMING_DELAY_MS);
  };

  const updatePeekFromDrag = (distance: number) => {
    const nextRatio = Math.max(0, Math.min(1, distance / MAX_DRAG_DISTANCE));
    setPeekRatio(nextRatio);

    if (nextRatio >= SAFE_READING_THRESHOLD && !crossedThresholdRef.current) {
      crossedThresholdRef.current = true;
      markPeekAsRead();
    }
  };

  const startSwipe = (clientY: number) => {
    if (desktopMode || revealState !== "ARMED" || accessibleRevealMode) return;
    setIsDragging(true);
    setRevealState("PEEKING");
    dragStartRef.current = clientY;
    dragDistanceRef.current = 0;
    crossedThresholdRef.current = false;
    setPeekRatio(0);
  };

  const moveSwipe = (clientY: number) => {
    if (!isDragging || revealState !== "PEEKING" || desktopMode || accessibleRevealMode) return;
    const startY = dragStartRef.current;
    if (startY === null) return;
    const distance = Math.max(0, Math.min(MAX_DRAG_DISTANCE, startY - clientY));
    dragDistanceRef.current = distance;
    updatePeekFromDrag(distance);
  };

  const finishSwipe = () => {
    if (!isDragging || desktopMode || accessibleRevealMode) return;
    const ratio = dragDistanceRef.current / MAX_DRAG_DISTANCE;
    if (ratio < 0.15) {
      setFailedDragAttempts((value) => value + 1);
    }

    setIsDragging(false);
    dragStartRef.current = null;
    dragDistanceRef.current = 0;
    crossedThresholdRef.current = false;

    setPeekRatio(0);
    setRevealState("ARMED");
  };

  const holdLoop = () => {
    if (holdStartRef.current === null) return;
    const elapsed = Date.now() - holdStartRef.current;
    const revealRatio = Math.min(1, elapsed / HOLD_REVEAL_THRESHOLD_MS);
    const passRatio = Math.min(1, elapsed / HOLD_PASS_THRESHOLD_MS);

    setHoldProgress(passRatio);

    if (revealRatio >= 1 && !holdRevealReadyRef.current) {
      holdRevealReadyRef.current = true;
      setRevealState("PEEKING");
    }

    if (passRatio >= 1) {
      markPeekAsRead();
    }

    holdRafRef.current = window.requestAnimationFrame(holdLoop);
  };

  const startHoldPeek = () => {
    if (!accessibleRevealMode || desktopMode || revealState !== "ARMED") return;
    setHoldPressed(true);
    setHoldProgress(0);
    holdRevealReadyRef.current = false;
    holdStartRef.current = Date.now();
    holdRafRef.current = window.requestAnimationFrame(holdLoop);
  };

  const stopHoldPeek = () => {
    if (!accessibleRevealMode || desktopMode) return;
    setHoldPressed(false);
    setHoldProgress(0);
    holdRevealReadyRef.current = false;
    holdStartRef.current = null;

    if (holdRafRef.current !== null) {
      window.cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }

    if (revealState === "PEEKING") {
      setRevealState("ARMED");
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    if (accessibleRevealMode) {
      startHoldPeek();
      return;
    }
    startSwipe(event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    if (accessibleRevealMode) return;
    moveSwipe(event.clientY);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (accessibleRevealMode) {
      stopHoldPeek();
      return;
    }
    finishSwipe();
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (accessibleRevealMode) {
      startHoldPeek();
      return;
    }
    startSwipe(event.touches[0]?.clientY ?? 0);
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (accessibleRevealMode) return;
    moveSwipe(event.touches[0]?.clientY ?? 0);
  };

  const handleTouchEnd = () => {
    if (accessibleRevealMode) {
      stopHoldPeek();
      return;
    }
    finishSwipe();
  };

  const handleDesktopReveal = () => {
    if (revealState !== "ARMED") return;
    setRevealState("REVEALED_PERSISTENT");
    markPeekAsRead();
  };

  const handleDesktopClose = () => {
    if (revealState !== "REVEALED_PERSISTENT") return;
    setRevealState("ARMED");
  };

  const handleNextPlayer = () => {
    if (!currentPlayer || !canGoNext) return;
    setRevealState("DONE_PLAYER");
    window.setTimeout(() => {
      onPlayerRevealed(currentPlayer.id);
    }, 110);
  };

  const renderSensitiveContent = () => {
    if (!currentPlayer || !word) return null;

    return (
      <div className="grid h-full place-content-center gap-4 px-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Tu rol</p>
        <p className="text-4xl font-black leading-none sm:text-5xl">
          {currentPlayer.role === "IMPOSTOR" ? "ERES IMPOSTOR" : "ERES CIVIL"}
        </p>

        {currentPlayer.role === "CIVIL" ? (
          <div className="grid gap-2">
            {category ? <p className="text-sm text-muted">Categoría: {category.name}</p> : null}
            <p className="text-5xl font-black leading-tight text-ink sm:text-6xl">{word}</p>
          </div>
        ) : showCategoryToImpostor && category ? (
          <p className="text-3xl font-black leading-tight text-ink">Categoría: {category.name}</p>
        ) : (
          <p className="text-sm text-muted">Sin pista: escucha y deduce.</p>
        )}
      </div>
    );
  };

  const showSensitiveOnMobile = currentPlayer && revealState === "PEEKING" && !desktopMode;
  const showSensitiveOnDesktop = currentPlayer && revealState === "REVEALED_PERSISTENT" && desktopMode;
  const revealRatioForMask = accessibleRevealMode ? (revealState === "PEEKING" ? 1 : 0) : peekRatio;

  return (
    <section className="card min-h-[calc(100svh-11rem)] p-6 md:p-8">
      <header className="grid gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Paso 2</p>
        <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl focus:outline-none">
          Revelación
        </h2>
        <p className="text-sm text-muted">Privado, sin filtraciones: una persona a la vez.</p>
      </header>

      <div className="mt-5 rounded-3xl border border-white/10 bg-surface/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Jugador</p>
            <p className="text-4xl font-semibold tabular-nums">{currentDisplayIndex}/{players.length}</p>
          </div>
          <p className="text-sm text-muted">Listos: {revealedCount}</p>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-4 grid max-h-24 gap-2 overflow-auto pr-1 sm:grid-cols-2">
          {players.map((player) => (
            <div
              key={player.id}
              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${
                player.revealed ? "border-accent/50 bg-accent/10 text-ink" : "border-white/10 bg-white/5 text-muted"
              }`}
            >
              <span className="truncate pr-2">{player.name}</span>
              <span aria-hidden="true">{player.revealed ? "✓" : "·"}</span>
            </div>
          ))}
        </div>
      </div>

      {!currentPlayer ? (
        <div className="mt-6 rounded-3xl border border-white/10 bg-surface2/70 p-8 text-center">
          <p className="text-3xl font-semibold">Todos listos</p>
          <p className="mt-2 text-sm text-muted">Cada jugador ya vio su turno de forma privada.</p>
          <button type="button" className="btn-primary mt-6 w-full justify-center py-4 text-base" onClick={onStartRound}>
            Iniciar ronda
          </button>
        </div>
      ) : null}

      {currentPlayer && revealState === "HANDOFF" ? (
        <div className="mt-6 rounded-3xl border border-white/10 bg-surface2/80 p-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Handoff privado</p>
          <p className="mt-3 text-lg text-muted">No mires la pantalla</p>
          <p className="mt-1 text-sm text-muted">Pásale el celular a:</p>
          <p className="mt-2 text-4xl font-semibold text-ink">{currentPlayer.name}</p>
          <button
            type="button"
            className="btn-primary mt-7 w-full justify-center py-4 text-base"
            onClick={startArming}
            disabled={isArming}
          >
            {isArming ? "Preparando privacidad..." : "Listo"}
          </button>
          {isArming ? <p className="mt-2 text-xs text-muted">Espera un segundo antes del gesto.</p> : null}
        </div>
      ) : null}

      {currentPlayer && (revealState === "ARMED" || revealState === "PEEKING" || revealState === "REVEALED_PERSISTENT") ? (
        <div className="mt-6">
          <div
            className="relative mx-auto h-[410px] w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-surface2/95 via-surface/90 to-base/95 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            role="presentation"
          >
            {!desktopMode ? (
              <>
                {showSensitiveOnMobile ? (
                  <div
                    className="absolute inset-0"
                    style={{ clipPath: `inset(${(1 - revealRatioForMask) * 100}% 0 0 0)` }}
                  >
                    {renderSensitiveContent()}
                  </div>
                ) : null}

              <div
                  className={`absolute inset-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1.2,0.36,1)] ${isDragging ? "duration-75 ease-linear" : ""}`}
                style={{ transform: `translateY(${-peekRatio * (MAX_DRAG_DISTANCE - 30)}px)` }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/6 via-surface2/95 to-surface/98 backdrop-blur-[1.2px]" />
                <div className="absolute inset-x-0 top-0 h-16 bg-white/[0.04]" />
                <div className="absolute inset-x-6 bottom-6 text-center">
                  <p className="text-sm text-muted">
                    {accessibleRevealMode ? "Mantén presionado para ver" : "Arrastra hacia arriba para ver"}
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-75"
                      style={{ width: `${(accessibleRevealMode ? holdProgress : peekRatio) * 100}%` }}
                    />
                  </div>
                  {!accessibleRevealMode ? (
                    <p className="mt-2 text-xs text-muted">Zona de lectura segura: 70%</p>
                  ) : (
                    <p className="mt-2 text-xs text-muted">
                      {holdPressed ? "Sostén 0.8s para habilitar Siguiente" : "Mantén pulsado para revelar"}
                    </p>
                  )}
                </div>
              </div>
              </>
            ) : (
              <div className={`reveal-flip-card h-full min-h-full w-full max-w-none ${showSensitiveOnDesktop ? "is-flipping" : ""}`}>
                <div className="reveal-flip-face reveal-flip-front">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">Desktop</p>
                  <p className="mt-3 text-2xl font-semibold">Tarjeta cerrada</p>
                  <p className="mt-2 text-sm text-muted">Click para revelar y luego cerrar.</p>
                  <button type="button" className="btn-primary mt-5" onClick={handleDesktopReveal}>
                    Revelar
                  </button>
                </div>
                <div className="reveal-flip-face reveal-flip-back">
                  {showSensitiveOnDesktop ? (
                    <div className="grid w-full gap-4">
                      {renderSensitiveContent()}
                      <button type="button" className="btn-secondary mx-auto mt-2" onClick={handleDesktopClose}>
                        Cerrar tarjeta
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">Contenido protegido.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {failedDragAttempts >= 2 && !accessibleRevealMode && !desktopMode ? (
            <p className="mt-3 text-center text-xs text-muted">
              ¿Problemas con el gesto? Activa modo accesible en Configuración avanzada.
            </p>
          ) : null}
        </div>
      ) : null}

      {currentPlayer && revealState === "DONE_PLAYER" ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-surface/70 p-5 text-center text-sm text-muted">
          Pasando al siguiente jugador...
        </div>
      ) : null}

      {currentPlayer ? (
        <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl border border-white/10 bg-base/90 p-3 shadow-[0_14px_40px_rgba(0,0,0,0.5)] backdrop-blur">
          <button
            type="button"
            className="btn-primary w-full justify-center py-4 text-base"
            disabled={!canGoNext || revealState === "DONE_PLAYER"}
            onClick={handleNextPlayer}
          >
            Siguiente
          </button>
          {!hasPeekedEnough ? (
            <p className="mt-2 text-center text-xs text-muted">Haz un peek suficiente para habilitar continuar.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
