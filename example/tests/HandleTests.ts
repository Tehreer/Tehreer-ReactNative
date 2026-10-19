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
    throw new Error('the debug hooks are missing: device tests need a debug build');
  }
  return {
    createProbe: () => testCreateProbe.call(b),
    releaseCount: () => testGetProbeReleaseCount.call(b),
    collect: () => testCollectGarbage.call(b),
  };
}

// Creates handles in a scope of their own, so that nothing on this call's stack keeps them alive.
function createProbes(b: NativeBindings, count: number, disposeEvery: number): void {
  const { createProbe } = requireHooks(b);
  for (let i = 0; i < count; i++) {
    const probe = createProbe();
    if (disposeEvery > 0 && i % disposeEvery === 0) {
      b.disposeHandle(probe);
    }
  }
}

function collectUntil(b: NativeBindings, condition: () => boolean): boolean {
  const { collect } = requireHooks(b);
  for (let attempt = 0; attempt < 10 && !condition(); attempt++) {
    collect();
  }
  return condition();
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

  ['a pointer view keeps its owner reachable', (b) => {
    const handle = features(b, 2);
    const items = b.TRFontFeaturesGetItemsPtr(handle) as unknown as { owner: unknown } | undefined;
    check(items !== undefined && items.owner === handle, 'the view keeps its owner');
    b.disposeHandle(handle);
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

  ['a probe is released once by dispose, and not again by collection', (b) => {
    const { releaseCount } = requireHooks(b);
    const before = releaseCount();
    createProbes(b, 1, 1);
    check(releaseCount() === before + 1, 'dispose released the reference');
    // Collect the disposed handle: its finalizer must not release a second time.
    b.testCollectGarbage?.();
    b.testCollectGarbage?.();
    check(releaseCount() === before + 1, `released ${releaseCount() - before} times`);
  }],

  ['the finalizer releases handles that were never disposed', (b) => {
    const { releaseCount } = requireHooks(b);
    const before = releaseCount();
    createProbes(b, 50, 0);
    check(collectUntil(b, () => releaseCount() - before >= 50), `only ${releaseCount() - before} of 50 were released`);
    // Not more: each reference is released exactly once.
    check(releaseCount() - before === 50, `released ${releaseCount() - before} times`);
  }],

  ['mixed disposed and abandoned handles are each released once', (b) => {
    const { releaseCount } = requireHooks(b);
    const before = releaseCount();
    createProbes(b, 40, 2);
    check(collectUntil(b, () => releaseCount() - before >= 40), `only ${releaseCount() - before} of 40 were released`);
    check(releaseCount() - before === 40, `released ${releaseCount() - before} times`);
  }],

  ['abandoned Core objects are collected without a crash', (b) => {
    for (let i = 0; i < 200; i++) {
      features(b, 4);
    }
    collectUntil(b, () => false);
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
