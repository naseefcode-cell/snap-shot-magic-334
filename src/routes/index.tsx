import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

// The game touches canvas, localStorage and Web Audio, so it is client-only.
const GameShell = lazy(() => import("@/components/game/GameShell"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chaos Bolt — 30-level trap platformer" },
      {
        name: "description",
        content:
          "Chaos Bolt is a free browser trap platformer: 30 handcrafted levels of disappearing floors, fake exits, enemies and a Chaos Bolt blaster. Keyboard, touch and gamepad.",
      },
      { property: "og:title", content: "Chaos Bolt — 30-level trap platformer" },
      {
        property: "og:description",
        content:
          "Thirty levels that lie to you. Collect Chaos Coins, find secrets, unlock Chaos Mode. Plays in any browser, offline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly fallback={<BootScreen />}>
      <Suspense fallback={<BootScreen />}>
        <GameShell />
      </Suspense>
    </ClientOnly>
  );
}

function BootScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <p className="font-pixel text-xs text-primary">CHAOS BOLT · BOOTING…</p>
    </main>
  );
}
