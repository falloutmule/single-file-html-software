declare namespace PIXI {
  class Point { x: number; y: number; constructor(x?: number, y?: number); set(x: number, y?: number): void; }
  class Container {
    children: unknown[];
    x: number; y: number; alpha: number; visible: boolean; rotation: number;
    position: Point; scale: Point; pivot: Point;
    eventMode: string; interactiveChildren: boolean; sortableChildren: boolean;
    addChild<T>(...children: T[]): T;
    removeChildren(): unknown[];
    destroy(options?: unknown): void;
  }
  class Graphics extends Container {
    clear(): this;
    poly(points: number[]): this;
    rect(x: number, y: number, width: number, height: number): this;
    roundRect(x: number, y: number, width: number, height: number, radius: number): this;
    circle(x: number, y: number, radius: number): this;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    fill(style: number | string | { color: number | string; alpha?: number }): this;
    stroke(style: number | string | { color: number | string; width?: number; alpha?: number; alignment?: number }): this;
  }
  class Texture {
    width: number; height: number; source?: { scaleMode?: string };
    static from(source: string | HTMLImageElement | HTMLCanvasElement): Texture;
  }
  class Sprite extends Container {
    texture: Texture;
    anchor: Point;
    tint: number;
    constructor(texture?: Texture);
  }
  class Text extends Container {
    text: string;
    anchor: Point;
    constructor(options: { text: string; style?: Record<string, unknown> });
  }
  class Application {
    stage: Container;
    canvas: HTMLCanvasElement;
    renderer: { resize(width: number, height: number): void; render(container?: Container): void; type?: number };
    init(options: Record<string, unknown>): Promise<void>;
    destroy(removeView?: boolean, options?: unknown): void;
  }
  namespace Assets {
    function load<T = Texture>(url: string): Promise<T>;
  }
}
declare const PIXI: typeof PIXI;

declare const __SKYLINE_ASSET_URLS__: Readonly<Record<string, string>>;
