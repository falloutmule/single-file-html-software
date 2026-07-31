namespace SkylineDrop {
  export interface SemanticInput {
    enqueue(action: GameAction): void;
    sample(): ActionSnapshot;
    clear(): void;
    dispose(): void;
  }

  export function createSemanticInput(root: HTMLElement): SemanticInput {
    let queue: GameAction[] = [];
    const disposers: Array<() => void> = [];
    const enqueue = (action: GameAction): void => { queue.push(Object.freeze(action)); };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLButtonElement) return;
      const key = event.key.toLowerCase();
      let action: GameAction | null = null;
      if (key === "arrowup" || key === "w") action = { type: "move", dx: 0, dy: -1 };
      else if (key === "arrowdown" || key === "s") action = { type: "move", dx: 0, dy: 1 };
      else if (key === "arrowleft" || key === "a") action = { type: "move", dx: -1, dy: 0 };
      else if (key === "arrowright" || key === "d") action = { type: "move", dx: 1, dy: 0 };
      else if (key === "q") action = { type: "rotate", direction: -1 };
      else if (key === "e") action = { type: "rotate", direction: 1 };
      else if (key === " " || key === "enter") action = { type: "drop" };
      else if (key === "x" || key === "tab") action = { type: "toggle-layer" };
      else if (key === "m") action = { type: "remix" };
      else if (key === "r") action = { type: "restart-level" };
      else if (key === "p" || key === "escape") action = { type: "toggle-pause" };
      if (action) {
        event.preventDefault();
        enqueue(action);
      }
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    disposers.push(() => window.removeEventListener("keydown", onKeyDown));

    const actionForControl = (name: string): GameAction | null => {
      if (name === "move-up") return { type: "move", dx: 0, dy: -1 };
      if (name === "move-down") return { type: "move", dx: 0, dy: 1 };
      if (name === "move-left") return { type: "move", dx: -1, dy: 0 };
      if (name === "move-right") return { type: "move", dx: 1, dy: 0 };
      if (name === "rotate-left") return { type: "rotate", direction: -1 };
      if (name === "rotate-right") return { type: "rotate", direction: 1 };
      if (name === "toggle-layer") return { type: "toggle-layer" };
      if (name === "drop") return { type: "drop" };
      if (name === "remix") return { type: "remix" };
      return null;
    };

    for (const element of root.querySelectorAll<HTMLElement>("[data-action]")) {
      const onPointerDown = (event: PointerEvent): void => {
        event.preventDefault();
        if (element instanceof HTMLButtonElement && element.disabled) return;
        const name = element.dataset.action ?? "";
        const action = actionForControl(name);
        if (action) enqueue(action);
      };
      element.addEventListener("pointerdown", onPointerDown, { passive: false });
      disposers.push(() => element.removeEventListener("pointerdown", onPointerDown));
    }

    const clear = (): void => { queue = []; };
    const onBlur = (): void => clear();
    const onVisibility = (): void => { if (document.hidden) clear(); };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    disposers.push(() => window.removeEventListener("blur", onBlur));
    disposers.push(() => document.removeEventListener("visibilitychange", onVisibility));

    return Object.freeze({
      enqueue,
      sample(): ActionSnapshot {
        const actions = Object.freeze(queue);
        queue = [];
        return Object.freeze({ actions });
      },
      clear,
      dispose(): void { for (const dispose of disposers.splice(0)) dispose(); clear(); }
    });
  }
}
