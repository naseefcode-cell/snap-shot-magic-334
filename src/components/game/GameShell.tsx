import { useCallback, useEffect, useRef, useState } from "react";
import { GameEngine } from "@/game/engine";
import { InputManager } from "@/game/input";
import { audio } from "@/game/audio";
import { LEVELS, TOTAL_LEVELS, rollChaos } from "@/game/levels";
import { evaluateAchievements } from "@/game/achievements";
import {
  defaultSettings,
  highestUnlocked,
  levelRecord,
  loadSave,
  resetSave,
  writeSave,
  type SaveData,
  type Settings,
} from "@/game/save";
import type { ChaosModifiers, HudState, LevelResult } from "@/game/types";
import {
  AchievementsScreen,
  CompleteScreen,
  EndingScreen,
  Hud,
  LevelSelect,
  MenuScreen,
  PauseScreen,
  SettingsPanel,
  Toasts,
  TouchControls,
} from "./Screens";

type Screen =
  | "menu"
  | "levels"
  | "chaosLevels"
  | "achievements"
  | "settings"
  | "playing"
  | "paused"
  | "complete"
  | "ending";

export default function GameShell() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const inputRef = useRef<InputManager | null>(null);
  const levelRef = useRef(0);
  const chaosRef = useRef<ChaosModifiers | null>(null);
  const coinRef = useRef<Set<string>>(new Set());
  const secretRef = useRef<Set<string>>(new Set());
  const saveRef = useRef<SaveData | null>(null);
  const screenRef = useRef<Screen>("menu");

  const [save, setSave] = useState<SaveData | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");
  const [returnScreen, setReturnScreen] = useState<Screen>("menu");
  const [session, setSession] = useState(0);
  const [hud, setHud] = useState<HudState | null>(null);
  const [result, setResult] = useState<LevelResult | null>(null);
  const [chaosLabel, setChaosLabel] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: number; name: string; desc: string }[]>([]);

  screenRef.current = screen;
  const settings: Settings = save?.settings ?? defaultSettings;

  // ---------------------------------------------------------------- save I/O

  useEffect(() => {
    const loaded = loadSave();
    saveRef.current = loaded;
    setSave(loaded);
    audio.sfxOn = loaded.settings.sfx;
    audio.musicOn = loaded.settings.music;
  }, []);

  const mutate = useCallback((fn: (s: SaveData) => void) => {
    const current = saveRef.current ?? loadSave();
    const next: SaveData = {
      ...current,
      levels: { ...current.levels },
      secrets: [...current.secrets],
      achievements: [...current.achievements],
      settings: { ...current.settings },
    };
    fn(next);
    const earned = evaluateAchievements(next);
    writeSave(next);
    saveRef.current = next;
    setSave(next);
    if (earned.length) {
      audio.play("achievement");
      setToasts((t) => [
        ...t,
        ...earned.map((a) => ({ id: Date.now() + Math.random(), name: a.name, desc: a.desc })),
      ]);
    }
  }, []);

  useEffect(() => {
    if (!toasts.length) return;
    const timer = window.setTimeout(() => setToasts((t) => t.slice(1)), 3200);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  // ------------------------------------------------------------------- input

  useEffect(() => {
    const input = new InputManager();
    inputRef.current = input;
    input.attach();
    input.onAnyKey = () => audio.unlock();
    input.onRestart = () => engineRef.current?.restart();
    input.onPause = () => {
      if (screenRef.current === "playing") setScreen("paused");
      else if (screenRef.current === "paused") setScreen("playing");
    };
    return () => {
      input.detach();
      inputRef.current = null;
    };
  }, []);

  // ------------------------------------------------------------ level launch

  const startLevel = useCallback(
    (index: number, chaos: boolean) => {
      audio.unlock();
      audio.play("click");
      if (saveRef.current?.settings.music) audio.startMusic();
      const mods = chaos ? rollChaos() : null;
      levelRef.current = index;
      chaosRef.current = mods;
      coinRef.current = new Set();
      secretRef.current = new Set();
      setChaosLabel(mods?.label ?? null);
      setResult(null);
      setHud(null);
      setScreen("playing");
      setSession((s) => s + 1);
    },
    [],
  );

  useEffect(() => {
    if (!session) return;
    const canvas = canvasRef.current;
    const input = inputRef.current;
    if (!canvas || !input) return;

    const engine = new GameEngine(
      canvas,
      input,
      {
        onHud: (h) => setHud(h),
        onDeath: () => mutate((s) => void s.deaths++),
        onCoin: (id) => coinRef.current.add(id),
        onSecret: (id) => {
          secretRef.current.add(id);
          mutate((s) => {
            if (!s.secrets.includes(id)) s.secrets.push(id);
          });
        },
        onComplete: (r) => {
          const index = levelRef.current;
          const isChaos = chaosRef.current !== null;
          mutate((s) => {
            const rec = levelRecord(s, index);
            const coins = Array.from(new Set([...rec.coins, ...coinRef.current]));
            if (!isChaos) {
              s.levels[index] = {
                done: true,
                bestTime: rec.bestTime === null ? r.time : Math.min(rec.bestTime, r.time),
                bestDeaths:
                  rec.bestDeaths === null ? r.deaths : Math.min(rec.bestDeaths, r.deaths),
                coins,
                stars: Math.max(rec.stars, r.stars),
              };
              if (index === TOTAL_LEVELS - 1) s.chaosUnlocked = true;
            } else {
              s.levels[index] = { ...rec, coins };
            }
          });
          setResult(r);
          setScreen("complete");
          engineRef.current?.pause();
        },
      },
      saveRef.current?.settings ?? defaultSettings,
    );
    engineRef.current = engine;
    engine.load(LEVELS[levelRef.current]!, levelRef.current, chaosRef.current);
    engine.start();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [session, mutate]);

  // pause / resume follows the screen state
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (screen === "playing") engine.resume();
    else engine.pause();
  }, [screen, session]);

  useEffect(() => {
    if (engineRef.current && save) engineRef.current.settings = save.settings;
  }, [save]);

  // ---------------------------------------------------------------- handlers

  const toggleSetting = (key: keyof Settings) => {
    audio.play("click");
    mutate((s) => {
      s.settings[key] = !s.settings[key];
      if (key === "sfx") audio.sfxOn = s.settings.sfx;
      if (key === "music") audio.setMusic(s.settings.music);
    });
  };

  const goMenu = () => {
    audio.play("click");
    setScreen("menu");
    setSession(0);
    engineRef.current?.destroy();
    engineRef.current = null;
    setHud(null);
  };

  const inGame = screen === "playing" || screen === "paused" || screen === "complete";
  const isLast = levelRef.current === TOTAL_LEVELS - 1;

  const nextLevel = () => {
    if (isLast && chaosRef.current === null) {
      mutate((s) => void (s.endingSeen = true));
      setScreen("ending");
      return;
    }
    startLevel(Math.min(TOTAL_LEVELS - 1, levelRef.current + 1), chaosRef.current !== null);
  };

  if (!save) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-pixel text-xs text-primary">BOOTING…</p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-3">
      <div className="pointer-events-none absolute inset-0 scanlines opacity-40" aria-hidden />

      {inGame ? (
        <div className="relative w-full max-w-5xl">
          <div className="relative aspect-video w-full border-2 border-border bg-black glow-primary">
            <canvas ref={canvasRef} className="block h-full w-full" />
            {hud && (
              <Hud hud={hud} chaosLabel={chaosLabel} onPause={() => setScreen("paused")} />
            )}
            <TouchControls
              big={settings.bigControls}
              onHold={(a, down) => inputRef.current?.setTouch(a, down)}
              onRestart={() => engineRef.current?.restart()}
            />
            {screen !== "playing" && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/85 p-3">
                {screen === "paused" && (
                  <PauseScreen
                    onResume={() => {
                      audio.play("click");
                      setScreen("playing");
                    }}
                    onRestart={() => {
                      engineRef.current?.restart();
                      setScreen("playing");
                    }}
                    onLevels={() => {
                      setScreen(chaosRef.current ? "chaosLevels" : "levels");
                      setSession(0);
                      engineRef.current?.destroy();
                      engineRef.current = null;
                    }}
                    onSettings={() => {
                      setReturnScreen("paused");
                      setScreen("settings");
                    }}
                  />
                )}
                {screen === "complete" && result && (
                  <CompleteScreen
                    result={result}
                    isLast={isLast && chaosRef.current === null}
                    onNext={nextLevel}
                    onReplay={() => startLevel(levelRef.current, chaosRef.current !== null)}
                    onLevels={() => {
                      setScreen(chaosRef.current ? "chaosLevels" : "levels");
                      setSession(0);
                    }}
                  />
                )}
              </div>
            )}
          </div>
          <p className="mt-3 hidden text-center text-[11px] text-muted-foreground lg:block">
            A / D move · SPACE jump · R restart · ESC pause · gamepads supported
          </p>
        </div>
      ) : (
        <div className="flex w-full justify-center">
          {screen === "menu" && (
            <MenuScreen
              save={save}
              onPlay={() => startLevel(highestUnlocked(save, TOTAL_LEVELS), false)}
              onLevels={() => {
                audio.play("click");
                setScreen("levels");
              }}
              onAchievements={() => {
                audio.play("click");
                setScreen("achievements");
              }}
              onSettings={() => {
                audio.play("click");
                setReturnScreen("menu");
                setScreen("settings");
              }}
              onChaos={() => {
                audio.play("click");
                setScreen("chaosLevels");
              }}
            />
          )}
          {(screen === "levels" || screen === "chaosLevels") && (
            <LevelSelect
              save={save}
              chaos={screen === "chaosLevels"}
              onPick={(i) => startLevel(i, screen === "chaosLevels")}
              onBack={goMenu}
            />
          )}
          {screen === "achievements" && <AchievementsScreen save={save} onBack={goMenu} />}
          {screen === "settings" && (
            <SettingsPanel
              settings={settings}
              onToggle={toggleSetting}
              onBack={() => setScreen(returnScreen)}
              onReset={() => {
                const fresh = resetSave();
                saveRef.current = fresh;
                setSave(fresh);
                setScreen("menu");
              }}
            />
          )}
          {screen === "ending" && (
            <EndingScreen save={save} onMenu={goMenu} onChaos={() => setScreen("chaosLevels")} />
          )}
        </div>
      )}

      <Toasts items={toasts} />
    </main>
  );
}
