import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { pathToFileURL } from "node:url";

// NativeObject is imported with `.js` specifiers, which node cannot map to `.ts`, and the library
// is not built for the tests, so the one module is compiled into a scratch directory first.
const root = join(import.meta.dirname, "..");
const scratch = mkdtempSync(join(tmpdir(), "tehreer-native-object-"));

interface Handle {
  readonly id: number;
  group: string;
}

interface Fake {
  disposed: Set<number>;
  releases: number;
}

type Constructor = new (token: symbol, handle: Handle) => NativeObjectLike;

interface NativeObjectLike {
  readonly isDisposed: boolean;
  readonly nativeHandle: Handle;
  equals(other: NativeObjectLike): boolean;
  dispose(): void;
  [Symbol.dispose](): void;
}

interface Module {
  NativeObject: { adopting(this: Constructor, handle: Handle): NativeObjectLike; retaining(this: Constructor, handle: Handle, retain: (handle: Handle) => Handle | undefined): NativeObjectLike };
  handleOf(object: NativeObjectLike | undefined): Handle | undefined;
  adopt: symbol;
}

let loaded: { NativeObject: Module["NativeObject"]; handleOf: Module["handleOf"]; adopt: symbol };
let Wrapper: Constructor;
const fake: Fake = { disposed: new Set(), releases: 0 };
let nextId = 1;

// What the native side does, reduced to its observable contract: a handle holds an address, equal
// addresses are the same Core object, and a disposed handle stays disposed.
function makeHandle(group = "TRThing"): Handle {
  return { id: nextId++, group };
}

before(async () => {
  const tsc = join(root, "node_modules/typescript/lib/tsc.js");
  const result = spawnSync(process.execPath, [
    tsc, join(root, "src/internal/NativeObject.ts"), "--outDir", scratch, "--rootDir", join(root, "src"),
    "--target", "es2022", "--module", "nodenext", "--moduleResolution", "nodenext", "--lib", "es2022,esnext.disposable",
    "--ignoreConfig", "--skipLibCheck", "--erasableSyntaxOnly", "--strict",
  ], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  writeFileSync(join(scratch, "package.json"), '{"type":"module"}');

  const nativeObject = (await import(pathToFileURL(join(scratch, "internal/NativeObject.js")).href)) as Pick<Module, "NativeObject" | "handleOf">;
  const adopt = ((await import(pathToFileURL(join(scratch, "internal/Adopt.js")).href)) as Pick<Module, "adopt">).adopt;
  loaded = { ...nativeObject, adopt };

  (globalThis as Record<string, unknown>)["__tehreer"] = {
    disposeHandle(handle: Handle) {
      if (handle.group === "TRFailing" && !fake.disposed.has(-handle.id)) {
        fake.disposed.add(-handle.id);
        throw new Error("release failed");
      }
      if (!fake.disposed.has(handle.id)) {
        fake.disposed.add(handle.id);
        fake.releases++;
      }
    },
    handleEquals(first: Handle, second: Handle) {
      return first.id === second.id;
    },
  };

  // The extension point that real wrappers use: an internal constructor with the adopt token.
  class Thing extends (loaded.NativeObject as unknown as new (handle: Handle) => NativeObjectLike) {
    constructor(token: symbol, handle: Handle) {
      assert.equal(token, loaded.adopt);
      super(handle);
    }
  }
  Wrapper = Thing as unknown as Constructor;
});

after(() => {
  delete (globalThis as Record<string, unknown>)["__tehreer"];
  rmSync(scratch, { recursive: true, force: true });
});

function wrap(): NativeObjectLike {
  return loaded.NativeObject.adopting.call(Wrapper, makeHandle());
}

test("dispose releases the reference once, however often it is called", () => {
  const before = fake.releases;
  const object = wrap();

  object.dispose();
  object.dispose();
  object[Symbol.dispose]();

  assert.equal(fake.releases, before + 1);
  assert.equal(object.isDisposed, true);
});

test("a disposed object throws 'already disposed' from nativeHandle and equals", () => {
  const object = wrap();
  const other = wrap();
  object.dispose();

  assert.throws(() => object.nativeHandle, /Thing is already disposed/);
  assert.throws(() => object.equals(other), /already disposed/);
  assert.throws(() => other.equals(object), /already disposed/);
});

test("an object that is alive exposes its handle", () => {
  const handle = makeHandle();
  const object = loaded.NativeObject.adopting.call(Wrapper, handle);

  assert.equal(object.isDisposed, false);
  assert.equal(object.nativeHandle, handle);
  assert.equal(loaded.handleOf(object), handle);
  assert.equal(loaded.handleOf(undefined), undefined);
});

test("equals compares the Core object, not the wrapper", () => {
  const object = wrap();

  assert.equal(object.equals(object), true);
  assert.equal(object.equals(wrap()), false);
});

test("retaining takes the reference of its own that retain returns", () => {
  const original = makeHandle();
  let retainedFrom: Handle | undefined;
  const copy = makeHandle();

  const object = loaded.NativeObject.retaining.call(Wrapper, original, (handle) => {
    retainedFrom = handle;
    return copy;
  });

  assert.equal(retainedFrom, original);
  assert.equal(object.nativeHandle, copy);
  object.dispose();
  assert.ok(fake.disposed.has(copy.id));
  assert.ok(!fake.disposed.has(original.id));
});

test("retaining fails when Core returns no reference", () => {
  assert.throws(() => loaded.NativeObject.retaining.call(Wrapper, makeHandle(), () => undefined), /did not return a reference/);
});

test("a dispose that fails leaves the object alive, and it can be disposed again", () => {
  const object = loaded.NativeObject.adopting.call(Wrapper, makeHandle("TRFailing"));

  assert.throws(() => object.dispose(), /release failed/);
  assert.equal(object.isDisposed, false);
  object.dispose();
  assert.equal(object.isDisposed, true);
});
