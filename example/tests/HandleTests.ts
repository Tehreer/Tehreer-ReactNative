import { NativeObject } from '../../src/internal/NativeObject';
import type { NativeBindings } from '../../src/internal/NativeBindings';
import { adopt } from '../../src/internal/Adopt';
import type { Handle } from '../../src/internal/NativeFunctions';

// The suite of the handle runtime (issue #7): ownership, dispose, use after dispose, the finalizer
// path and the checks of the marshal helpers. It runs against the real bindings in Hermes.

export interface TestResult {
  passed: number;
  failures: string[];
}

class Features extends NativeObject<'TRFontFeatures'> {
  constructor(token: typeof adopt, handle: Handle<'TRFontFeatures'>) {
    if (token !== adopt) {
      throw new Error('Features is created internally.');
    }
    super(handle);
  }
}

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

function features(b: NativeBindings, count = 1): Handle<'TRFontFeatures'> {
  const items = Array.from({ length: count }, (_, i) => ({ tag: i + 1, value: 1 }));
  const created = b.TRFontFeaturesCreate(items, count);
  check(created !== undefined, 'TRFontFeaturesCreate returned no handle');
  return created as Handle<'TRFontFeatures'>;
}

function requireHooks(b: NativeBindings) {
  const { testCreateProbe, testGetProbeReleaseCount, testCollectGarbage } = b;
  if (!testCreateProbe || !testGetProbeReleaseCount || !testCollectGarbage) {
    throw new Error('the debug hooks are missing: the finalizer tests need a debug build of the native module');
  }
  return {
    createProbe: (kind: number) => testCreateProbe.call(b, kind),
    releaseCount: (kind: number) => testGetProbeReleaseCount.call(b, kind),
    collect: () => testCollectGarbage.call(b),
  };
}

// Creates probes in a scope of their own, so that nothing on this call's stack keeps them alive.
// Kind 0 is disposed explicitly and kind 1 is abandoned.
function createProbes(b: NativeBindings, disposed: number, abandoned: number): void {
  const { createProbe } = requireHooks(b);
  for (let i = 0; i < disposed; i++) {
    b.disposeHandle(createProbe(0));
  }
  for (let i = 0; i < abandoned; i++) {
    createProbe(1);
  }
}

// Collects until the abandoned probes were released, which proves that the collector ran their
// finalizers. A last value may stay pinned by the engine, hence the slack.
function collectAbandoned(b: NativeBindings, created: number, before: number, slack = 2): void {
  const { collect, releaseCount } = requireHooks(b);
  for (let attempt = 0; attempt < 10 && releaseCount(1) - before < created - slack; attempt++) {
    collect();
  }
  check(releaseCount(1) - before >= created - slack, `the collector released only ${releaseCount(1) - before} of ${created} abandoned handles`);
  check(releaseCount(1) - before <= created, `released ${releaseCount(1) - before} of ${created} abandoned handles: too many`);
}

const tests: [string, (b: NativeBindings) => void][] = [
  ['a created handle works until it is disposed', (b) => {
    const handle = features(b, 3);
    check(b.TRFontFeaturesGetCount(handle) === 3, 'count');
    check(!b.isHandleDisposed(handle), 'alive');
    b.disposeHandle(handle);
    check(b.isHandleDisposed(handle), 'disposed');
  }],

  ['dispose twice is safe', (b) => {
    const handle = features(b);
    b.disposeHandle(handle);
    b.disposeHandle(handle);
    check(b.isHandleDisposed(handle), 'still disposed');
  }],

  ['use after dispose throws "already disposed"', (b) => {
    const handle = features(b);
    b.disposeHandle(handle);
    expectThrows(() => b.TRFontFeaturesGetCount(handle), /TRFontFeaturesGetCount: 'features' is already disposed/);
    expectThrows(() => b.TRFontFeaturesRetain(handle), /already disposed/);
  }],

  ['a retained handle outlives the one it came from', (b) => {
    const first = features(b, 2);
    const second = b.TRFontFeaturesRetain(first) as Handle<'TRFontFeatures'>;
    check(second !== first, 'a retain gives a new handle');
    check(b.handleEquals(first, second), 'both hold the same Core object');
    check(!b.handleEquals(first, features(b, 2)), 'different objects differ');

    b.disposeHandle(first);
    check(b.TRFontFeaturesGetCount(second) === 2, 'the object is still alive');
    expectThrows(() => b.handleEquals(first, second), /already disposed/);
    b.disposeHandle(second);
  }],

  ['a handle of another kind is refused', (b) => {
    const handle = features(b);
    expectThrows(() => b.TRTypefaceGetWeight(handle as unknown as Handle<'TRTypeface'>), /must be a TRTypeface handle, not TRFontFeatures/);
    b.disposeHandle(handle);
  }],

  ['values that are no handle are refused', (b) => {
    const get = b.TRFontFeaturesGetCount as (value: unknown) => number;
    expectThrows(() => get({}), /not a Tehreer handle/);
    expectThrows(() => get(42), /not a Tehreer handle/);
    expectThrows(() => get(undefined), /must not be null or undefined/);
    expectThrows(() => get(null), /must not be null or undefined/);
    expectThrows(() => b.disposeHandle({} as Handle<string>), /not a Tehreer handle/);
  }],

  ['invalid numbers and counts are refused before Core is called', (b) => {
    expectThrows(() => b.TRFontFeaturesCreate([{ tag: 1, value: 1 }], 2), /has fewer elements/, 'RangeError');
    expectThrows(() => b.TRFontFeaturesCreate([], 1.5), /must be an integer/, 'RangeError');
    expectThrows(() => b.TRFontFeaturesCreate([], -2), /out of range/, 'RangeError');
    expectThrows(() => b.TRFontFeaturesCreate([], Number.NaN), /must be an integer/, 'RangeError');
    expectThrows(() => b.TRFontFeaturesCreate([{ tag: 'a' as unknown as number, value: 1 }], 1), /must be a number/);
    expectThrows(() => b.TRFontFeaturesCreate('x' as unknown as [], 0), /must be an array/);
    expectThrows(() => b.TRFontFeaturesCreate([{ tag: 2 ** 32, value: 1 }], 1), /out of range/, 'RangeError');
  }],

  ['a pointer view is a host object that exposes only the element, its size and the count', (b) => {
    const handle = features(b, 2);
    const view = b.TRFontFeaturesGetItemsPtr(handle) as unknown as Record<string, unknown> | undefined;
    check(view !== undefined, 'a view is returned');
    check(view?.element === 'TROpenTypeFeature' && view.elementSize === 8, `${view?.element} ${view?.elementSize}`);
    check(view?.count === 2, `count ${view?.count}`);
    // The address and the owner are native only: a script cannot read or forge them.
    check(view?.address === undefined && view?.owner === undefined, 'no address or owner is exposed');
    check(Object.keys(view ?? {}).sort().join() === 'count,element,elementSize', `keys ${Object.keys(view ?? {})}`);
    b.disposeHandle(handle);
  }],

  ['indices map -1 to TRInvalidIndex and colors and tags keep every 32-bit value', (b) => {
    // -1 as a count is TRInvalidIndex: a huge count, so the array is too short.
    expectThrows(() => b.TRFontFeaturesCreate([{ tag: 1, value: 1 }], -1), /has fewer elements/, 'RangeError');
    expectThrows(() => b.TRFontFeaturesCreate([{ tag: 1, value: 1 }], -2), /out of range/, 'RangeError');
    // 0xFFFFFFFF is a plain number for a tag and a value, and -1 is not one.
    const handle = b.TRFontFeaturesCreate([{ tag: 0xffffffff, value: 0xffffffff }], 1) as Handle<'TRFontFeatures'>;
    check(b.TRFontFeaturesGetCount(handle) === 1, 'created with 0xFFFFFFFF');
    b.disposeHandle(handle);
    expectThrows(() => b.TRFontFeaturesCreate([{ tag: -1, value: 1 }], 1), /out of range/, 'RangeError');
    expectThrows(() => b.TRFontFeaturesCreate([{ tag: 1, value: -1 }], 1), /out of range/, 'RangeError');
  }],

  ['an immutable handle is refused where a mutable one is needed', (b) => {
    const text = b.TRTextCreate(new Uint16Array([0x61, 0x62, 0x63]), 3, 1) as Handle<'TRText'>;
    check(b.TRTextGetLength(text) === 3, 'a const reference works for reads');
    expectThrows(() => b.TRTextBeginEditing(text as unknown as Handle<'TRText'>), /'text' is immutable/);
    b.disposeHandle(text);
  }],

  ['a mutable handle is accepted for const and mutable parameters, and shares its group', (b) => {
    const mutable = b.TRTextCreateMutable(1) as Handle<'TRText'>;
    check(b.TRTextGetLength(mutable) === 0, 'read through the const type');
    b.TRTextBeginEditing(mutable);
    b.TRTextEndEditing(mutable);

    // The retain binding takes and returns the const type: the new handle is immutable, but it is the same object.
    const readOnly = b.TRTextRetain(mutable) as Handle<'TRText'>;
    check(b.handleEquals(mutable, readOnly), 'the mutable and the const handle are one object');
    expectThrows(() => b.TRTextBeginEditing(readOnly), /immutable/);

    // A copy is another object.
    const copy = b.TRTextCreateMutableCopy(mutable) as Handle<'TRText'>;
    check(!b.handleEquals(mutable, copy), 'a copy is another object');
    b.TRTextBeginEditing(copy);
    b.TRTextEndEditing(copy);
    for (const handle of [mutable, readOnly, copy]) b.disposeHandle(handle);
  }],

  ['typed arrays and DataViews are accepted as buffers, other objects are not', (b) => {
    const fake = { buffer: new ArrayBuffer(8), byteOffset: 0, byteLength: 8 };
    const text = b.TRTextCreate(new Uint16Array(new ArrayBuffer(8), 2, 2), 2, 1) as Handle<'TRText'>;
    check(b.TRTextGetLength(text) === 2, 'a typed array with an offset');
    b.disposeHandle(text);
    const viewed = b.TRTextCreate(new DataView(new ArrayBuffer(8)), 4, 0) as Handle<'TRText'>;
    check(b.TRTextGetLength(viewed) === 4, 'a DataView');
    b.disposeHandle(viewed);
    expectThrows(() => b.TRTextCreate(fake as unknown as ArrayBuffer, 4, 0), /must be an ArrayBuffer or a typed array/);
    expectThrows(() => b.TRTextCreate(new Proxy(new Uint8Array(4), {}) as unknown as Uint8Array, 4, 0), /must be an ArrayBuffer or a typed array/);
    expectThrows(() => b.TRTextCreate(new Uint8Array(2), 4, 0), /too small/, 'RangeError');
  }],

  ['a getter on a view cannot run during the conversion', (b) => {
    const view = new Uint8Array(4);
    let ran = false;
    Object.defineProperty(view, 'buffer', { get() { ran = true; return new ArrayBuffer(0); } });
    const text = b.TRTextCreate(view, 4, 0) as Handle<'TRText'>;
    check(!ran, 'the own getter ran');
    check(b.TRTextGetLength(text) === 4, 'the real buffer was used');
    b.disposeHandle(text);
  }],

  ['NativeObject disposes, throws and compares', (b) => {
    const object = Features.adopting(features(b));
    const copy = Features.retaining(object.nativeHandle, b.TRFontFeaturesRetain as never) as Features;
    check(object.equals(copy), 'equals');
    check(!object.isDisposed, 'alive');

    object.dispose();
    object.dispose();
    check(object.isDisposed, 'disposed');
    expectThrows(() => object.nativeHandle, /Features is already disposed/);
    expectThrows(() => object.equals(copy), /already disposed/);
    check(b.TRFontFeaturesGetCount(copy.nativeHandle) === 1, 'the copy is independent');
    copy[Symbol.dispose]();
    check(copy.isDisposed, 'Symbol.dispose disposes');
  }],

  // The finalizer tests need the debug hooks (no NDEBUG), so they cannot run against a release build.
  ['dispose releases at once, and a collection does not release it again', (b) => {
    const { releaseCount, collect } = requireHooks(b);
    const disposedBefore = releaseCount(0);
    const abandonedBefore = releaseCount(1);
    // Disposed and abandoned handles go through the same collections, so the abandoned ones prove
    // that the finalizers ran before the count of the disposed ones is read.
    createProbes(b, 30, 30);
    check(releaseCount(0) - disposedBefore === 30, 'dispose released 30 at once');
    collectAbandoned(b, 30, abandonedBefore);
    collect();
    collect();
    check(releaseCount(0) - disposedBefore === 30, `disposed handles were released ${releaseCount(0) - disposedBefore} times`);
  }],

  ['the finalizer releases handles that were never disposed', (b) => {
    const before = requireHooks(b).releaseCount(1);
    createProbes(b, 0, 50);
    collectAbandoned(b, 50, before);
  }],

  ['abandoned Core objects are collected without a crash', (b) => {
    for (let i = 0; i < 200; i++) {
      features(b, 4);
    }
    requireHooks(b).collect();
    requireHooks(b).collect();
    check(b.smokeTest(), 'Core still works');
  }],

  ['the bindings object is frozen and cannot be replaced', (b) => {
    // Reflect reports the refusal as a result, whether or not the module runs in strict mode.
    check(Object.isFrozen(b), 'frozen');
    check(!Reflect.set(globalThis, '__tehreer', {}), 'the property is writable');
    check(!Reflect.deleteProperty(globalThis, '__tehreer'), 'the property is configurable');
    check(!Reflect.set(b, 'getVersion', () => 'x'), 'a function can be replaced');
  }],
];

export function runHandleTests(bindings: NativeBindings): TestResult {
  const result: TestResult = { passed: 0, failures: [] };
  for (const [name, body] of tests) {
    try {
      body(bindings);
      result.passed++;
    } catch (e) {
      result.failures.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return result;
}

export const handleTestCount = tests.length;
