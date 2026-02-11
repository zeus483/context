"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import CategoriesSection from "../components/CategoriesSection";
import ConfigSection from "../components/ConfigSection";
import GameStepper from "../components/GameStepper";
import OnboardingModal from "../components/OnboardingModal";
import PlayersSection from "../components/PlayersSection";
import ResumeGameModal from "../components/ResumeGameModal";
import RevealSection from "../components/RevealSection";
import ResultSection from "../components/ResultSection";
import RoundSection from "../components/RoundSection";
import VoteModal from "../components/VoteModal";
import { DEFAULT_CATEGORIES } from "../src/content/categories";
import type {
  Category,
  CategoryWord,
  Difficulty,
  GamePhase,
  GamePreset,
  GameSettings,
  GameState,
  GameWinner,
  Player,
  TieStrategy
} from "../src/types";
import {
  computeRecommendedTimeMinutes,
  createPlayers,
  difficultyMatchesWord,
  normalizePlayerNames,
  pickRandom,
  validateConfig
} from "../src/utils/game";

const STORAGE_KEYS = {
  settings: "impostor-clasico.settings",
  categories: "impostor-clasico.customCategories",
  activeGame: "impostor-clasico.active-game",
  onboardingSeen: "impostor-clasico.onboarding.seen"
};

const DEFAULT_PLAYER_COUNT = 6;
const DEFAULT_IMPOSTOR_COUNT = 1;
const DEFAULT_SHOW_CATEGORY = true;
const DEFAULT_TIMER_CAP_MINUTES = 12;
const DEFAULT_DIFFICULTY: Difficulty = "medium";
const DEFAULT_TIE_STRATEGY: TieStrategy = "MINI_REVOTE";

const MAX_RECENT_WORDS = 50;
const DEFAULT_SELECTED_CATEGORY_IDS = DEFAULT_CATEGORIES.map((category) => category.id);

const PRESET_CONFIG: Record<
  GamePreset,
  {
    difficulty: Difficulty;
    tieStrategy: TieStrategy;
    includeHardAmbiguous: boolean;
    timerCapMinutes: number;
    durationOffset: number;
  }
> = {
  QUICK: {
    difficulty: "easy",
    tieStrategy: "NO_ELIMINATION",
    includeHardAmbiguous: false,
    timerCapMinutes: 12,
    durationOffset: -1
  },
  CLASSIC: {
    difficulty: "medium",
    tieStrategy: "MINI_REVOTE",
    includeHardAmbiguous: false,
    timerCapMinutes: 12,
    durationOffset: 0
  },
  LONG: {
    difficulty: "hard",
    tieStrategy: "MINI_REVOTE",
    includeHardAmbiguous: true,
    timerCapMinutes: 15,
    durationOffset: 1
  }
};

const STEP_META: Record<GamePhase, { index: number; label: string }> = {
  CONFIG: { index: 1, label: "Configuración" },
  REVEAL: { index: 2, label: "Revelación" },
  RUNNING: { index: 3, label: "Ronda en curso" },
  ENDED: { index: 4, label: "Resultado final" }
};

const STEP_LABELS = ["Configuración", "Revelación", "Ronda en curso", "Resultado final"];

function getRecommendedSeconds(playerCount: number, impostorCount: number, capMinutes: number): number {
  return computeRecommendedTimeMinutes(playerCount, impostorCount, capMinutes) * 60;
}

function getDefaultSettings(): GameSettings {
  const durationSeconds = getRecommendedSeconds(
    DEFAULT_PLAYER_COUNT,
    DEFAULT_IMPOSTOR_COUNT,
    DEFAULT_TIMER_CAP_MINUTES
  );
  return {
    playerCount: DEFAULT_PLAYER_COUNT,
    impostorCount: DEFAULT_IMPOSTOR_COUNT,
    showCategoryToImpostor: DEFAULT_SHOW_CATEGORY,
    durationSeconds,
    selectedCategoryIds: DEFAULT_SELECTED_CATEGORY_IDS,
    difficulty: DEFAULT_DIFFICULTY,
    includeHardAmbiguous: false,
    tieStrategy: DEFAULT_TIE_STRATEGY,
    timerCapMinutes: DEFAULT_TIMER_CAP_MINUTES,
    accessibleRevealMode: false,
    enableHaptics: true,
    enableFinalBeep: false,
    preset: "CLASSIC"
  };
}

const initialSettings = getDefaultSettings();

const initialState: GameState = {
  phase: "CONFIG",
  settings: initialSettings,
  playerNames: Array.from({ length: DEFAULT_PLAYER_COUNT }, (_, index) => `Jugador ${index + 1}`),
  players: [],
  category: null,
  word: null,
  roundEndsAt: null,
  remainingSeconds: initialSettings.durationSeconds,
  miniRound: {
    active: false,
    tiedPlayerIds: [],
    endsAt: null,
    attempt: 0
  },
  winner: null,
  durationOverride: false,
  recentWords: [],
  lastCategoryId: null
};

type Action =
  | { type: "SET_PLAYER_COUNT"; value: number }
  | { type: "SET_IMPOSTOR_COUNT"; value: number }
  | { type: "SET_PLAYER_NAME"; index: number; value: string }
  | { type: "SET_PLAYER_NAMES"; names: string[] }
  | { type: "AUTOFILL_NAMES" }
  | { type: "TOGGLE_CATEGORY"; id: string }
  | { type: "SET_SELECTED_CATEGORIES"; ids: string[] }
  | { type: "SET_SHOW_CATEGORY"; value: boolean }
  | { type: "SET_DURATION"; seconds: number }
  | { type: "RESET_DURATION_TO_RECOMMENDED" }
  | { type: "SET_DIFFICULTY"; value: Difficulty }
  | { type: "SET_INCLUDE_HARD_AMBIGUOUS"; value: boolean }
  | { type: "SET_TIE_STRATEGY"; value: TieStrategy }
  | { type: "SET_TIMER_CAP"; value: number }
  | { type: "SET_ACCESSIBLE_REVEAL_MODE"; value: boolean }
  | { type: "SET_ENABLE_HAPTICS"; value: boolean }
  | { type: "SET_ENABLE_FINAL_BEEP"; value: boolean }
  | { type: "APPLY_PRESET"; preset: GamePreset }
  | {
      type: "PREPARE_GAME";
      payload: { category: Category; word: string; players: Player[]; recentWords: string[]; lastCategoryId: string };
    }
  | { type: "MARK_REVEALED"; id: string }
  | { type: "START_ROUND"; roundEndsAt: number }
  | { type: "TICK"; now: number }
  | { type: "START_MINI_ROUND"; tiedPlayerIds: string[]; endsAt: number; attempt: number }
  | { type: "CLEAR_MINI_ROUND" }
  | { type: "RESOLVE_VOTE"; id: string; wasImpostor: boolean }
  | { type: "END_GAME"; winner: GameWinner }
  | { type: "RESET_CONFIG" }
  | { type: "RESET_DEFAULTS"; payload: GameSettings }
  | { type: "RESTART_GAME" }
  | {
      type: "HYDRATE_SETTINGS";
      payload: {
        settings: Partial<GameSettings>;
        durationOverride: boolean;
        playerNames: string[];
      };
    }
  | { type: "REPLACE_STATE"; payload: GameState };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "SET_PLAYER_COUNT": {
      const playerCount = clamp(action.value, 3, 20);
      const maxImpostors = Math.max(1, Math.floor(playerCount / 2));
      const impostorCount = Math.min(state.settings.impostorCount, maxImpostors);
      const playerNames = Array.from(
        { length: playerCount },
        (_, index) => state.playerNames[index] ?? `Jugador ${index + 1}`
      );
      const recommendedSeconds = getRecommendedSeconds(playerCount, impostorCount, state.settings.timerCapMinutes);
      const durationSeconds = state.durationOverride
        ? Math.max(300, Math.min(state.settings.durationSeconds, state.settings.timerCapMinutes * 60))
        : recommendedSeconds;

      return {
        ...state,
        settings: { ...state.settings, playerCount, impostorCount, durationSeconds, preset: null },
        playerNames,
        remainingSeconds: state.phase === "CONFIG" ? durationSeconds : state.remainingSeconds
      };
    }
    case "SET_IMPOSTOR_COUNT": {
      const maxImpostors = Math.max(1, Math.floor(state.settings.playerCount / 2));
      const impostorCount = clamp(action.value, 1, maxImpostors);
      const recommendedSeconds = getRecommendedSeconds(
        state.settings.playerCount,
        impostorCount,
        state.settings.timerCapMinutes
      );
      const durationSeconds = state.durationOverride
        ? Math.max(300, Math.min(state.settings.durationSeconds, state.settings.timerCapMinutes * 60))
        : recommendedSeconds;

      return {
        ...state,
        settings: { ...state.settings, impostorCount, durationSeconds, preset: null },
        remainingSeconds: state.phase === "CONFIG" ? durationSeconds : state.remainingSeconds
      };
    }
    case "SET_PLAYER_NAME": {
      const playerNames = [...state.playerNames];
      playerNames[action.index] = action.value;
      return { ...state, playerNames };
    }
    case "SET_PLAYER_NAMES": {
      return { ...state, playerNames: action.names };
    }
    case "AUTOFILL_NAMES": {
      const playerNames = Array.from(
        { length: state.settings.playerCount },
        (_, index) => `Jugador ${index + 1}`
      );
      return { ...state, playerNames };
    }
    case "TOGGLE_CATEGORY": {
      const exists = state.settings.selectedCategoryIds.includes(action.id);
      const selectedCategoryIds = exists
        ? state.settings.selectedCategoryIds.filter((id) => id !== action.id)
        : [...state.settings.selectedCategoryIds, action.id];
      return { ...state, settings: { ...state.settings, selectedCategoryIds, preset: null } };
    }
    case "SET_SELECTED_CATEGORIES": {
      const unique = Array.from(new Set(action.ids));
      return { ...state, settings: { ...state.settings, selectedCategoryIds: unique } };
    }
    case "SET_SHOW_CATEGORY": {
      return {
        ...state,
        settings: { ...state.settings, showCategoryToImpostor: action.value, preset: null }
      };
    }
    case "SET_DURATION": {
      const durationSeconds = clamp(action.seconds, 300, state.settings.timerCapMinutes * 60);
      return {
        ...state,
        settings: { ...state.settings, durationSeconds, preset: null },
        remainingSeconds: state.phase === "CONFIG" ? durationSeconds : state.remainingSeconds,
        durationOverride: true
      };
    }
    case "RESET_DURATION_TO_RECOMMENDED": {
      const durationSeconds = getRecommendedSeconds(
        state.settings.playerCount,
        state.settings.impostorCount,
        state.settings.timerCapMinutes
      );
      return {
        ...state,
        settings: { ...state.settings, durationSeconds },
        durationOverride: false,
        remainingSeconds: state.phase === "CONFIG" ? durationSeconds : state.remainingSeconds
      };
    }
    case "SET_DIFFICULTY": {
      return {
        ...state,
        settings: { ...state.settings, difficulty: action.value, preset: null }
      };
    }
    case "SET_INCLUDE_HARD_AMBIGUOUS": {
      return {
        ...state,
        settings: { ...state.settings, includeHardAmbiguous: action.value, preset: null }
      };
    }
    case "SET_TIE_STRATEGY": {
      return {
        ...state,
        settings: { ...state.settings, tieStrategy: action.value, preset: null }
      };
    }
    case "SET_TIMER_CAP": {
      const timerCapMinutes = action.value;
      const recommendedSeconds = getRecommendedSeconds(
        state.settings.playerCount,
        state.settings.impostorCount,
        timerCapMinutes
      );
      const durationSeconds = state.durationOverride
        ? clamp(state.settings.durationSeconds, 300, timerCapMinutes * 60)
        : recommendedSeconds;
      return {
        ...state,
        settings: { ...state.settings, timerCapMinutes, durationSeconds, preset: null },
        remainingSeconds: state.phase === "CONFIG" ? durationSeconds : state.remainingSeconds
      };
    }
    case "SET_ACCESSIBLE_REVEAL_MODE": {
      return {
        ...state,
        settings: { ...state.settings, accessibleRevealMode: action.value, preset: null }
      };
    }
    case "SET_ENABLE_HAPTICS": {
      return {
        ...state,
        settings: { ...state.settings, enableHaptics: action.value }
      };
    }
    case "SET_ENABLE_FINAL_BEEP": {
      return {
        ...state,
        settings: { ...state.settings, enableFinalBeep: action.value }
      };
    }
    case "APPLY_PRESET": {
      const presetConfig = PRESET_CONFIG[action.preset];
      const recommended = getRecommendedSeconds(
        state.settings.playerCount,
        state.settings.impostorCount,
        presetConfig.timerCapMinutes
      );
      const adjustedSeconds = clamp(
        recommended + presetConfig.durationOffset * 60,
        300,
        presetConfig.timerCapMinutes * 60
      );

      return {
        ...state,
        settings: {
          ...state.settings,
          difficulty: presetConfig.difficulty,
          tieStrategy: presetConfig.tieStrategy,
          includeHardAmbiguous: presetConfig.includeHardAmbiguous,
          timerCapMinutes: presetConfig.timerCapMinutes,
          durationSeconds: adjustedSeconds,
          preset: action.preset
        },
        durationOverride: false,
        remainingSeconds: state.phase === "CONFIG" ? adjustedSeconds : state.remainingSeconds
      };
    }
    case "PREPARE_GAME": {
      return {
        ...state,
        phase: "REVEAL",
        players: action.payload.players,
        category: action.payload.category,
        word: action.payload.word,
        roundEndsAt: null,
        remainingSeconds: state.settings.durationSeconds,
        miniRound: {
          active: false,
          tiedPlayerIds: [],
          endsAt: null,
          attempt: 0
        },
        winner: null,
        recentWords: action.payload.recentWords,
        lastCategoryId: action.payload.lastCategoryId
      };
    }
    case "MARK_REVEALED": {
      const players = state.players.map((player) =>
        player.id === action.id ? { ...player, revealed: true } : player
      );
      return { ...state, players };
    }
    case "START_ROUND": {
      return {
        ...state,
        phase: "RUNNING",
        roundEndsAt: action.roundEndsAt,
        remainingSeconds: state.settings.durationSeconds,
        miniRound: {
          active: false,
          tiedPlayerIds: [],
          endsAt: null,
          attempt: 0
        }
      };
    }
    case "TICK": {
      if (state.phase !== "RUNNING" || !state.roundEndsAt) {
        return state;
      }

      const remainingSeconds = Math.max(0, Math.ceil((state.roundEndsAt - action.now) / 1000));
      if (remainingSeconds <= 0) {
        return {
          ...state,
          remainingSeconds: 0,
          phase: "ENDED",
          winner: "IMPOSTORS",
          miniRound: {
            active: false,
            tiedPlayerIds: [],
            endsAt: null,
            attempt: 0
          }
        };
      }

      return { ...state, remainingSeconds };
    }
    case "START_MINI_ROUND": {
      return {
        ...state,
        miniRound: {
          active: true,
          tiedPlayerIds: action.tiedPlayerIds,
          endsAt: action.endsAt,
          attempt: action.attempt
        }
      };
    }
    case "CLEAR_MINI_ROUND": {
      return {
        ...state,
        miniRound: {
          active: false,
          tiedPlayerIds: [],
          endsAt: null,
          attempt: 0
        }
      };
    }
    case "RESOLVE_VOTE": {
      const players = state.players.map((player) => {
        if (player.id !== action.id) return player;
        if (action.wasImpostor) {
          return { ...player, eliminated: true };
        }
        return { ...player, accusedCount: player.accusedCount + 1 };
      });

      const remainingImpostors = players.filter(
        (player) => player.role === "IMPOSTOR" && !player.eliminated
      );
      if (remainingImpostors.length === 0) {
        return {
          ...state,
          players,
          phase: "ENDED",
          winner: "GROUP",
          miniRound: {
            active: false,
            tiedPlayerIds: [],
            endsAt: null,
            attempt: 0
          }
        };
      }

      return {
        ...state,
        players,
        miniRound: {
          active: false,
          tiedPlayerIds: [],
          endsAt: null,
          attempt: 0
        }
      };
    }
    case "END_GAME": {
      return {
        ...state,
        phase: "ENDED",
        winner: action.winner,
        miniRound: {
          active: false,
          tiedPlayerIds: [],
          endsAt: null,
          attempt: 0
        }
      };
    }
    case "RESET_CONFIG": {
      return {
        ...state,
        phase: "CONFIG",
        players: [],
        category: null,
        word: null,
        roundEndsAt: null,
        remainingSeconds: state.settings.durationSeconds,
        miniRound: {
          active: false,
          tiedPlayerIds: [],
          endsAt: null,
          attempt: 0
        },
        winner: null
      };
    }
    case "RESET_DEFAULTS": {
      const settings = action.payload;
      return {
        ...state,
        phase: "CONFIG",
        settings,
        playerNames: Array.from({ length: settings.playerCount }, (_, index) => `Jugador ${index + 1}`),
        players: [],
        category: null,
        word: null,
        roundEndsAt: null,
        remainingSeconds: settings.durationSeconds,
        miniRound: {
          active: false,
          tiedPlayerIds: [],
          endsAt: null,
          attempt: 0
        },
        winner: null,
        durationOverride: false
      };
    }
    case "RESTART_GAME": {
      return {
        ...state,
        phase: "CONFIG",
        players: [],
        category: null,
        word: null,
        roundEndsAt: null,
        remainingSeconds: state.settings.durationSeconds,
        miniRound: {
          active: false,
          tiedPlayerIds: [],
          endsAt: null,
          attempt: 0
        },
        winner: null
      };
    }
    case "HYDRATE_SETTINGS": {
      const nextSettings = {
        ...state.settings,
        ...action.payload.settings
      };

      const playerCount = clamp(nextSettings.playerCount ?? DEFAULT_PLAYER_COUNT, 3, 20);
      const maxImpostors = Math.max(1, Math.floor(playerCount / 2));
      const impostorCount = clamp(nextSettings.impostorCount ?? DEFAULT_IMPOSTOR_COUNT, 1, maxImpostors);
      const timerCapMinutes = nextSettings.timerCapMinutes ?? DEFAULT_TIMER_CAP_MINUTES;
      const recommendedSeconds = getRecommendedSeconds(playerCount, impostorCount, timerCapMinutes);
      const durationOverride = action.payload.durationOverride;
      const durationSeconds = durationOverride
        ? clamp(nextSettings.durationSeconds ?? recommendedSeconds, 300, timerCapMinutes * 60)
        : recommendedSeconds;

      const playerNames = Array.from({ length: playerCount }, (_, index) =>
        action.payload.playerNames?.[index] ?? `Jugador ${index + 1}`
      );

      return {
        ...state,
        settings: {
          ...nextSettings,
          playerCount,
          impostorCount,
          timerCapMinutes,
          durationSeconds,
          selectedCategoryIds:
            nextSettings.selectedCategoryIds && nextSettings.selectedCategoryIds.length > 0
              ? nextSettings.selectedCategoryIds
              : DEFAULT_SELECTED_CATEGORY_IDS,
          difficulty: nextSettings.difficulty ?? DEFAULT_DIFFICULTY,
          tieStrategy: nextSettings.tieStrategy ?? DEFAULT_TIE_STRATEGY,
          includeHardAmbiguous: nextSettings.includeHardAmbiguous ?? false,
          showCategoryToImpostor: nextSettings.showCategoryToImpostor ?? DEFAULT_SHOW_CATEGORY,
          accessibleRevealMode: nextSettings.accessibleRevealMode ?? false,
          enableHaptics: nextSettings.enableHaptics ?? true,
          enableFinalBeep: nextSettings.enableFinalBeep ?? false,
          preset: nextSettings.preset ?? null
        },
        playerNames,
        durationOverride,
        remainingSeconds: durationSeconds
      };
    }
    case "REPLACE_STATE": {
      return action.payload;
    }
    default:
      return state;
  }
}

function isWordAllowed(wordEntry: CategoryWord, settings: GameSettings): boolean {
  const matchesDifficulty = difficultyMatchesWord(
    settings.difficulty,
    wordEntry.difficulty,
    settings.includeHardAmbiguous
  );
  if (!matchesDifficulty) return false;
  if (wordEntry.flags?.ambiguous && !settings.includeHardAmbiguous) return false;
  return true;
}

function inferDifficultyFromWord(word: string): Difficulty {
  const compactLength = word.replace(/\s+/g, "").length;
  if (compactLength <= 6) return "easy";
  if (compactLength <= 11) return "medium";
  return "hard";
}

function normalizeCategoryFromStorage(rawCategory: unknown): Category | null {
  if (!rawCategory || typeof rawCategory !== "object") return null;
  const candidate = rawCategory as {
    id?: unknown;
    name?: unknown;
    words?: unknown;
    custom?: unknown;
  };
  if (typeof candidate.id !== "string" || typeof candidate.name !== "string" || !Array.isArray(candidate.words)) {
    return null;
  }

  const words = candidate.words
    .map((entry) => {
      if (typeof entry === "string") {
        return {
          word: entry,
          difficulty: inferDifficultyFromWord(entry)
        } satisfies CategoryWord;
      }
      if (!entry || typeof entry !== "object") return null;
      const wordEntry = entry as { word?: unknown; difficulty?: unknown; flags?: unknown };
      if (typeof wordEntry.word !== "string") return null;
      const difficulty =
        wordEntry.difficulty === "easy" || wordEntry.difficulty === "medium" || wordEntry.difficulty === "hard"
          ? wordEntry.difficulty
          : inferDifficultyFromWord(wordEntry.word);
      return {
        word: wordEntry.word,
        difficulty,
        flags:
          wordEntry.flags && typeof wordEntry.flags === "object"
            ? ({ ambiguous: Boolean((wordEntry.flags as { ambiguous?: unknown }).ambiguous) } as CategoryWord["flags"])
            : undefined
      } satisfies CategoryWord;
    })
    .filter((entry): entry is CategoryWord => Boolean(entry));

  if (words.length === 0) return null;

  return {
    id: candidate.id,
    name: candidate.name,
    words,
    custom: Boolean(candidate.custom)
  };
}

function playBeep() {
  if (typeof window === "undefined") return;
  const audioContext = new window.AudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
  gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.15, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.15);
  oscillator.onended = () => {
    audioContext.close();
  };
}

export default function HomePage() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [isVoteOpen, setIsVoteOpen] = useState(false);
  const [voteResult, setVoteResult] = useState<{ name: string; wasImpostor: boolean } | null>(null);
  const [roundNotice, setRoundNotice] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [resumeCandidate, setResumeCandidate] = useState<GameState | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);

  const stepContainerRef = useRef<HTMLDivElement | null>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const firstPhaseRender = useRef(true);
  const lastBeepSecondRef = useRef<number | null>(null);

  const allCategories = useMemo(
    () => [...DEFAULT_CATEGORIES, ...customCategories],
    [customCategories]
  );

  const selectedCategories = useMemo(
    () => allCategories.filter((category) => state.settings.selectedCategoryIds.includes(category.id)),
    [allCategories, state.settings.selectedCategoryIds]
  );

  const maxImpostors = Math.max(1, Math.floor(state.settings.playerCount / 2));
  const recommendedMinutes = computeRecommendedTimeMinutes(
    state.settings.playerCount,
    state.settings.impostorCount,
    state.settings.timerCapMinutes
  );

  const configValidation = validateConfig({
    playerCount: state.settings.playerCount,
    impostorCount: state.settings.impostorCount,
    playerNames: state.playerNames,
    selectedCategoryIds: state.settings.selectedCategoryIds
  });

  const currentStep = STEP_META[state.phase];

  const alivePlayers = useMemo(
    () => state.players.filter((player) => !player.eliminated),
    [state.players]
  );

  useEffect(() => {
    if (state.phase !== "RUNNING") return;
    const interval = setInterval(() => {
      dispatch({ type: "TICK", now: Date.now() });
    }, 500);
    return () => clearInterval(interval);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "RUNNING") {
      lastBeepSecondRef.current = null;
      return;
    }
    if (!state.settings.enableFinalBeep) return;
    if (state.remainingSeconds <= 10 && state.remainingSeconds > 0) {
      if (lastBeepSecondRef.current !== state.remainingSeconds) {
        playBeep();
        lastBeepSecondRef.current = state.remainingSeconds;
      }
    }
  }, [state.phase, state.remainingSeconds, state.settings.enableFinalBeep]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedCategories = localStorage.getItem(STORAGE_KEYS.categories);
      const parsedCategories = storedCategories ? (JSON.parse(storedCategories) as unknown[]) : [];
      const normalizedCategories = Array.isArray(parsedCategories)
        ? parsedCategories
            .map((category) => normalizeCategoryFromStorage(category))
            .filter((category): category is Category => Boolean(category))
        : [];
      setCustomCategories(normalizedCategories);

      const storedSettings = localStorage.getItem(STORAGE_KEYS.settings);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings) as Partial<GameSettings> & {
          playerNames?: string[];
          durationOverride?: boolean;
        };

        const availableIds = new Set(
          [...DEFAULT_CATEGORIES, ...normalizedCategories].map(
            (category) => category.id
          )
        );

        const selectedCategoryIds = Array.isArray(parsed.selectedCategoryIds)
          ? parsed.selectedCategoryIds.filter((id) => availableIds.has(id))
          : DEFAULT_SELECTED_CATEGORY_IDS;

        dispatch({
          type: "HYDRATE_SETTINGS",
          payload: {
            settings: {
              ...parsed,
              selectedCategoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : DEFAULT_SELECTED_CATEGORY_IDS
            },
            durationOverride: Boolean(parsed.durationOverride),
            playerNames: parsed.playerNames ?? []
          }
        });
      }

      const activeSnapshot = localStorage.getItem(STORAGE_KEYS.activeGame);
      if (activeSnapshot) {
        const parsedSnapshot = JSON.parse(activeSnapshot) as GameState;
        if (parsedSnapshot.phase !== "CONFIG") {
          setResumeCandidate(parsedSnapshot);
          setShowResumeModal(true);
        }
      }

      const onboardingSeen = localStorage.getItem(STORAGE_KEYS.onboardingSeen) === "1";
      if (!onboardingSeen) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error("No se pudieron cargar preferencias", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({
        ...state.settings,
        playerNames: state.playerNames,
        durationOverride: state.durationOverride
      })
    );
  }, [state.settings, state.playerNames, state.durationOverride]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(customCategories));
  }, [customCategories]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (state.phase === "CONFIG") {
      localStorage.removeItem(STORAGE_KEYS.activeGame);
      return;
    }
    localStorage.setItem(STORAGE_KEYS.activeGame, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const availableIds = new Set(allCategories.map((category) => category.id));
    const filtered = state.settings.selectedCategoryIds.filter((id) => availableIds.has(id));
    if (filtered.length === 0 && allCategories.length > 0) {
      dispatch({ type: "SET_SELECTED_CATEGORIES", ids: allCategories.map((category) => category.id) });
      return;
    }
    if (filtered.length !== state.settings.selectedCategoryIds.length) {
      dispatch({ type: "SET_SELECTED_CATEGORIES", ids: filtered });
    }
  }, [allCategories, state.settings.selectedCategoryIds]);

  useEffect(() => {
    if (state.phase !== "RUNNING" && isVoteOpen) {
      setIsVoteOpen(false);
      setVoteResult(null);
    }
  }, [state.phase, isVoteOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (firstPhaseRender.current) {
      firstPhaseRender.current = false;
      return;
    }
    stepContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const focusTimer = window.setTimeout(() => {
      stepHeadingRef.current?.focus({ preventScroll: true });
    }, 150);
    return () => window.clearTimeout(focusTimer);
  }, [state.phase]);

  const pickWordForCategory = (
    category: Category,
    settings: GameSettings,
    recentWords: string[],
    keepCurrentWord: boolean,
    currentWord: string | null
  ): string | null => {
    const eligibleWords = category.words.filter((entry) => isWordAllowed(entry, settings));
    if (eligibleWords.length === 0) {
      return null;
    }

    if (keepCurrentWord && currentWord) {
      const current = eligibleWords.find((entry) => entry.word === currentWord);
      if (current) return current.word;
    }

    const recentSet = new Set(recentWords.map((word) => word.toLowerCase()));
    const withoutRecent = eligibleWords.filter((entry) => !recentSet.has(entry.word.toLowerCase()));
    const pool = withoutRecent.length > 0 ? withoutRecent : eligibleWords;

    return pickRandom(pool).word;
  };

  const prepareGame = (options?: {
    forceCategoryId?: string;
    keepCurrentWord?: boolean;
    overrideDifficulty?: Difficulty;
  }) => {
    if (!configValidation.valid) return;

    const sanitizedNames = normalizePlayerNames(state.playerNames, state.settings.playerCount);
    dispatch({ type: "SET_PLAYER_NAMES", names: sanitizedNames });

    const effectiveSettings: GameSettings = {
      ...state.settings,
      difficulty: options?.overrideDifficulty ?? state.settings.difficulty
    };

    const selected = selectedCategories.length > 0 ? selectedCategories : DEFAULT_CATEGORIES;

    let categoryPool = selected.filter((category) =>
      category.words.some((wordEntry) => isWordAllowed(wordEntry, effectiveSettings))
    );

    if (categoryPool.length === 0) {
      categoryPool = selected;
    }

    if (!options?.forceCategoryId && categoryPool.length > 3 && state.lastCategoryId) {
      const withoutLastCategory = categoryPool.filter((category) => category.id !== state.lastCategoryId);
      if (withoutLastCategory.length > 0) {
        categoryPool = withoutLastCategory;
      }
    }

    const category = options?.forceCategoryId
      ? categoryPool.find((item) => item.id === options.forceCategoryId) ??
        selected.find((item) => item.id === options.forceCategoryId) ??
        pickRandom(categoryPool)
      : pickRandom(categoryPool);

    const chosenWord = pickWordForCategory(
      category,
      effectiveSettings,
      state.recentWords,
      Boolean(options?.keepCurrentWord),
      state.word
    );

    if (!chosenWord) {
      setRoundNotice("No hay palabras válidas con esta dificultad. Ajusta dificultad o categorías.");
      return;
    }

    const players = createPlayers(sanitizedNames, state.settings.impostorCount);
    const recentWords = [...state.recentWords, chosenWord].slice(-MAX_RECENT_WORDS);

    dispatch({
      type: "PREPARE_GAME",
      payload: {
        category,
        word: chosenWord,
        players,
        recentWords,
        lastCategoryId: category.id
      }
    });
    setRoundNotice(null);
  };

  const handleVoteOpen = () => {
    if (state.phase !== "RUNNING") return;
    if (alivePlayers.length < 2) return;
    setVoteResult(null);
    setIsVoteOpen(true);
  };

  const handleVoteConfirm = (playerId: string) => {
    const target = state.players.find((player) => player.id === playerId);
    if (!target) return;

    const wasImpostor = target.role === "IMPOSTOR";
    dispatch({ type: "RESOLVE_VOTE", id: playerId, wasImpostor });
    setVoteResult({ name: target.name, wasImpostor });
    setRoundNotice(
      wasImpostor
        ? `✅ ${target.name} era impostor. Continúen la ronda.`
        : `❌ ${target.name} no era impostor.`
    );
  };

  const handleEndRound = () => {
    if (typeof window !== "undefined") {
      const shouldEnd = window.confirm("¿Seguro que quieres terminar la ronda ahora?");
      if (!shouldEnd) return;
    }
    const remainingImpostors = state.players.filter(
      (player) => player.role === "IMPOSTOR" && !player.eliminated
    );
    dispatch({ type: "END_GAME", winner: remainingImpostors.length === 0 ? "GROUP" : "IMPOSTORS" });
  };

  const handleResetDefaults = () => {
    if (typeof window !== "undefined") {
      const shouldReset = window.confirm("Esto restablecerá tu configuración de partida. ¿Continuar?");
      if (!shouldReset) return;
    }
    dispatch({ type: "RESET_DEFAULTS", payload: getDefaultSettings() });
    setRoundNotice(null);
  };

  const handleRestartGame = () => {
    if (typeof window !== "undefined") {
      const shouldRestart = window.confirm("Se reiniciará la partida activa. ¿Continuar?");
      if (!shouldRestart) return;
    }
    dispatch({ type: "RESTART_GAME" });
    setRoundNotice(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.activeGame);
    }
  };

  return (
    <>
      <main className="min-h-screen px-4 pb-10 pt-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
          <header className="px-1">
            <p className="text-xs uppercase tracking-[0.4em] text-muted">Impostor Clásico</p>
            <h1 className="font-display text-2xl sm:text-3xl">Single-focus. Privado. Listo para revancha.</h1>
          </header>

          <GameStepper
            currentStep={currentStep.index}
            totalSteps={STEP_LABELS.length}
            currentLabel={currentStep.label}
            stepLabels={STEP_LABELS}
          />

          <div ref={stepContainerRef} className="scroll-mt-40">
            {state.phase === "CONFIG" ? (
              <div className="animate-soft-in">
                <ConfigSection
                  headingRef={stepHeadingRef}
                  playerCount={state.settings.playerCount}
                  impostorCount={state.settings.impostorCount}
                  maxImpostors={maxImpostors}
                  showCategoryToImpostor={state.settings.showCategoryToImpostor}
                  durationMinutes={Math.round(state.settings.durationSeconds / 60)}
                  recommendedMinutes={recommendedMinutes}
                  timerCapMinutes={state.settings.timerCapMinutes}
                  difficulty={state.settings.difficulty}
                  tieStrategy={state.settings.tieStrategy}
                  preset={state.settings.preset}
                  includeHardAmbiguous={state.settings.includeHardAmbiguous}
                  accessibleRevealMode={state.settings.accessibleRevealMode}
                  enableHaptics={state.settings.enableHaptics}
                  enableFinalBeep={state.settings.enableFinalBeep}
                  errors={configValidation.errors}
                  onApplyPreset={(preset) => dispatch({ type: "APPLY_PRESET", preset })}
                  onPlayerCountChange={(value) => dispatch({ type: "SET_PLAYER_COUNT", value })}
                  onImpostorCountChange={(value) => dispatch({ type: "SET_IMPOSTOR_COUNT", value })}
                  onShowCategoryToggle={(value) => dispatch({ type: "SET_SHOW_CATEGORY", value })}
                  onDurationChange={(minutes) => dispatch({ type: "SET_DURATION", seconds: minutes * 60 })}
                  onDurationReset={() => dispatch({ type: "RESET_DURATION_TO_RECOMMENDED" })}
                  onDifficultyChange={(value) => dispatch({ type: "SET_DIFFICULTY", value })}
                  onTieStrategyChange={(value) => dispatch({ type: "SET_TIE_STRATEGY", value })}
                  onTimerCapChange={(value) => dispatch({ type: "SET_TIMER_CAP", value })}
                  onIncludeHardAmbiguousChange={(value) =>
                    dispatch({ type: "SET_INCLUDE_HARD_AMBIGUOUS", value })
                  }
                  onAccessibleRevealModeChange={(value) =>
                    dispatch({ type: "SET_ACCESSIBLE_REVEAL_MODE", value })
                  }
                  onEnableHapticsChange={(value) => dispatch({ type: "SET_ENABLE_HAPTICS", value })}
                  onEnableFinalBeepChange={(value) => dispatch({ type: "SET_ENABLE_FINAL_BEEP", value })}
                  onPrepare={() => prepareGame()}
                  onReset={handleResetDefaults}
                  onRestartGame={handleRestartGame}
                  onOpenHowToPlay={() => setShowOnboarding(true)}
                >
                  <PlayersSection
                    playerCount={state.settings.playerCount}
                    playerNames={state.playerNames}
                    onNameChange={(index, value) => dispatch({ type: "SET_PLAYER_NAME", index, value })}
                    onAutofill={() => dispatch({ type: "AUTOFILL_NAMES" })}
                  />
                  <CategoriesSection
                    categories={allCategories}
                    selectedIds={state.settings.selectedCategoryIds}
                    onToggle={(id) => dispatch({ type: "TOGGLE_CATEGORY", id })}
                    onAddCustom={(category) => {
                      setCustomCategories((prev) => [...prev, category]);
                      dispatch({
                        type: "SET_SELECTED_CATEGORIES",
                        ids: [...state.settings.selectedCategoryIds, category.id]
                      });
                    }}
                  />
                </ConfigSection>
              </div>
            ) : null}

            {state.phase === "REVEAL" ? (
              <div className="animate-soft-in">
                <RevealSection
                  headingRef={stepHeadingRef}
                  players={state.players}
                  category={state.category}
                  word={state.word}
                  showCategoryToImpostor={state.settings.showCategoryToImpostor}
                  accessibleRevealMode={state.settings.accessibleRevealMode}
                  enableHaptics={state.settings.enableHaptics}
                  onPlayerRevealed={(id) => dispatch({ type: "MARK_REVEALED", id })}
                  onStartRound={() =>
                    dispatch({
                      type: "START_ROUND",
                      roundEndsAt: Date.now() + state.settings.durationSeconds * 1000
                    })
                  }
                />
              </div>
            ) : null}

            {state.phase === "RUNNING" ? (
              <div className="animate-soft-in">
                <RoundSection
                  headingRef={stepHeadingRef}
                  remainingSeconds={state.remainingSeconds}
                  players={state.players}
                  roundNotice={roundNotice}
                  onVote={handleVoteOpen}
                  onEndRound={handleEndRound}
                />
              </div>
            ) : null}

            {state.phase === "ENDED" ? (
              <div className="animate-soft-in">
                <ResultSection
                  headingRef={stepHeadingRef}
                  winner={state.winner}
                  category={state.category}
                  word={state.word}
                  players={state.players}
                  onRematch={() => prepareGame()}
                  onChangeWord={() =>
                    prepareGame({ forceCategoryId: state.category ? state.category.id : undefined })
                  }
                  onNewConfig={() => dispatch({ type: "RESET_CONFIG" })}
                />
              </div>
            ) : null}
          </div>
        </div>

        <VoteModal
          open={isVoteOpen}
          players={alivePlayers}
          result={voteResult}
          onClose={() => {
            setIsVoteOpen(false);
            setVoteResult(null);
          }}
          onConfirm={handleVoteConfirm}
        />
      </main>

      <OnboardingModal
        open={showOnboarding}
        onClose={() => {
          setShowOnboarding(false);
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.onboardingSeen, "1");
          }
        }}
      />

      <ResumeGameModal
        open={showResumeModal}
        onResume={() => {
          if (!resumeCandidate) {
            setShowResumeModal(false);
            return;
          }
          dispatch({ type: "REPLACE_STATE", payload: resumeCandidate });
          setShowResumeModal(false);
          setResumeCandidate(null);
        }}
        onRestart={() => {
          setShowResumeModal(false);
          setResumeCandidate(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem(STORAGE_KEYS.activeGame);
          }
        }}
      />
    </>
  );
}
