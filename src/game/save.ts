/**
 * SaveManager — all progress lives in localStorage so the player can
 * close the tab and come back. Reads are lazy (never during SSR).
 */

export interface LevelRecord {
  done: boolean;
  bestTime: number | null;
  bestDeaths: number | null;
  coins: string[];
  stars: number;
}

export interface Settings {
  music: boolean;
  sfx: boolean;
  reducedShake: boolean;
  reducedFlash: boolean;
  highContrast: boolean;
  bigControls: boolean;
}

export interface SaveData {
  version: 1;
  levels: Record<number, LevelRecord>;
  deaths: number;
  secrets: string[];
  achievements: string[];
  settings: Settings;
  chaosUnlocked: boolean;
  endingSeen: boolean;
  levelSelectUnlockAll: boolean;
}

const KEY = "chaos-bolt-save-v1";

export const defaultSettings: Settings = {
  music: true,
  sfx: true,
  reducedShake: false,
  reducedFlash: false,
  highContrast: false,
  bigControls: false,
};

function blank(): SaveData {
  return {
    version: 1,
    levels: {},
    deaths: 0,
    secrets: [],
    achievements: [],
    settings: { ...defaultSettings },
    chaosUnlocked: false,
    endingSeen: false,
    levelSelectUnlockAll: false,
  };
}

export function loadSave(): SaveData {
  if (typeof window === "undefined") return blank();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const base = blank();
    return {
      ...base,
      ...parsed,
      levels: { ...base.levels, ...(parsed.levels ?? {}) },
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      secrets: parsed.secrets ?? [],
      achievements: parsed.achievements ?? [],
    };
  } catch {
    return blank();
  }
}

export function writeSave(data: SaveData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage full or blocked — game still playable this session */
  }
}

export function levelRecord(save: SaveData, index: number): LevelRecord {
  return save.levels[index] ?? { done: false, bestTime: null, bestDeaths: null, coins: [], stars: 0 };
}

export function isUnlocked(save: SaveData, index: number): boolean {
  if (index === 0) return true;
  if (save.levelSelectUnlockAll) return true;
  return levelRecord(save, index - 1).done;
}

export function highestUnlocked(save: SaveData, total: number): number {
  let i = 0;
  while (i < total - 1 && levelRecord(save, i).done) i++;
  return i;
}

export function totalCoins(save: SaveData): number {
  return Object.values(save.levels).reduce((n, r) => n + r.coins.length, 0);
}

export function completedCount(save: SaveData): number {
  return Object.values(save.levels).filter((r) => r.done).length;
}

export function resetSave(): SaveData {
  const fresh = blank();
  writeSave(fresh);
  return fresh;
}
