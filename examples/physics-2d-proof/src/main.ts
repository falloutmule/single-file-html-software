import {
  createPhysics2DWorld,
  type Physics2DSnapshot,
  type Physics2DWorld
} from "@sfhs/physics-2d";

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element === null) throw new Error(`Physics proof is missing ${selector}.`);
  return element;
}

function requireCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const value = canvas.getContext("2d");
  if (value === null) throw new Error("Canvas 2D is unavailable.");
  return value;
}

const shell = requireElement<HTMLElement>("#fixture-shell");
const canvas = requireElement<HTMLCanvasElement>("#world");
const context = requireCanvasContext(canvas);
const status = requireElement<HTMLOutputElement>("#status");
const startButton = requireElement<HTMLButtonElement>("#fixture-start");
const impulseButton = requireElement<HTMLButtonElement>("#impulse");
const restartButton = requireElement<HTMLButtonElement>("#restart");

const scale = 60;
const fixedStep = 1 / 60;
let world: Physics2DWorld | undefined;
let snapshot: Physics2DSnapshot = { step: 0, bodies: [] };
let ticks = 0;
let collisions = 0;
let generation = 0;
let running = false;
let previousTime = 0;
let accumulator = 0;
let resetPromise: Promise<void> | undefined;

function createScene(target: Physics2DWorld): void {
  for (const [id, x, y, halfWidth, halfHeight] of [
    ["floor", 6, 7.65, 5.8, 0.25],
    ["left-wall", 0.2, 4, 0.2, 3.8],
    ["right-wall", 11.8, 4, 0.2, 3.8]
  ] as const) {
    target.createBody({ id, type: "fixed", position: { x, y }, collider: { shape: { kind: "box", halfWidth, halfHeight }, restitution: 0.55 } });
  }
  target.createBody({
    id: "ball",
    type: "dynamic",
    position: { x: 4.2, y: 1.2 },
    linearVelocity: { x: 1.8, y: 0 },
    ccd: true,
    collider: { shape: { kind: "circle", radius: 0.45 }, density: 1, friction: 0.2, restitution: 0.82 }
  });
  target.createBody({
    id: "box-a",
    type: "dynamic",
    position: { x: 6.1, y: 2.1 },
    rotation: 0.15,
    collider: { shape: { kind: "box", halfWidth: 0.55, halfHeight: 0.55 }, density: 0.9, friction: 0.45, restitution: 0.35 }
  });
  target.createBody({
    id: "box-b",
    type: "dynamic",
    position: { x: 7.25, y: 1.1 },
    rotation: -0.2,
    collider: { shape: { kind: "box", halfWidth: 0.42, halfHeight: 0.72 }, density: 1.1, friction: 0.4, restitution: 0.3 }
  });
  target.createBody({
    id: "kinematic-paddle",
    type: "kinematic-position",
    position: { x: 2.2, y: 5.8 },
    collider: { shape: { kind: "circle", radius: 0.55 }, friction: 0, restitution: 0.9 }
  });
}

async function resetWorld(): Promise<void> {
  if (resetPromise !== undefined) return resetPromise;
  resetPromise = (async () => {
    world?.destroy();
    world = await createPhysics2DWorld({ gravity: { x: 0, y: 9.81 }, timestepSeconds: fixedStep });
    createScene(world);
    snapshot = world.snapshot();
    ticks = 0;
    collisions = 0;
    previousTime = 0;
    accumulator = 0;
    generation += 1;
    shell.dataset.phase = running ? "running" : "ready";
    if (document.querySelector("#physics-ready") === null) {
      const ready = document.createElement("p");
      ready.id = "physics-ready";
      ready.className = "ready";
      ready.textContent = "Rapier initialized; no renderer dependency.";
      shell.append(ready);
    }
    draw();
  })().finally(() => { resetPromise = undefined; });
  return resetPromise;
}

function drawBody(body: Physics2DSnapshot["bodies"][number]): void {
  context.save();
  context.translate(body.position.x * scale, body.position.y * scale);
  context.rotate(body.rotation);
  context.fillStyle = body.id === "ball" ? "#ffd166" : body.type === "fixed" ? "#4d8fb9" : body.type === "kinematic-position" ? "#ef7dbb" : "#72e0a5";
  if (body.id === "ball" || body.id === "kinematic-paddle") {
    context.beginPath();
    context.arc(0, 0, (body.id === "ball" ? 0.45 : 0.55) * scale, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#6d4c12";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(0.38 * scale, 0);
    context.stroke();
  } else {
    const dimensions: readonly [number, number] = body.id === "floor" ? [5.8, 0.25]
      : body.id.endsWith("wall") ? [0.2, 3.8]
        : body.id === "box-a" ? [0.55, 0.55] : [0.42, 0.72];
    context.fillRect(-dimensions[0] * scale, -dimensions[1] * scale, dimensions[0] * 2 * scale, dimensions[1] * 2 * scale);
  }
  context.restore();
}

function draw(): void {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#0a1e31";
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (const body of snapshot.bodies) drawBody(body);
  status.value = `gen ${generation} / step ${ticks} / contacts ${collisions}`;
}

function frame(time: number): void {
  if (!running || world === undefined) return;
  if (previousTime === 0) previousTime = time;
  accumulator += Math.min(0.1, (time - previousTime) / 1000);
  previousTime = time;
  while (accumulator >= fixedStep) {
    const paddleX = 2.2 + Math.sin((ticks + 1) * fixedStep * 2.4) * 1.25;
    world.setNextKinematicTransform("kinematic-paddle", { x: paddleX, y: 5.8 }, 0);
    const result = world.step();
    snapshot = result;
    collisions += result.collisions.filter((event) => event.started).length;
    ticks += 1;
    accumulator -= fixedStep;
  }
  draw();
  requestAnimationFrame(frame);
}

startButton.addEventListener("click", async () => {
  await resetWorld();
  if (running) return;
  running = true;
  shell.dataset.phase = "running";
  previousTime = 0;
  requestAnimationFrame(frame);
});

impulseButton.addEventListener("click", () => {
  world?.applyImpulse("ball", { x: 2.5, y: -5.5 });
});

restartButton.addEventListener("click", async () => {
  await resetWorld();
});

const proofApi = Object.freeze({
  getSnapshot() {
    return Object.freeze({ ticks, collisions, generation, bodies: snapshot.bodies });
  },
  async runFullSelfCheck() {
    await resetPromise;
    const bodiesFinite = snapshot.bodies.every((body) => [
      body.position.x, body.position.y, body.rotation,
      body.linearVelocity.x, body.linearVelocity.y, body.angularVelocity
    ].every(Number.isFinite));
    return Object.freeze({
      pass: shell.dataset.phase === "running" && ticks >= 5 && bodiesFinite && snapshot.bodies.length === 7,
      snapshot: Object.freeze({ ticks, collisions, generation, bodies: snapshot.bodies })
    });
  }
});

Object.assign(window, { CR: proofApi });
void resetWorld();
addEventListener("pagehide", () => world?.destroy(), { once: true });
