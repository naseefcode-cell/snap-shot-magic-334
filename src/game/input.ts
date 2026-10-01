/**
 * InputManager — keyboard, touch buttons and gamepad in one place.
 */

export type Action = "left" | "right" | "jump" | "shoot" | "restart" | "pause";

export class InputManager {
  private keys = new Set<string>();
  private touch = new Set<Action>();
  private prevJump = false;
  private prevPadJump = false;
  jumpPressed = false;
  jumpHeld = false;
  shootPressed = false;
  private prevShoot = false;
  onRestart: (() => void) | null = null;
  onPause: (() => void) | null = null;
  onAnyKey: (() => void) | null = null;

  private handleDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (["arrowleft", "arrowright", "arrowup", " ", "w", "a", "d", "j", "x", "f", "k"].includes(k)) e.preventDefault();
    this.keys.add(k);
    this.onAnyKey?.();
    if (k === "r") this.onRestart?.();
    if (k === "escape" || k === "p") this.onPause?.();
  };

  private handleUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private blur = () => {
    this.keys.clear();
    this.touch.clear();
  };

  attach() {
    window.addEventListener("keydown", this.handleDown);
    window.addEventListener("keyup", this.handleUp);
    window.addEventListener("blur", this.blur);
  }

  detach() {
    window.removeEventListener("keydown", this.handleDown);
    window.removeEventListener("keyup", this.handleUp);
    window.removeEventListener("blur", this.blur);
    this.blur();
  }

  setTouch(action: Action, down: boolean) {
    if (down) this.touch.add(action);
    else this.touch.delete(action);
  }

  private padAxis(): { x: number; jump: boolean; restart: boolean; shoot?: boolean } {
    if (typeof navigator === "undefined" || !navigator.getGamepads) {
      return { x: 0, jump: false, restart: false };
    }
    for (const pad of navigator.getGamepads()) {
      if (!pad) continue;
      const ax = pad.axes[0] ?? 0;
      const dpadL = pad.buttons[14]?.pressed ?? false;
      const dpadR = pad.buttons[15]?.pressed ?? false;
      const x = dpadL ? -1 : dpadR ? 1 : Math.abs(ax) > 0.25 ? ax : 0;
      const jump = (pad.buttons[0]?.pressed ?? false) || (pad.buttons[12]?.pressed ?? false);
      const restart = pad.buttons[3]?.pressed ?? false;
      const shoot = (pad.buttons[2]?.pressed ?? false) || (pad.buttons[1]?.pressed ?? false) || (pad.buttons[7]?.pressed ?? false);
      if (x !== 0 || jump || restart || shoot) return { x, jump, restart, shoot };
    }
    return { x: 0, jump: false, restart: false };
  }

  /** Call once per frame before reading axis/jump state. */
  poll() {
    const pad = this.padAxis();
    const left =
      this.keys.has("a") || this.keys.has("arrowleft") || this.touch.has("left") || pad.x < -0.25;
    const right =
      this.keys.has("d") || this.keys.has("arrowright") || this.touch.has("right") || pad.x > 0.25;
    const jump =
      this.keys.has(" ") ||
      this.keys.has("w") ||
      this.keys.has("arrowup") ||
      this.touch.has("jump") ||
      pad.jump;

    this.axis = (right ? 1 : 0) - (left ? 1 : 0);
    this.jumpPressed = jump && !this.prevJump;
    this.jumpHeld = jump;
    this.prevJump = jump;
    const shoot =
      this.keys.has("j") || this.keys.has("x") || this.keys.has("f") || this.keys.has("k") ||
      this.touch.has("shoot") || Boolean(pad.shoot);
    this.shootPressed = shoot && !this.prevShoot;
    this.prevShoot = shoot;

    if (pad.restart && !this.prevPadJump) this.onRestart?.();
    this.prevPadJump = pad.restart;
  }

  axis = 0;

  consumeJump() {
    this.jumpPressed = false;
  }
}
