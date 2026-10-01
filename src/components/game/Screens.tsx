import type { ReactNode } from "react";
import { ACHIEVEMENTS } from "@/game/achievements";
import { LEVELS, TOTAL_COINS, TOTAL_LEVELS, TOTAL_SECRETS } from "@/game/levels";
import type { HudState, LevelResult } from "@/game/types";
import {
  completedCount,
  isUnlocked,
  levelRecord,
  totalCoins,
  type SaveData,
  type Settings,
} from "@/game/save";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`w-full max-w-2xl border-2 border-border bg-panel/95 p-5 shadow-[0_0_40px_rgba(0,0,0,0.6)] backdrop-blur-sm sm:p-7 ${className}`}
    >
      {children}
    </div>
  );
}

export function Btn({
  children,
  onClick,
  variant = "default",
  className = "",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "ghost";
  className?: string;
  disabled?: boolean;
}) {
  const styles =
    variant === "primary"
      ? "border-primary bg-primary text-primary-foreground hover:brightness-110"
      : variant === "ghost"
        ? "border-transparent bg-transparent text-muted-foreground hover:text-foreground"
        : "hover:border-primary hover:text-primary";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`arcade-btn ${styles} active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="text-coin" aria-label={`${n} of 3 stars`}>
      {"★".repeat(n)}
      <span className="text-muted-foreground">{"★".repeat(3 - n)}</span>
    </span>
  );
}

export function Title() {
  return (
    <div className="text-center">
      <h1 className="font-pixel text-2xl leading-relaxed text-primary sm:text-4xl">CHAOS BOLT</h1>
      <p className="mt-3 text-xs uppercase tracking-[0.3em] text-muted-foreground sm:text-sm">
        a trap platformer that lies to you
      </p>
    </div>
  );
}

export function MenuScreen({
  save,
  onPlay,
  onLevels,
  onAchievements,
  onSettings,
  onChaos,
}: {
  save: SaveData;
  onPlay: () => void;
  onLevels: () => void;
  onAchievements: () => void;
  onSettings: () => void;
  onChaos: () => void;
}) {
  const done = completedCount(save);
  return (
    <Panel className="max-w-xl text-center">
      <Title />
      <div className="mx-auto mt-7 grid gap-3">
        <Btn variant="primary" onClick={onPlay}>
          {done === 0 ? "PLAY" : "CONTINUE"}
        </Btn>
        <Btn onClick={onLevels}>LEVEL SELECT</Btn>
        <Btn onClick={onAchievements}>ACHIEVEMENTS</Btn>
        <Btn onClick={onSettings}>SETTINGS</Btn>
        {save.chaosUnlocked && (
          <Btn onClick={onChaos} className="border-secret text-secret">
            CHAOS MODE
          </Btn>
        )}
      </div>
      <p className="mt-6 text-[11px] text-muted-foreground">
        {done}/{TOTAL_LEVELS} levels · {totalCoins(save)}/{TOTAL_COINS} coins · {save.secrets.length}/
        {TOTAL_SECRETS} secrets · {save.deaths} failures
      </p>
    </Panel>
  );
}

export function LevelSelect({
  save,
  chaos,
  onPick,
  onBack,
}: {
  save: SaveData;
  chaos: boolean;
  onPick: (i: number) => void;
  onBack: () => void;
}) {
  return (
    <Panel>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-pixel text-sm text-primary sm:text-base">
          {chaos ? "CHAOS MODE" : "LEVEL SELECT"}
        </h2>
        <Btn variant="ghost" onClick={onBack}>
          BACK
        </Btn>
      </div>
      <div className="mt-5 grid max-h-[52vh] grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-6">
        {LEVELS.map((lvl, i) => {
          const rec = levelRecord(save, i);
          const unlocked = chaos ? true : isUnlocked(save, i);
          return (
            <button
              key={lvl.name}
              type="button"
              disabled={!unlocked}
              onClick={() => onPick(i)}
              title={unlocked ? lvl.name : "locked"}
              className={`flex aspect-square flex-col items-center justify-center border-2 text-[10px] transition-colors ${
                unlocked
                  ? rec.done
                    ? "border-primary/70 bg-primary/10 text-primary hover:bg-primary/20"
                    : "border-border bg-secondary/40 text-foreground hover:border-primary"
                  : "cursor-not-allowed border-border/40 bg-background/60 text-muted-foreground/40"
              }`}
            >
              <span className="font-pixel text-[11px]">{String(i + 1).padStart(2, "0")}</span>
              <span className="mt-0.5 text-[8px] leading-none">
                {unlocked ? (rec.done ? "★".repeat(rec.stars) : "· · ·") : "LOCK"}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">
        {chaos
          ? "Every run rolls a random modifier. The original levels stay untouched."
          : "Finish a level to unlock the next one. Replay anytime to hunt coins."}
      </p>
    </Panel>
  );
}

export function AchievementsScreen({ save, onBack }: { save: SaveData; onBack: () => void }) {
  return (
    <Panel>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-pixel text-sm text-primary sm:text-base">ACHIEVEMENTS</h2>
        <Btn variant="ghost" onClick={onBack}>
          BACK
        </Btn>
      </div>
      <ul className="mt-5 grid max-h-[52vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const got = save.achievements.includes(a.id);
          return (
            <li
              key={a.id}
              className={`border-2 p-3 ${got ? "border-primary/60 bg-primary/10" : "border-border bg-background/50"}`}
            >
              <p className={`font-pixel text-[10px] ${got ? "text-primary" : "text-muted-foreground"}`}>
                {got ? a.name : "???"}
              </p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{a.desc}</p>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[11px] text-muted-foreground">
        {save.achievements.length}/{ACHIEVEMENTS.length} unlocked
      </p>
    </Panel>
  );
}

export function SettingsPanel({
  settings,
  onToggle,
  onBack,
  onReset,
}: {
  settings: Settings;
  onToggle: (key: keyof Settings) => void;
  onBack: () => void;
  onReset: () => void;
}) {
  const rows: { key: keyof Settings; label: string }[] = [
    { key: "music", label: "MUSIC" },
    { key: "sfx", label: "SOUND EFFECTS" },
    { key: "reducedShake", label: "REDUCED SCREEN SHAKE" },
    { key: "reducedFlash", label: "REDUCED FLASHING" },
    { key: "highContrast", label: "HIGH CONTRAST" },
    { key: "bigControls", label: "LARGER TOUCH CONTROLS" },
  ];
  return (
    <Panel>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-pixel text-sm text-primary sm:text-base">SETTINGS</h2>
        <Btn variant="ghost" onClick={onBack}>
          BACK
        </Btn>
      </div>
      <ul className="mt-5 grid gap-2">
        {rows.map((r) => (
          <li key={r.key}>
            <button
              type="button"
              onClick={() => onToggle(r.key)}
              className="flex w-full items-center justify-between border-2 border-border bg-background/50 px-4 py-3 text-left hover:border-primary"
            >
              <span className="font-pixel text-[10px]">{r.label}</span>
              <span
                className={`font-pixel text-[10px] ${settings[r.key] ? "text-primary" : "text-muted-foreground"}`}
              >
                {settings[r.key] ? "ON" : "OFF"}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex justify-end">
        <Btn variant="ghost" onClick={onReset} className="text-destructive">
          ERASE ALL PROGRESS
        </Btn>
      </div>
    </Panel>
  );
}

export function PauseScreen({
  onResume,
  onRestart,
  onLevels,
  onSettings,
}: {
  onResume: () => void;
  onRestart: () => void;
  onLevels: () => void;
  onSettings: () => void;
}) {
  return (
    <Panel className="max-w-sm text-center">
      <h2 className="font-pixel text-sm text-primary">PAUSED</h2>
      <div className="mt-6 grid gap-3">
        <Btn variant="primary" onClick={onResume}>
          RESUME
        </Btn>
        <Btn onClick={onRestart}>RESTART</Btn>
        <Btn onClick={onLevels}>LEVEL SELECT</Btn>
        <Btn onClick={onSettings}>SETTINGS</Btn>
      </div>
    </Panel>
  );
}

export function CompleteScreen({
  result,
  isLast,
  onNext,
  onReplay,
  onLevels,
}: {
  result: LevelResult;
  isLast: boolean;
  onNext: () => void;
  onReplay: () => void;
  onLevels: () => void;
}) {
  return (
    <Panel className="max-w-sm text-center">
      <h2 className="font-pixel text-sm text-primary sm:text-base">LEVEL COMPLETE!</h2>
      <p className="mt-3 text-lg">
        <Stars n={result.stars} />
      </p>
      <dl className="mx-auto mt-5 grid max-w-[15rem] gap-1.5 text-[12px]">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Deaths</dt>
          <dd>{result.deaths}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Time</dt>
          <dd>{result.time.toFixed(2)}s</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Coins</dt>
          <dd className="text-coin">
            {result.coins}/{result.coinTotal}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Enemies zapped</dt>
          <dd>{result.enemies}</dd>
        </div>
      </dl>
      <div className="mt-6 grid gap-3">
        <Btn variant="primary" onClick={onNext}>
          {isLast ? "SEE WHAT HAPPENS" : "NEXT LEVEL"}
        </Btn>
        <Btn onClick={onReplay}>REPLAY</Btn>
        <Btn onClick={onLevels}>LEVEL SELECT</Btn>
      </div>
    </Panel>
  );
}

export function EndingScreen({
  save,
  onMenu,
  onChaos,
}: {
  save: SaveData;
  onMenu: () => void;
  onChaos: () => void;
}) {
  return (
    <Panel className="max-w-xl text-center">
      <h2 className="font-pixel text-base text-primary sm:text-xl">TRUE ENDING</h2>
      <div className="mt-5 space-y-3 text-[12px] leading-relaxed text-muted-foreground">
        <p>
          The little robot reaches the final door, opens it, and finds the level designer sitting
          inside with a clipboard.
        </p>
        <p>
          "Thirty levels," they say, "and you fell {save.deaths} times. Statistically, the floor won."
        </p>
        <p>
          The robot blinks twice, unscrews the clipboard, and writes one line under the last trap:
          <span className="text-primary"> "now do it again, but worse."</span>
        </p>
        <p className="text-secret">CHAOS MODE UNLOCKED.</p>
      </div>
      <div className="mt-7 grid gap-3">
        <Btn variant="primary" onClick={onChaos} className="border-secret bg-secret text-background">
          ENTER CHAOS MODE
        </Btn>
        <Btn onClick={onMenu}>BACK TO MENU</Btn>
      </div>
    </Panel>
  );
}

export function Hud({
  hud,
  chaosLabel,
  onPause,
}: {
  hud: HudState;
  chaosLabel: string | null;
  onPause: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2 sm:p-3">
      <div className="font-pixel text-[9px] leading-relaxed text-primary sm:text-[11px]">
        <p>
          LEVEL {String(hud.level + 1).padStart(2, "0")} · {hud.name}
        </p>
        <p className="mt-1 text-foreground">
          DEATHS {hud.deaths} · COINS {hud.coins}/{hud.coinTotal} · {hud.time.toFixed(1)}s
        </p>
        {chaosLabel && <p className="mt-1 text-secret">CHAOS: {chaosLabel}</p>}
      </div>
      <button
        type="button"
        onClick={onPause}
        className="pointer-events-auto border-2 border-border bg-panel/80 px-3 py-2 font-pixel text-[9px] text-muted-foreground hover:text-primary sm:text-[10px]"
      >
        ESC
      </button>
    </div>
  );
}

export function GameMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-[26%]">
      <p className="animate-fade-in border border-accent/40 bg-background/70 px-3 py-1.5 text-center font-pixel text-[9px] uppercase text-accent sm:text-[11px]">
        {message}
      </p>
    </div>
  );
}

export function TouchControls({
  big,
  onHold,
  onRestart,
}: {
  big: boolean;
  onHold: (action: "left" | "right" | "jump" | "shoot", down: boolean) => void;
  onRestart: () => void;
}) {
  const size = big ? "h-24 w-24 text-base" : "h-18 w-18 text-sm";
  const pad = (action: "left" | "right" | "jump" | "shoot", label: string, extra = "") => (
    <button
      type="button"
      aria-label={action}
      onPointerDown={(e) => {
        e.preventDefault();
        onHold(action, true);
      }}
      onPointerUp={() => onHold(action, false)}
      onPointerLeave={() => onHold(action, false)}
      onPointerCancel={() => onHold(action, false)}
      onContextMenu={(e) => e.preventDefault()}
      className={`${size} ${extra} flex select-none items-center justify-center rounded-full border-2 border-border bg-panel/80 font-pixel text-primary active:bg-primary/25`}
    >
      {label}
    </button>
  );
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3 sm:p-5 lg:hidden">
      <div className="pointer-events-auto flex gap-3">
        {pad("left", "◀")}
        {pad("right", "▶")}
      </div>
      <div className="pointer-events-auto flex items-end gap-3">
        <button
          type="button"
          aria-label="restart"
          onClick={onRestart}
          className="flex h-12 w-12 select-none items-center justify-center rounded-full border-2 border-border bg-panel/80 font-pixel text-[10px] text-muted-foreground active:bg-accent/30"
        >
          R
        </button>
        {pad("shoot", "✦", "border-accent/70")}
        {pad("jump", "▲", "border-primary/70")}
      </div>
    </div>
  );
}

export function Toasts({ items }: { items: { id: number; name: string; desc: string }[] }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 flex flex-col items-center gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className="animate-fade-in border-2 border-coin bg-panel/95 px-4 py-2 text-center"
        >
          <p className="font-pixel text-[9px] text-coin">ACHIEVEMENT · {t.name}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">{t.desc}</p>
        </div>
      ))}
    </div>
  );
}
