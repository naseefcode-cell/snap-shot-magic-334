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
  { id: "five", name: "Warming Up", desc: "Clear 5 levels.", check: (s) => completedCount(s) >= 5 },
  { id: "ten", name: "Trap Reader", desc: "Clear 10 levels.", check: (s) => completedCount(s) >= 10 },
  { id: "twenty", name: "Still Standing", desc: "Clear 20 levels.", check: (s) => completedCount(s) >= 20 },
  { id: "all", name: "Halfway Hero", desc: "Clear 30 levels.", check: (s) => completedCount(s) >= 30 },
  { id: "w1", name: "Chaos Apprentice", desc: "Complete World 1.", check: (s) => worldDone(s, 0) },
  { id: "w3", name: "Chaos Master", desc: "Complete World 3.", check: (s) => worldDone(s, 2) },
  { id: "w4", name: "Factory Reset", desc: "Complete World 4.", check: (s) => worldDone(s, 3) },
  { id: "w5", name: "Overthinker", desc: "Complete World 5.", check: (s) => worldDone(s, 4) },
  { id: "legend", name: "Chaos Legend", desc: "Complete all 60 levels.", check: (s) => completedCount(s) >= 60 },
  { id: "tourist", name: "Trap Tourist", desc: "Fail 25 times.", check: (s) => s.deaths >= 25 },
  { id: "stubborn", name: "Stubborn Circuit", desc: "Fail 50 times.", check: (s) => s.deaths >= 50 },
  { id: "stillhere", name: "Still Here", desc: "Fail 100 times.", check: (s) => s.deaths >= 100 },
  { id: "indestructible", name: "Rebuilt Again", desc: "Fail 200 times.", check: (s) => s.deaths >= 200 },
  { id: "nope", name: "Nope", desc: "Fail 5 times in a single level run.", check: (s) => s.maxRunDeaths >= 5 },
  { id: "clean", name: "Untouched", desc: "Clear any level without a single death.", check: (s) => flawless(s) >= 1 },
  { id: "flawless5", name: "Untouchable", desc: "Clear 5 levels without dying.", check: (s) => flawless(s) >= 5 },
  {
    id: "bigbrain",
    name: "Big Brain",
    desc: "Clear a Mind Games level without dying.",
    check: (s) => Array.from({ length: 10 }, (_, i) => levelRecord(s, 40 + i)).some((r) => r.done && r.bestDeaths === 0),
  },
  { id: "coins10", name: "Pocket Static", desc: "Collect 10 Chaos Coins.", check: (s) => totalCoins(s) >= 10 },
  { id: "coinhunter", name: "Coin Hunter", desc: "Collect 25 Chaos Coins.", check: (s) => totalCoins(s) >= 25 },
  { id: "coins40", name: "Coin Magnet", desc: "Collect 40 Chaos Coins.", check: (s) => totalCoins(s) >= 40 },
  { id: "coins100", name: "Spare Change", desc: "Collect 100 Chaos Coins.", check: (s) => totalCoins(s) >= 100 },
  { id: "secret5", name: "Wall Whisperer", desc: "Find 5 hidden secrets.", check: (s) => s.secrets.length >= 5 },
  { id: "treasure", name: "Treasure Hunter", desc: "Find 10 hidden secrets.", check: (s) => s.secrets.length >= 10 },
  { id: "stars", name: "Triple Spark", desc: "Earn three stars on 5 levels.", check: (s) => Object.values(s.levels).filter((r) => r.stars >= 3).length >= 5 },
  { id: "bonus10", name: "Overachiever", desc: "Complete 5 bonus objectives.", check: (s) => bonusCount(s) >= 5 },
  { id: "chaos", name: "Chaos Tourist", desc: "Clear a level in Chaos Mode.", check: (s) => s.chaosClears >= 1 },
  { id: "endless", name: "Endless Intern", desc: "Score 1000 in Endless Trap Mode.", check: (s) => s.endlessBest >= 1000 },
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
