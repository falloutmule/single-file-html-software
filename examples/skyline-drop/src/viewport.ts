namespace SkylineDrop {
  export interface ViewportSnapshot {
    readonly width: number;
    readonly height: number;
    readonly dpr: number;
    readonly scale: number;
    readonly offsetX: number;
    readonly offsetY: number;
    readonly orientation: "portrait" | "landscape";
  }

  export interface ViewportController {
    readonly current: ViewportSnapshot;
    subscribe(listener: (snapshot: ViewportSnapshot) => void): () => void;
    clientToLogical(clientX: number, clientY: number, bounds: DOMRect): GridPoint | null;
    dispose(): void;
  }

  export function createViewportController(): ViewportController {
    const listeners = new Set<(snapshot: ViewportSnapshot) => void>();
    let snapshot = read();

    function read(): ViewportSnapshot {
      const visual = window.visualViewport;
      const width = Math.max(1, visual?.width ?? window.innerWidth);
      const height = Math.max(1, visual?.height ?? window.innerHeight);
      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      const scale = Math.min(width / LOGICAL_WIDTH, height / LOGICAL_HEIGHT);
      return Object.freeze({
        width,
        height,
        dpr,
        scale,
        offsetX: (width - LOGICAL_WIDTH * scale) / 2,
        offsetY: (height - LOGICAL_HEIGHT * scale) / 2,
        orientation: width >= height ? "landscape" : "portrait"
      });
    }

    const update = (): void => {
      snapshot = read();
      for (const listener of listeners) listener(snapshot);
    };
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);

    return {
      get current(): ViewportSnapshot { return snapshot; },
      subscribe(listener: (value: ViewportSnapshot) => void): () => void {
        listeners.add(listener);
        listener(snapshot);
        return () => listeners.delete(listener);
      },
      clientToLogical(clientX: number, clientY: number, bounds: DOMRect): GridPoint | null {
        if (bounds.width <= 0 || bounds.height <= 0) return null;
        const x = (clientX - bounds.left) / bounds.width * LOGICAL_WIDTH;
        const y = (clientY - bounds.top) / bounds.height * LOGICAL_HEIGHT;
        if (x < 0 || y < 0 || x > LOGICAL_WIDTH || y > LOGICAL_HEIGHT) return null;
        return Object.freeze({ x, y });
      },
      dispose(): void {
        window.removeEventListener("resize", update);
        window.removeEventListener("orientationchange", update);
        window.visualViewport?.removeEventListener("resize", update);
        window.visualViewport?.removeEventListener("scroll", update);
        listeners.clear();
      }
    };
  }
}
