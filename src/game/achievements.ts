import type { SaveData } from "./save";
import { completedCount, totalCoins } from "./save";

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  check: (s: SaveData) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "boot", name: "Cold Boot", desc: "Clear the first level.", check: (s) => completedCount(s) >= 1 },
  { id: "five", name: "Warming Up", desc: "Clear 5 levels.", check: (s) => completedCount(s) >= 5 },
  { id: "ten", name: "Trap Reader", desc: "Clear 10 levels.", check: (s) => completedCount(s) >= 10 },
  { id: "twenty", name: "Still Standing", desc: "Clear 20 levels.", check: (s) => completedCount(s) >= 20 },
  { id: "all", name: "Master of Chaos", desc: "Clear all 30 levels.", check: (s) => completedCount(s) >= 30 },
  { id: "stubborn", name: "Stubborn Circuit", desc: "Fail 50 times.", check: (s) => s.deaths >= 50 },
  { id: "indestructible", name: "Rebuilt Again", desc: "Fail 200 times.", check: (s) => s.deaths >= 200 },
  { id: "clean", name: "Untouched", desc: "Clear any level without a single death.", check: (s) => Object.values(s.levels).some((r) => r.done && r.bestDeaths === 0) },
  { id: "coins10", name: "Pocket Static", desc: "Collect 10 Chaos Coins.", check: (s) => totalCoins(s) >= 10 },
  { id: "coins40", name: "Coin Magnet", desc: "Collect 40 Chaos Coins.", check: (s) => totalCoins(s) >= 40 },
  { id: "secret5", name: "Wall Whisperer", desc: "Find 5 hidden secrets.", check: (s) => s.secrets.length >= 5 },
  { id: "stars", name: "Triple Spark", desc: "Earn three stars on 5 levels.", check: (s) => Object.values(s.levels).filter((r) => r.stars >= 3).length >= 5 },
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
