import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { after, before, beforeEach, test } from "node:test";
import { compileModules, importModule } from "./CompileModules.mjs";

// The JavaScript drawing surface runs over a fake of Core's draw functions. The fake behaves as Core
// does where it matters here: a draw function calls the callbacks that the renderer has, in the order
// of the text, lends the glyph image and the run to the callback, stops calling after the first error
// and gives back what the handler threw only when it returns. What is checked is what the TypeScript
// layer decides: the callbacks are installed for the call and put back on every path, the image is
// valid during the callback and disposed after, the replacement's draw is reached with the bounds in
// pixels, references are balanced, and bad arguments are refused before anything is installed. The
// real draw output is tested on a device against the numbers of Tehreer-Web
// (example/tests/DrawingTests.ts).

interface Core {
  kind: string;
  refs: number;
  data: Record<string, unknown>;
}

interface FakeHandle {
  core: Core;
  disposed: boolean;
}

interface Adapter {
  drawGlyphImage(image: FakeHandle, x: number, y: number, scaleX: number, scaleY: number, color: number, clip: unknown): void;
  fillRect(rect: unknown, color: number): void;
  drawReplacement(run: FakeHandle, x: number, y: number): void;
  beginShadow?(radius: number, dx: number, dy: number, color: number): void;
  endShadow?(): void;
}

interface Wrapper {
  readonly isDisposed: boolean;
  dispose(): void;
  readonly nativeHandle: FakeHandle;
}

interface Drawable extends Wrapper {
  draw(renderer: unknown, context: unknown, x: number, y: number): void;
}

interface ImageLike extends Wrapper {
  readonly width: number;
}

let out: string;
let Renderer: { new (): Wrapper & { renderScale: number } };
let GlyphRun: { new (token: symbol, handle: FakeHandle): Drawable };
let ComposedLine: { new (token: symbol, handle: FakeHandle): Drawable };
let ComposedFrame: { new (token: symbol, handle: FakeHandle): Drawable };
let Replacement: { new (delegate: unknown, kind?: number): Wrapper };
let adopt: symbol;

let cores: Core[];
let events: string[];
/** Runs inside the fake Core draw, before the first callback, as a handler of an earlier call would. */
let duringDraw: (() => void) | undefined;
let failCore: boolean;
let installs: number;
let restores: number;

function core(kind: string, data: Record<string, unknown> = {}): Core {
  const made = { kind, refs: 1, data };
  cores.push(made);
  return made;
}

function handleOf(target: Core): FakeHandle {
  return { core: target, disposed: false };
}

function live(handle: FakeHandle): Core {
  if (handle.disposed) {
    throw new Error("handle is already disposed");
  }
  return handle.core;
}

function retained(target: Core): FakeHandle {
  target.refs++;
  return handleOf(target);
}

const rect = { origin: { x: 1, y: 2 }, size: { width: 3, height: 4 } };

/** Runs the callbacks of one run as Core does, and gives the first error back at the end. */
function drawRun(run: Core, adapter: Adapter | undefined, origin: { x: number; y: number }, record: (event: string) => void): void {
  if (adapter === undefined) {
    return;
  }
  const image = core("image", {});
  const hasGlyphs = run.data["replacement"] === undefined;
  record(`run ${origin.x} ${origin.y}`);

  let error: { value: unknown } | undefined;
  const step = (body: () => void): void => {
    if (error !== undefined) return;
    try {
      body();
    } catch (thrown) {
      error = { value: thrown };
    }
  };

  step(() => adapter.fillRect(rect, 0xff112233));
  if (hasGlyphs) {
    step(() => adapter.beginShadow?.(2, 1, 1, 0x80000000));
    step(() => adapter.drawGlyphImage(retained(image), origin.x + 5, origin.y - 6, 1, 1.5, 0xff000000, undefined));
    step(() => adapter.drawGlyphImage(retained(image), origin.x + 9, origin.y - 6, 1, 1, 0xff000000, rect));
    step(() => adapter.endShadow?.());
  } else {
    step(() => adapter.drawReplacement(retained(run), origin.x, origin.y));
  }
  // The image is lent: the fake Core lets go of its own reference once the callbacks are over.
  image.refs--;
  if (error !== undefined) {
    throw (error as { value: unknown }).value;
  }
}

function adapterOf(renderer: FakeHandle): Adapter | undefined {
  return live(renderer).data["adapter"] as Adapter | undefined;
}

function fake(): Record<string, unknown> {
  return {
    disposeHandle(handle: FakeHandle) {
      if (!handle.disposed) {
        handle.disposed = true;
        handle.core.refs--;
      }
    },
    isHandleMutable: () => false,
    retainHandle: (handle: FakeHandle) => retained(live(handle)),
    TRRendererCreate: () => handleOf(core("renderer", { scale: 1, adapter: undefined })),
    TRRendererGetRenderScale: (handle: FakeHandle) => live(handle).data["scale"],
    installDrawContext(renderer: FakeHandle, adapter: Adapter) {
      const target = live(renderer);
      installs++;
      target.refs++;
      const scope = { target, previous: target.data["adapter"], restored: false };
      target.data["adapter"] = adapter;
      events.push("install");
      return scope;
    },
    restoreDrawContext(scope: { target: Core; previous: unknown; restored: boolean }) {
      if (scope.restored) return;
      scope.restored = true;
      restores++;
      scope.target.data["adapter"] = scope.previous;
      scope.target.refs--;
      events.push("restore");
    },
    TRGlyphRunGetReplacement(run: FakeHandle) {
      const replacement = live(run).data["replacement"] as Core | undefined;
      return replacement === undefined ? undefined : retained(replacement);
    },
    TRGlyphRunGetAscent: () => 10,
    TRGlyphRunGetDescent: () => 4,
    TRGlyphRunGetWidth: () => 25,
    invokeReplacementDraw(replacement: FakeHandle, context: unknown, bounds: unknown) {
      const handler = live(replacement).data["handler"] as { draw?(context: unknown, bounds: unknown): void };
      if (handler.draw === undefined) return false;
      handler.draw(context, bounds);
      return true;
    },
    TRReplacementCreate: (handler: unknown) => handleOf(core("replacement", { handler })),
    TRGlyphRunDraw(run: FakeHandle, renderer: FakeHandle, origin: { x: number; y: number }) {
      const target = live(run);
      live(renderer);
      duringDraw?.();
      live(run);
      live(renderer);
      if (failCore) throw new Error("core failed");
      drawRun(target, adapterOf(renderer), origin, (event) => events.push(event));
    },
    TRComposedLineDraw(line: FakeHandle, renderer: FakeHandle, origin: { x: number; y: number }) {
      const target = live(line);
      live(renderer);
      duringDraw?.();
      const runs = target.data["runs"] as Core[];
      let error: { value: unknown } | undefined;
      runs.forEach((run, index) => {
        if (error !== undefined) return;
        try {
          drawRun(run, adapterOf(renderer), { x: origin.x + index * 20, y: origin.y }, (event) => events.push(event));
        } catch (thrown) {
          error = { value: thrown };
        }
      });
      if (error !== undefined) throw (error as { value: unknown }).value;
    },
    TRComposedFrameDraw(frame: FakeHandle, renderer: FakeHandle, origin: { x: number; y: number }) {
      const target = live(frame);
      live(renderer);
      duringDraw?.();
      for (const [index, line] of (target.data["lines"] as Core[]).entries()) {
        const runs = line.data["runs"] as Core[];
        runs.forEach((run) => drawRun(run, adapterOf(renderer), { x: origin.x, y: origin.y + index * 30 }, (event) => events.push(event)));
      }
    },
  };
}

before(async () => {
  out = compileModules([
    "src/layout/GlyphRun.ts", "src/layout/ComposedLine.ts", "src/layout/ComposedFrame.ts", "src/layout/Replacement.ts",
    "src/graphics/Renderer.ts", "src/graphics/GlyphImage.ts", "src/internal/Adopt.ts",
  ]);
  const load = async <T>(file: string, name: string): Promise<T> => ((await importModule(out, file)) as Record<string, T>)[name] as T;
  Renderer = await load("graphics/Renderer.js", "Renderer");
  GlyphRun = await load("layout/GlyphRun.js", "GlyphRun");
  ComposedLine = await load("layout/ComposedLine.js", "ComposedLine");
  ComposedFrame = await load("layout/ComposedFrame.js", "ComposedFrame");
  Replacement = await load("layout/Replacement.js", "Replacement");
  adopt = await load<symbol>("internal/Adopt.js", "adopt");
});

beforeEach(() => {
  cores = [];
  events = [];
  duringDraw = undefined;
  failCore = false;
  installs = 0;
  restores = 0;
  (globalThis as Record<string, unknown>)["__tehreer"] = fake();
});

after(() => {
  delete (globalThis as Record<string, unknown>)["__tehreer"];
  rmSync(out, { recursive: true, force: true });
});

function run(data: Record<string, unknown> = {}): Drawable {
  return new GlyphRun(adopt, handleOf(core("run", data)));
}

function line(runs = 2): Drawable {
  return new ComposedLine(adopt, handleOf(core("line", { runs: Array.from({ length: runs }, () => core("run", {})) })));
}

function frame(): Drawable {
  return new ComposedFrame(adopt, handleOf(core("frame", { lines: [0, 1].map(() => core("line", { runs: [core("run", {})] })) })));
}

interface Recorder {
  calls: string[];
  images: ImageLike[];
  drawGlyphImage(image: ImageLike, x: number, y: number, scaleX: number, scaleY: number, color: number, clip: unknown): void;
  fillRect(rect: unknown, color: number): void;
  beginShadow?(radius: number, dx: number, dy: number, color: number): void;
  endShadow?(): void;
}

function recorder(withShadow = true): Recorder {
  const made: Recorder = {
    calls: [],
    images: [],
    drawGlyphImage(image, x, y, scaleX, scaleY, color, clip) {
      assert.equal(image.isDisposed, false, "the image is valid during the callback");
      made.images.push(image);
      made.calls.push(`image ${x} ${y} ${scaleX} ${scaleY} ${color} ${JSON.stringify(clip)}`);
    },
    fillRect(filled, color) {
      made.calls.push(`rect ${JSON.stringify(filled)} ${color}`);
    },
  };
  if (withShadow) {
    made.beginShadow = (radius, dx, dy, color) => made.calls.push(`begin ${radius} ${dx} ${dy} ${color}`);
    made.endShadow = () => made.calls.push("end");
  }
  return made;
}

function adapterNow(renderer: Wrapper): Adapter | undefined {
  return renderer.nativeHandle.core.data["adapter"] as Adapter | undefined;
}

function everyoneReleased(): void {
  for (const target of cores) {
    // Wrappers that the test still holds keep one reference each; a leaked lend would be above it.
    assert.ok(target.refs >= 0 && target.refs <= 1, `${target.kind} holds ${target.refs} references`);
  }
}

test("a run draws into a context in Core's order, with the image lent for the callback only", () => {
  const renderer = new Renderer();
  const context = recorder();
  const target = run();

  target.draw(renderer, context, 10, 50);

  assert.deepEqual(context.calls, [
    `rect {"x":1,"y":2,"width":3,"height":4} ${0xff112233}`,
    `begin 2 1 1 ${0x80000000}`,
    `image 15 44 1 1.5 ${0xff000000} undefined`,
    `image 19 44 1 1 ${0xff000000} {"x":1,"y":2,"width":3,"height":4}`,
    "end",
  ]);
  assert.deepEqual(events, ["install", "run 10 50", "restore"]);
  assert.ok(context.images.every((image) => image.isDisposed), "a wrapper that was kept is disposed after the call");
  assert.throws(() => context.images[0]?.width, /already disposed/);
  everyoneReleased();
  assert.equal(cores.find((c) => c.kind === "image")?.refs, 0);
});

test("a line and a frame pass the origin of their container and draw every run", () => {
  const renderer = new Renderer();
  const context = recorder();

  line(2).draw(renderer, context, 7, 8);
  assert.deepEqual(events.filter((e) => e.startsWith("run")), ["run 7 8", "run 27 8"]);

  events = [];
  frame().draw(renderer, context, 3, 4);
  assert.deepEqual(events.filter((e) => e.startsWith("run")), ["run 3 4", "run 3 34"]);
  assert.equal(installs, 2);
  assert.equal(restores, 2);
  assert.equal(adapterNow(renderer), undefined);
  everyoneReleased();
});

test("the callbacks are on the renderer during the call and the previous ones are back after it", () => {
  const renderer = new Renderer();
  const previous = { drawGlyphImage() {}, fillRect() {}, drawReplacement() {} };
  renderer.nativeHandle.core.data["adapter"] = previous;
  let during: unknown;
  const context = recorder();
  context.fillRect = () => { during = adapterNow(renderer); };

  run().draw(renderer, context, 0, 0);

  assert.notEqual(during, undefined);
  assert.notEqual(during, previous, "the surface's callbacks were installed");
  assert.equal(adapterNow(renderer), previous, "and the callbacks from before are back");
});

test("a nested draw into another context puts the outer one back", () => {
  const renderer = new Renderer();
  const inner = recorder(false);
  const outer = recorder(false);
  let seen: unknown;
  outer.fillRect = () => {
    const mine = adapterNow(renderer);
    run().draw(renderer, inner, 0, 0);
    seen = adapterNow(renderer) === mine;
  };

  run().draw(renderer, outer, 0, 0);

  assert.equal(seen, true);
  assert.ok(inner.calls.length > 0);
  assert.equal(adapterNow(renderer), undefined);
});

test("an error in a member stops the drawing, reaches the caller after Core returned, and the renderer is clean", () => {
  const renderer = new Renderer();
  const boom = new Error("boom");
  const context = recorder();
  context.drawGlyphImage = (image) => {
    context.images.push(image);
    context.calls.push("image");
    throw boom;
  };

  assert.throws(() => run().draw(renderer, context, 0, 0), (error) => error === boom, "the very value that was thrown");
  assert.deepEqual(context.calls.filter((c) => c !== "image" && !c.startsWith("rect")), ["begin 2 1 1 2147483648"], "nothing after the failing call");
  assert.equal(context.calls.filter((c) => c === "image").length, 1);
  assert.ok(context.images.every((image) => image.isDisposed), "the lent image is disposed on the error path too");
  assert.equal(adapterNow(renderer), undefined);
  assert.equal(restores, 1);

  // The renderer is usable again, with no context or with another one.
  const second = recorder();
  run().draw(renderer, second, 0, 0);
  assert.equal(second.calls.length, 5);
  everyoneReleased();
});

test("an error from Core itself restores the callbacks too", () => {
  const renderer = new Renderer();
  failCore = true;
  assert.throws(() => run().draw(renderer, recorder(), 0, 0), /core failed/);
  assert.equal(adapterNow(renderer), undefined);
  assert.equal(installs, restores);
  everyoneReleased();
});

test("a surface needs drawGlyphImage and fillRect, and a shadow pair is used only when whole", () => {
  const renderer = new Renderer();
  for (const bad of [undefined, null, 5, {}, { fillRect() {} }, { drawGlyphImage() {} }, { drawGlyphImage() {}, fillRect: 1 }]) {
    assert.throws(() => run().draw(renderer, bad, 0, 0), TypeError);
  }
  assert.throws(() => run().draw(renderer, { ...recorder(false), beginShadow: 1 }, 0, 0), TypeError);
  assert.equal(installs, 0, "nothing was installed for a bad context");

  let adapter: Adapter | undefined;
  const half = recorder(false);
  half.beginShadow = () => {};
  half.fillRect = () => { adapter = adapterNow(renderer); };
  run().draw(renderer, half, 0, 0);
  assert.equal(adapter?.beginShadow, undefined, "with only one of the pair, the adapter has neither");
  assert.equal(adapter?.endShadow, undefined);

  assert.throws(() => run().draw({} as never, recorder(), 0, 0), TypeError);
  assert.equal(installs, 1);
});

test("a disposed run, line, frame or renderer is refused before anything is installed", () => {
  const renderer = new Renderer();
  const context = recorder();
  for (const make of [run, line, frame]) {
    const target = make();
    target.dispose();
    assert.throws(() => target.draw(renderer, context, 0, 0), /already disposed/);
  }
  const target = run();
  const gone = new Renderer();
  gone.dispose();
  assert.throws(() => target.draw(gone, context, 0, 0), /already disposed/);
  assert.equal(installs, 0);
  assert.equal(context.calls.length, 0);
});

test("a member that disposes the run or the renderer does not break the draw; the disposal takes effect after", () => {
  const renderer = new Renderer();
  const target = run();
  const context = recorder();
  const fillRect = context.fillRect;
  context.fillRect = (filled, color) => {
    target.dispose();
    renderer.dispose();
    fillRect(filled, color);
  };

  target.draw(renderer, context, 0, 0);

  assert.equal(context.calls.length, 5, "the draw ran to the end");
  assert.equal(target.isDisposed && renderer.isDisposed, true);
  assert.equal(cores.find((c) => c.kind === "run")?.refs, 0, "the references taken for the call were given back");
  assert.equal(cores.find((c) => c.kind === "renderer")?.refs, 0);
});

test("a replacement's draw is called with the context and the bounds in pixels", () => {
  const renderer = new Renderer();
  renderer.nativeHandle.core.data["scale"] = 2;
  const seen: unknown[] = [];
  const context = recorder();
  class Box {
    computeRoom() { return { ascent: 1, descent: 1, extent: 1 }; }
    draw(drawn: unknown, bounds: unknown) { seen.push(this === delegate, drawn === context, bounds); }
  }
  const delegate = new Box();
  const replacement = new Replacement(delegate);
  const target = run({ replacement: replacement.nativeHandle.core });

  target.draw(renderer, context, 6, 9);

  assert.deepEqual(seen, [true, true, { x: 6, y: 9, ascent: 20, descent: 8, width: 50 }]);
  assert.equal(context.calls.length, 1, "only the background: a replacement has no glyphs");
  everyoneReleased();
});

test("a replacement without draw draws nothing, and an error from its draw is thrown after the call", () => {
  const renderer = new Renderer();
  const context = recorder();
  const quiet = new Replacement({ computeRoom: () => ({ ascent: 0, descent: 0, extent: 0 }) });
  run({ replacement: quiet.nativeHandle.core }).draw(renderer, context, 0, 0);
  assert.equal(context.calls.length, 1);

  const boom = new TypeError("replacement boom");
  const loud = new Replacement({ computeRoom: () => ({ ascent: 0, descent: 0, extent: 0 }), draw() { throw boom; } });
  assert.throws(() => run({ replacement: loud.nativeHandle.core }).draw(renderer, context, 0, 0), (error) => error === boom);
  assert.equal(adapterNow(renderer), undefined);
  everyoneReleased();
});
