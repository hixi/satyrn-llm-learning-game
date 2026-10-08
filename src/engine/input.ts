export class InputManager {
  private keys = new Set<string>();
  private stick = { x: 0, y: 0 };
  private interactEdge = false;
  private rotateQueue: number[] = [];
  private suppressed = false;

  get isSuppressed(): boolean {
    return this.suppressed;
  }

  /** While a text/panel UI owns the keyboard, ignore movement and interact intents. */
  setSuppressed(v: boolean): void {
    this.suppressed = v;
    if (v) {
      this.stick.x = 0;
      this.stick.y = 0;
      this.interactEdge = false;
      this.rotateQueue.length = 0;
    }
  }

  attachKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') this.interactEdge = true;
      if (e.code === 'KeyQ') this.rotateQueue.push(-1);
      if (e.code === 'KeyR') this.rotateQueue.push(1);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  setStick(x: number, y: number): void {
    this.stick.x = x;
    this.stick.y = y;
  }

  pressInteract(): void {
    this.interactEdge = true;
  }

  getMove(): { x: number; y: number } {
    let x = this.stick.x;
    let y = this.stick.y;
    if (this.suppressed) return { x: 0, y: 0 };
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  consumeInteract(): boolean {
    const v = this.interactEdge && !this.suppressed;
    this.interactEdge = false;
    return v;
  }

  consumeRotate(): number | null {
    if (this.suppressed) {
      this.rotateQueue.length = 0;
      return null;
    }
    return this.rotateQueue.length ? (this.rotateQueue.shift() as number) : null;
  }
}
