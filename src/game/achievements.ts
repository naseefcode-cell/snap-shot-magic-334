import type { SaveData } from "./save";
import { bonusCount, completedCount, levelRecord, totalCoins, worldDone } from "./save";

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  check: (s: SaveData) => boolean;
}

const flawless = (s: SaveData) => Object.values(s.levels).filter((r) => r.done && r.bestDeaths === 0).length;

export const ACHIEVEMENTS: Achievement[] = [
  { id: "boot", name: "Cold Boot", desc: "Clear the first level.", check: (s) => completedCount(s) >= 1 },
  { id: "w1", name: "Chaos Apprentice", desc: "Clear levels 1–5.", check: (s) => worldDone(s, 0) },
  { id: "ten", name: "Trap Reader", desc: "Clear 10 levels.", check: (s) => completedCount(s) >= 10 },
  { id: "twenty", name: "Still Standing", desc: "Clear 20 levels.", check: (s) => completedCount(s) >= 20 },
  { id: "w5", name: "Chaos Master", desc: "Clear levels 21–25.", check: (s) => worldDone(s, 4) },
  { id: "all", name: "Chaos Legend", desc: "Beat the Chaos Finale.", check: (s) => completedCount(s) >= 30 },
  { id: "tourist", name: "Trap Tourist", desc: "Fail 25 times.", check: (s) => s.deaths >= 25 },
  { id: "stillhere", name: "Still Here", desc: "Fail 100 times.", check: (s) => s.deaths >= 100 },
  { id: "indestructible", name: "Rebuilt Again", desc: "Fail 250 times.", check: (s) => s.deaths >= 250 },
  { id: "nope", name: "Nope", desc: "Fail 10 times in a single level run.", check: (s) => s.maxRunDeaths >= 10 },
  { id: "clean", name: "Untouched", desc: "Clear any level without a single death.", check: (s) => flawless(s) >= 1 },
  { id: "flawless5", name: "Untouchable", desc: "Clear 5 levels without dying.", check: (s) => flawless(s) >= 5 },
  {
    id: "bigbrain",
    name: "Big Brain",
    desc: "Clear a level from 21–30 without dying.",
    check: (s) => Array.from({ length: 10 }, (_, i) => levelRecord(s, 20 + i)).some((r) => r.done && r.bestDeaths === 0),
  },
  { id: "zap10", name: "First Zap", desc: "Defeat 10 enemies.", check: (s) => s.enemies >= 10 },
  { id: "zap50", name: "Bug Exterminator", desc: "Defeat 50 enemies.", check: (s) => s.enemies >= 50 },
  { id: "coins10", name: "Pocket Static", desc: "Collect 10 Chaos Coins.", check: (s) => totalCoins(s) >= 10 },
  { id: "coinhunter", name: "Coin Hunter", desc: "Collect 40 Chaos Coins.", check: (s) => totalCoins(s) >= 40 },
  { id: "coins100", name: "Spare Change", desc: "Collect 100 Chaos Coins.", check: (s) => totalCoins(s) >= 100 },
  { id: "secret5", name: "Wall Whisperer", desc: "Find 5 hidden secrets.", check: (s) => s.secrets.length >= 5 },
  { id: "stars", name: "Triple Spark", desc: "Earn three stars on 5 levels.", check: (s) => Object.values(s.levels).filter((r) => r.stars >= 3).length >= 5 },
  { id: "bonus10", name: "Overachiever", desc: "Complete 5 bonus objectives.", check: (s) => bonusCount(s) >= 5 },
  { id: "chaos", name: "Chaos Tourist", desc: "Clear a level in Chaos Mode.", check: (s) => s.chaosClears >= 1 },
];

/** Returns the newly-earned achievements and mutates the save's list. */
export function evaluateAchievements(save: SaveData): Achievement[] {
  const earned: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!save.achievements.includes(a.id) && a.check(save)) {
      save.achievements.push(a.id);
      earned.push(a);
    }
  }
  return earned;
}
