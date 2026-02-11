"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type RefObject
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

const ARMING_DELAY_MS = 600;
const MAX_CURTAIN_LIFT = 220;

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
  accessibleRevealMode: _accessibleRevealMode,
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
  const [hasPeekedEnough, setHasPeekedEnough] = useState(false);
  const armingTimerRef = useRef<number | null>(null);

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
    setHasPeekedEnough(false);

    if (armingTimerRef.current !== null) {
      window.clearTimeout(armingTimerRef.current);
      armingTimerRef.current = null;
    }
  }, [currentPlayer?.id]);

  useEffect(() => {
    return () => {
      if (armingTimerRef.current !== null) {
        window.clearTimeout(armingTimerRef.current);
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

  const handleMobileToggleReveal = () => {
    if (desktopMode) return;
    if (revealState === "ARMED") {
      setRevealState("PEEKING");
      markPeekAsRead();
      return;
    }
    if (revealState === "PEEKING") {
      setRevealState("ARMED");
    }
  };

  const handleContextMenu = (event: MouseEvent<HTMLDivElement | HTMLButtonElement>) => {
    if (!desktopMode) {
      event.preventDefault();
    }
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
  const curtainLift = (revealState === "PEEKING" ? 1 : 0) * MAX_CURTAIN_LIFT;

  return (
    <section className="card min-h-[calc(100svh-11rem)] p-6 md:p-8">
      <header className="grid gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Paso 2</p>
        <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl focus:outline-none">
          Revelación
        </h2>
        <p className="text-sm text-muted">Privado, sin filtraciones: una persona a la vez.</p>
      </header>

      <div className="mt-5 rounded-3xl border border-white/10 bg-surface/50 p-4 select-none">
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
          {isArming ? <p className="mt-2 text-xs text-muted">Espera un segundo antes de revelar.</p> : null}
        </div>
      ) : null}

      {currentPlayer && (revealState === "ARMED" || revealState === "PEEKING" || revealState === "REVEALED_PERSISTENT") ? (
        <div className="mt-6">
          {!desktopMode ? (
            <div className="mb-3 rounded-2xl border border-white/10 bg-surface/60 px-3 py-2 text-center">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Modo móvil: botón revelar/ocultar</p>
            </div>
          ) : null}

          <div
            className="relative mx-auto h-[410px] w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-surface2/95 via-surface/90 to-base/95 shadow-[0_24px_80px_rgba(0,0,0,0.45)] select-none"
            style={{
              userSelect: "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
              WebkitTapHighlightColor: "transparent"
            }}
            onContextMenu={handleContextMenu}
            onDragStart={(event) => event.preventDefault()}
            role="presentation"
          >
            {!desktopMode ? (
              <>
                {showSensitiveOnMobile ? (
                  <div className="absolute inset-0 pointer-events-none select-none">{renderSensitiveContent()}</div>
                ) : null}

                <div
                  className="absolute inset-0 transition-transform duration-200 ease-out"
                  style={{ transform: `translateY(${-curtainLift}px)` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-surface2/96 via-surface2/94 to-surface/96 shadow-[inset_0_10px_30px_rgba(255,255,255,0.04),inset_0_-30px_50px_rgba(0,0,0,0.32)] backdrop-blur-[1.4px]" />
                  <div className="absolute inset-x-0 top-5 grid place-items-center">
                    <span className="h-1.5 w-16 rounded-full bg-white/30" aria-hidden="true" />
                  </div>
                  <div className="absolute inset-x-6 bottom-24 text-center">
                    <p className="text-sm text-muted">{showSensitiveOnMobile ? "Contenido visible" : "Contenido oculto"}</p>
                    <p className="mt-2 text-xs text-muted">Usa el botón para revelar y ocultar.</p>
                  </div>
                </div>

                <div className="absolute inset-x-6 bottom-6">
                  <button
                    type="button"
                    className={`w-full justify-center py-4 text-base ${showSensitiveOnMobile ? "btn-secondary" : "btn-primary"}`}
                    onClick={handleMobileToggleReveal}
                    onContextMenu={handleContextMenu}
                  >
                    {showSensitiveOnMobile ? "Ocultar" : "Revelar"}
                  </button>
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
        </div>
      ) : null}

      {currentPlayer && revealState === "DONE_PLAYER" ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-surface/70 p-5 text-center text-sm text-muted">
          Pasando al siguiente jugador...
        </div>
      ) : null}

      {currentPlayer && revealState !== "HANDOFF" && revealState !== "DONE_PLAYER" ? (
        <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl border border-white/10 bg-base/90 p-3 shadow-[0_14px_40px_rgba(0,0,0,0.5)] backdrop-blur">
          <button
            type="button"
            className="btn-primary w-full justify-center py-4 text-base"
            disabled={!canGoNext}
            onClick={handleNextPlayer}
          >
            Siguiente
          </button>
          {!hasPeekedEnough ? (
            <p className="mt-2 text-center text-xs text-muted">Revela al menos una vez para continuar.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
