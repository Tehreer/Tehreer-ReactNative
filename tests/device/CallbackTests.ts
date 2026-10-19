import type { NativeBindings, ReplacementHandler } from "../../src/internal/NativeBindings.js";
import type { Handle } from "../../src/internal/NativeFunctions.js";
import type { TestResult } from "./StructTests.js";

// The suite of the callbacks and of the errors that handlers throw (issue #9). It runs against the
// real bindings in Hermes and needs a debug build of the native module (the `test*` hooks for the
// handler table). The device runner calls it like the other suites:
//
//     import { runCallbackTests, callbackTestCount } from "../../tests/device/CallbackTests";
//     const result = runCallbackTests(bindings, { fontBytes });   // { passed, failures, skipped }
//
// The tests of the generated collecting enumerations need a font, because the only enumerations
// that Core can run without a layout (`TRPathEnumerate`) need a glyph path. The runner passes the
// bytes of any font with outlines; without them those tests are reported in `skipped`, not passed.
// Only `import type` is used from the library, so Metro has nothing to resolve.

export interface CallbackTestOptions {
  /** The bytes of a font whose glyphs have outlines (TrueType or CFF). */
  fontBytes?: Uint8Array;
}

export interface CallbackTestResult extends TestResult {
  /** Tests that did not run because the runner gave them nothing to run on. */
  skipped: string[];
}

class Skip extends Error {}

function check(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function expectThrows(action: () => unknown, pattern: RegExp, expectedName?: string): void {
  try {
    action();
  } catch (e) {
    const error = e as Error;
    check(pattern.test(error.message), `expected ${pattern}, got "${error.message}"`);
    if (expectedName !== undefined) {
      check(error.name === expectedName, `expected ${expectedName}, got ${error.name}`);
    }
    return;
  }
  throw new Error(`expected ${pattern}, but nothing was thrown`);
}

/** Runs `action` and returns what it threw, which may be any value; fails if it did not throw. */
function thrownBy(action: () => unknown): unknown {
  let threw = false;
  let value: unknown;
  try {
    action();
  } catch (e) {
    threw = true;
    value = e;
  }
  check(threw, "nothing was thrown");
  return value;
}

function hooks(b: NativeBindings) {
  const {
    testEnumerate, testGetHandlerCount, testGetRetiredHandlerCount, testDrainHandlers,
    testReleaseOnOtherThread, testComputeRoomOnOtherThread, testCollectGarbage,
  } = b;
  if (!testEnumerate || !testGetHandlerCount || !testGetRetiredHandlerCount || !testDrainHandlers
    || !testReleaseOnOtherThread || !testComputeRoomOnOtherThread || !testCollectGarbage) {
    throw new Error("the debug hooks are missing: the callback tests need a debug build of the native module");
  }
  return {
    enumerate: (handler: { item(index: number): void; coreCalls?: number }, count: number, honorsStop?: boolean): number =>
      testEnumerate.call(b, handler, count, honorsStop),
    count: (): number => testGetHandlerCount.call(b),
    retired: (): number => testGetRetiredHandlerCount.call(b),
    drain: (): void => testDrainHandlers.call(b),
    releaseOnOtherThread: (handle: Handle<"TRReplacement">): void => testReleaseOnOtherThread.call(b, handle),
    roomOnOtherThread: (handle: Handle<"TRReplacement">, width: number) => testComputeRoomOnOtherThread.call(b, handle, width),
    collect: (): void => testCollectGarbage.call(b),
  };
}

function create(b: NativeBindings, handler: ReplacementHandler, kind = 0): Handle<"TRReplacement"> {
  const handle = b.TRReplacementCreate(handler, kind);
  check(handle !== undefined, "TRReplacementCreate returned no handle");
  return handle as Handle<"TRReplacement">;
}

const zero = { ascent: 0, descent: 0, extent: 0 };
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

// The first glyph of the font that has at least `minimum` path elements, and the number it has.
function findGlyphPath(b: NativeBindings, options: CallbackTestOptions, minimum: number): { path: Handle<"TRPath">; elements: number } {
  const bytes = options.fontBytes;
  if (bytes === undefined) {
    throw new Skip("needs a font");
  }

  const file = b.TRFontFileCreateFromMemory(bytes, bytes.byteLength);
  check(file !== undefined, "the font cannot be loaded");
  try {
    const typeface = b.TRFontFileGetTypeface(file as Handle<"TRFontFile">, 0);
    check(typeface !== undefined, "the font has no typeface");
    try {
      const glyphs = Math.min(b.TRTypefaceGetGlyphCount(typeface as Handle<"TRTypeface">), 400);
      for (let glyph = 0; glyph < glyphs; glyph++) {
        const path = b.TRTypefaceCreateGlyphPath(typeface as Handle<"TRTypeface">, glyph, 100);
        if (path === undefined) {
          continue;
        }
        const elements = b.TRPathEnumerate(path, undefined)?.length ?? 0;
        if (elements >= minimum) {
          return { path, elements };
        }
        b.disposeHandle(path);
      }
    } finally {
      b.disposeHandle(typeface as Handle<"TRTypeface">);
    }
  } finally {
    b.disposeHandle(file as Handle<"TRFontFile">);
  }
  throw new Error(`no glyph of the font has ${minimum} path elements`);
}

const tests: [string, (b: NativeBindings, options: CallbackTestOptions) => void][] = [
  ["computeRoom is called with the handler as this and the layout width, and its room comes back", (b) => {
    const selves: unknown[] = [];
    let width = -1;
    const handler: ReplacementHandler = {
      computeRoom(layoutWidth) {
        selves.push(this);
        width = layoutWidth;
        return { ascent: 12, descent: 3.5, extent: layoutWidth * 2 };
      },
    };
    const replacement = create(b, handler, 1);
    try {
      check(b.TRReplacementGetKind(replacement) === 1, "the kind is kept");
      check(same(b.TRReplacementComputeRoom(replacement, 25.5), { ascent: 12, descent: 3.5, extent: 51 }), "the room");
      check(selves[0] === handler, "this is the handler");
      check(width === 25.5, `the width was ${width}`);
    } finally {
      b.disposeHandle(replacement);
    }
  }],

  ["a handler without computeRoom gives no room, and so does a null one", (b) => {
    for (const handler of [{}, { computeRoom: null }, { computeRoom: undefined }]) {
      const replacement = create(b, handler as ReplacementHandler);
      try {
        check(same(b.TRReplacementComputeRoom(replacement, 10), zero), "zero room");
      } finally {
        b.disposeHandle(replacement);
      }
    }
  }],

  ["an error thrown by computeRoom is thrown by the binding, unchanged, and the next call is clean", (b) => {
    const failure = new RangeError("from the handler");
    let calls = 0;
    let fail = true;
    const replacement = create(b, {
      computeRoom() {
        calls++;
        if (fail) {
          throw failure;
        }
        return { ascent: 1, descent: 2, extent: 3 };
      },
    });
    try {
      const error = thrownBy(() => b.TRReplacementComputeRoom(replacement, 1));
      check(error === failure, "the same error object");
      check(calls === 1, "called once");

      // Nothing is left over: the next call neither throws the old error nor skips the handler.
      fail = false;
      check(same(b.TRReplacementComputeRoom(replacement, 1), { ascent: 1, descent: 2, extent: 3 }), "the room");
      check(calls === 2, "called again");
      check(b.TRReplacementGetKind(replacement) === 0, "an unrelated binding is clean");
    } finally {
      b.disposeHandle(replacement);
    }
  }],

  ["a value that is not an Error comes out as it was thrown", (b) => {
    for (const value of [42, "text", { code: 7 }]) {
      const replacement = create(b, { computeRoom() { throw value; } });
      try {
        check(thrownBy(() => b.TRReplacementComputeRoom(replacement, 1)) === value, `${String(value)} was not thrown as is`);
      } finally {
        b.disposeHandle(replacement);
      }
    }
  }],

  ["a result that is not a room is an error of the binding that called Core", (b) => {
    const results: [unknown, RegExp, string?][] = [
      [undefined, /computeRoom: 'result' must be an object/],
      [5, /computeRoom: 'result' must be an object/],
      [{ ascent: 1, descent: 1 }, /computeRoom: 'result\.extent' must be a number/],
      [{ ascent: 1, descent: "2", extent: 1 }, /computeRoom: 'result\.descent' must be a number/],
      [{ ascent: Number.NaN, descent: 1, extent: 1 }, /computeRoom: 'result\.ascent' must not be NaN/, "RangeError"],
    ];
    for (const [result, pattern, name] of results) {
      const replacement = create(b, { computeRoom: () => result as never });
      try {
        expectThrows(() => b.TRReplacementComputeRoom(replacement, 1), pattern, name);
      } finally {
        b.disposeHandle(replacement);
      }
    }
  }],

  ["a computeRoom that is not a function is a TypeError", (b) => {
    const replacement = create(b, { computeRoom: 5 } as unknown as ReplacementHandler);
    try {
      expectThrows(() => b.TRReplacementComputeRoom(replacement, 1), /'handler\.computeRoom' must be a function/, "TypeError");
    } finally {
      b.disposeHandle(replacement);
    }
  }],

  ["a handler may call the bindings, and the error of one it calls is its own to catch or let go", (b) => {
    const other = create(b, {}, 1);
    const gone = create(b, {});
    b.disposeHandle(gone);

    const caught: unknown[] = [];
    const careful = create(b, {
      computeRoom() {
        try {
          b.TRReplacementGetKind(gone);
        } catch (e) {
          caught.push(e);
        }
        return { ascent: b.TRReplacementGetKind(other), descent: 0, extent: 0 };
      },
    });
    const careless = create(b, { computeRoom() { b.TRReplacementGetKind(gone); return zero; } });
    try {
      check(same(b.TRReplacementComputeRoom(careful, 1), { ascent: 1, descent: 0, extent: 0 }), "the room");
      check(caught.length === 1, "the handler caught the error of the nested binding");
      expectThrows(() => b.TRReplacementComputeRoom(careless, 1), /'replacement' is already disposed/);
    } finally {
      b.disposeHandle(careful);
      b.disposeHandle(careless);
      b.disposeHandle(other);
    }
  }],

  ["creation checks its arguments before it keeps anything", (b) => {
    const { count } = hooks(b);
    const before = count();

    expectThrows(() => b.TRReplacementCreate(undefined as never, 0), /'handler' must be an object/);
    expectThrows(() => b.TRReplacementCreate(5 as never, 0), /'handler' must be an object/);
    expectThrows(() => b.TRReplacementCreate({}, "1" as never), /'kind' must be a number/);
    expectThrows(() => b.TRReplacementCreate({}, -1), /'kind' is out of range/, "RangeError");
    check(count() === before, "no handler was kept");

    // Core refuses a kind it does not define and makes nothing, so there is nothing to finalize.
    check(b.TRReplacementCreate({}, 7) === undefined, "an invalid kind gives undefined");
    check(count() === before, "the handler of the refused replacement was dropped");
  }],

  ["a handler lives exactly as long as its replacement: disposing drops it, once", (b) => {
    const { count } = hooks(b);
    const before = count();

    const handles = [create(b, {}), create(b, {}), create(b, {})];
    check(count() === before + 3, `three handlers were added, ${count() - before} were`);

    b.disposeHandle(handles[0] as Handle<"TRReplacement">);
    check(count() === before + 2, "one was dropped");
    b.disposeHandle(handles[0] as Handle<"TRReplacement">);
    check(count() === before + 2, "disposing again changes nothing");

    b.disposeHandle(handles[1] as Handle<"TRReplacement">);
    b.disposeHandle(handles[2] as Handle<"TRReplacement">);
    check(count() === before, "all dropped");
  }],

  ["a replacement that Core still holds keeps its handler after the handle is disposed", (b) => {
    const { count } = hooks(b);
    const before = count();

    const first = create(b, { computeRoom: () => ({ ascent: 4, descent: 5, extent: 6 }) });
    const second = b.TRReplacementRetain(first) as Handle<"TRReplacement">;
    check(count() === before + 1, "one handler for two references");

    b.disposeHandle(first);
    check(count() === before + 1, "the handler stays while a reference is left");
    check(same(b.TRReplacementComputeRoom(second, 1), { ascent: 4, descent: 5, extent: 6 }), "and still works");

    b.disposeHandle(second);
    check(count() === before, "the last release drops it");
  }],

  ["an abandoned handle drops its handler when the engine collects it", (b) => {
    const { count, collect } = hooks(b);
    const before = count();

    (() => { create(b, {}); })();
    check(count() === before + 1, "the handler is held");

    for (let attempt = 0; attempt < 5 && count() !== before; attempt++) {
      collect();
    }
    check(count() === before, "the finalizer released the replacement, which dropped the handler");
  }],

  ["a replacement released on another thread queues its handler, and the JS thread destroys it", (b) => {
    const { count, retired, drain, releaseOnOtherThread } = hooks(b);
    drain();
    const before = count();
    const queued = retired();

    const replacement = create(b, {});
    releaseOnOtherThread(replacement);
    check(b.isHandleDisposed(replacement), "the handle gave its reference away");
    check(count() === before, "the entry is gone from the table");
    check(retired() === queued + 1, "and waits to be destroyed here");
    drain();
    check(retired() === queued, "drained");

    // Using the table drains it too, so a program that creates replacements never piles them up.
    releaseOnOtherThread(create(b, {}));
    check(retired() === queued + 1, "queued again");
    b.disposeHandle(create(b, {}));
    check(retired() === queued, "creating a handler drained the queue");
    check(count() === before, "nothing is left");
  }],

  ["Core asking for a room on another thread gets none, and the handler does not run", (b) => {
    const { roomOnOtherThread } = hooks(b);
    let calls = 0;
    const replacement = create(b, { computeRoom() { calls++; return { ascent: 1, descent: 1, extent: 1 }; } });
    try {
      check(same(roomOnOtherThread(replacement, 10), zero), "zero room, not what the thread started with");
      check(calls === 0, "the handler did not run");
      check(same(b.TRReplacementComputeRoom(replacement, 10), { ascent: 1, descent: 1, extent: 1 }), "it works here");
      check(calls === 1, "called here once");
    } finally {
      b.disposeHandle(replacement);
    }
  }],

  ["a fake enumeration calls its handler through the trampoline, once per item", (b) => {
    const { enumerate, count } = hooks(b);
    const before = count();
    const seen: number[] = [];
    const selves: unknown[] = [];
    const handler = { item(index: number) { selves.push(this); seen.push(index); }, coreCalls: undefined };

    check(enumerate(handler, 4) === 4, "Core called 4 times");
    check(same(seen, [0, 1, 2, 3]), `items ${seen.join(",")}`);
    check(selves.every((self) => self === handler), "this is the handler");
    check(count() === before, "the entry of the call is gone");
  }],

  ["a handler that throws in the middle of an enumeration stops it and the error comes out of the call", (b) => {
    const { enumerate, count } = hooks(b);
    const before = count();
    const failure = new Error("item 2");
    const seen: number[] = [];
    const handler: { item(index: number): void; coreCalls?: number } = {
      item(index) {
        seen.push(index);
        if (index === 2) {
          throw failure;
        }
      },
    };

    // The fake Core cannot be unwound through (it is noexcept), so a crash here would mean an
    // exception got out of the trampoline.
    check(thrownBy(() => enumerate(handler, 6)) === failure, "the same error object");
    check(same(seen, [0, 1, 2]), `the handler saw ${seen.join(",")}`);
    check(handler.coreCalls === 3, `stop was honored: Core called ${handler.coreCalls} times`);
    check(count() === before, "the entry is gone after the failure");
  }],

  ["after a failure the handler is not called again even when Core ignores stop", (b) => {
    const { enumerate } = hooks(b);
    const seen: number[] = [];
    const failure = new TypeError("first");
    const handler: { item(index: number): void; coreCalls?: number } = {
      item(index) {
        seen.push(index);
        // Both of these would throw, but only the first error is kept and the handler is not asked again.
        throw index === 0 ? failure : new Error("second");
      },
    };

    check(thrownBy(() => enumerate(handler, 5, false)) === failure, "the first error is the one thrown");
    check(same(seen, [0]), `the handler saw ${seen.join(",")}`);
    check(handler.coreCalls === 5, `Core went on to the end: ${handler.coreCalls}`);
  }],

  ["a handler that is not usable is an error, not a crash", (b) => {
    const { enumerate } = hooks(b);
    expectThrows(() => enumerate({} as never, 3), /item/);
    expectThrows(() => enumerate(5 as never, 3), /'handler' must be an object/);
    expectThrows(() => enumerate({ item() { /* nothing */ } }, -1), /'count' is out of range/, "RangeError");
  }],

  ["a failed enumeration leaves nothing for the next call", (b) => {
    const { enumerate } = hooks(b);
    thrownBy(() => enumerate({ item() { throw new Error("x"); } }, 2));

    let seen = 0;
    check(enumerate({ item() { seen++; } }, 4) === 4 && seen === 4, "the next enumeration runs to the end");
    const features = b.TRFontFeaturesCreate([{ tag: 1, value: 1 }], 1);
    check(features !== undefined, "an unrelated binding works");
    b.disposeHandle(features as Handle<"TRFontFeatures">);
  }],

  ["a collecting enumeration returns its items as an array", (b, options) => {
    const { path, elements } = findGlyphPath(b, options, 3);
    try {
      const items = b.TRPathEnumerate(path, undefined);
      check(Array.isArray(items) && items.length === elements, "an array of the elements");
      check(items?.[0]?.type === "moveTo", `the first element is ${items?.[0]?.type}`);
      check(items?.[items.length - 1]?.type === "close", `the last element is ${items?.[items.length - 1]?.type}`);
    } finally {
      b.disposeHandle(path);
    }
  }],

  ["an item that cannot be made stops a collecting enumeration, and its error is thrown after Core returns", (b, options) => {
    const { path } = findGlyphPath(b, options, 3);

    // Items are plain objects made by the runtime, which no handler touches. A setter on
    // Object.prototype makes making the second item throw, from inside the generated trampoline,
    // which is the only way to fail one without a failing allocation.
    let sets = 0;
    const failure = new Error("item 2");
    Object.defineProperty(Object.prototype, "type", {
      configurable: true,
      set(this: object, value: unknown) {
        sets++;
        if (sets === 2) {
          throw failure;
        }
        Object.defineProperty(this, "type", { value, writable: true, enumerable: true, configurable: true });
      },
    });

    try {
      check(thrownBy(() => b.TRPathEnumerate(path, undefined)) === failure, "the same error object");
      check(sets === 2, `stop was honored: ${sets} items were made`);
    } finally {
      delete (Object.prototype as { type?: unknown }).type;
    }

    const items = b.TRPathEnumerate(path, undefined);
    check(Array.isArray(items) && items.length >= 3, "the next call is clean");
    b.disposeHandle(path);
  }],
];

export function runCallbackTests(bindings: NativeBindings, options: CallbackTestOptions = {}): CallbackTestResult {
  const result: CallbackTestResult = { passed: 0, failures: [], skipped: [] };
  for (const [name, body] of tests) {
    try {
      body(bindings, options);
      result.passed++;
    } catch (e) {
      if (e instanceof Skip) {
        result.skipped.push(`${name}: ${e.message}`);
      } else {
        result.failures.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  return result;
}

export const callbackTestCount = tests.length;
