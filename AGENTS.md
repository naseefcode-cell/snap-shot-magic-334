<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Game architecture
- Game code lives in `src/game/` (engine, input, audio, save, achievements) with levels as pure data in `src/game/levels/`, so traps stay declarative and levels stay unique.
- React renders only menus/HUD overlays in `src/components/game/`; the canvas loop never re-renders React per frame, keeping 60 FPS on low-end devices.
