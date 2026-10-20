import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { after, before, test } from "node:test";
import { compileModules, importModule } from "./CompileModules.mjs";

// TypefaceManager and TypeFamily run over a fake of the native bindings. What is checked here is
// what the TypeScript layer decides: argument checks, which binding a lookup uses, ownership of what
// comes back, and the mapping of results. The real registry and its matching are covered by the
// device suite (example/tests/TypefaceManagerTests.ts).

interface FakeHandle {
  readonly kind: string;
  readonly id: number;
  disposed: boolean;
}

interface Wrapper {
  readonly isDisposed: boolean;
  readonly fullName: string | undefined;
  dispose(): void;
  equals(other: Wrapper): boolean;
}

interface Family {
  readonly familyName: string;
  readonly familyId: number;
  getTypefaceByStyle(width: number, weight: number, slope: number): Wrapper | undefined;
  equals(other: Family): boolean;
  toString(): string;
}

interface Manager {
  registerTypeface(typeface: Wrapper, tag?: number, familyId?: number): boolean;
  unregisterTypeface(typeface: Wrapper): boolean;
  getTypeface(tag: number): Wrapper | undefined;
  getTypefaceTag(typeface: Wrapper): number;
  getTypefaceFamilyId(typeface: Wrapper): number;
  getTypefaceByStyle(name: string, width: number, weight: number, slope: number): Wrapper | undefined;
  getTypeFamily(name: string): Family | undefined;
  getTypefaceByName(name: string): Wrapper | undefined;
  getAvailableTypefaces(): Wrapper[];
  getAvailableFamilies(): Family[];
}

interface FontFileClass {
  fromBytes(data: Uint8Array): { typefaces: { get(index: number): Wrapper } };
}

let out: string;
let TypefaceManager: Manager;
let FontFile: FontFileClass;
let nextId = 1;

const calls: string[] = [];
const made: FakeHandle[] = [];
const registry: { handle: FakeHandle; tag: number; familyId: number; fullName: string }[] = [];
// An unnamed family has a NULL name in Core, which the binding turns into undefined.
let families: { familyID: number; familyName: string | undefined }[] = [];

function handle(kind: string): FakeHandle {
  const created = { kind, id: nextId++, disposed: false };
  made.push(created);
  return created;
}

function live<T extends FakeHandle>(h: T): T {
  if (h.disposed) {
    throw new Error("handle is already disposed");
  }
  return h;
}

// A retained handle is a new handle of the same Core object, as the generated bindings make.
function retainedOf(entry: { handle: FakeHandle } | undefined): FakeHandle | undefined {
  if (entry === undefined) {
    return undefined;
  }
  const copy = handle("TRTypeface");
  (copy as FakeHandle & { core: number }).core = entry.handle.id;
  return copy;
}

function coreOf(h: FakeHandle): number {
  return (h as FakeHandle & { core?: number }).core ?? h.id;
}

before(async () => {
  out = compileModules(["src/graphics/TypefaceManager.ts", "src/graphics/FontFile.ts"]);
  TypefaceManager = ((await importModule(out, "graphics/TypefaceManager.js")) as { TypefaceManager: Manager }).TypefaceManager;
  FontFile = ((await importModule(out, "graphics/FontFile.js")) as { FontFile: FontFileClass }).FontFile;

  (globalThis as Record<string, unknown>)["__tehreer"] = {
    disposeHandle(h: FakeHandle) {
      h.disposed = true;
    },
    handleEquals: (a: FakeHandle, b: FakeHandle) => coreOf(live(a)) === coreOf(live(b)),
    isHandleMutable: () => false,
    TRFontFileCreateFromMemory: () => handle("TRFontFile"),
    TRFontFileGetTypefaceCount: () => 1,
    TRFontFileGetTypeface: () => handle("TRTypeface"),
    TRTypefaceGetFullName(h: FakeHandle) {
      const entry = registry.find((item) => item.handle.id === coreOf(live(h)));
      return entry?.fullName;
    },
    TRTypefaceManagerRegisterTypeface(h: FakeHandle, tag: number, familyId: number) {
      calls.push(`register ${tag} ${familyId}`);
      const core = coreOf(live(h));
      if (registry.some((item) => item.handle.id === core || (tag !== 0 && item.tag === tag))) {
        return false;
      }
      registry.push({ handle: h, tag, familyId, fullName: `Face ${core}` });
      return true;
    },
    TRTypefaceManagerUnregisterTypeface(h: FakeHandle) {
      const index = registry.findIndex((item) => item.handle.id === coreOf(live(h)));
      if (index < 0) {
        return false;
      }
      registry.splice(index, 1);
      return true;
    },
    TRTypefaceManagerGetTypeface(tag: number) {
      calls.push(`get ${tag}`);
      return retainedOf(tag === 0 ? undefined : registry.find((item) => item.tag === tag));
    },
    TRTypefaceManagerGetTypefaceTag: (h: FakeHandle) => registry.find((item) => item.handle.id === coreOf(live(h)))?.tag ?? 0,
    TRTypefaceManagerGetTypefaceFamilyID: (h: FakeHandle) => registry.find((item) => item.handle.id === coreOf(live(h)))?.familyId ?? 0,
    TRTypefaceManagerGetMatchingTypefaceByFamilyID(familyId: number, width: number, weight: number, slope: number) {
      calls.push(`match id ${familyId} ${width} ${weight} ${slope}`);
      return retainedOf(registry.find((item) => item.familyId === familyId && familyId !== 0));
    },
    TRTypefaceManagerGetMatchingTypefaceByFamilyName(name: string, width: number, weight: number, slope: number) {
      calls.push(`match name ${JSON.stringify(name)} ${width} ${weight} ${slope}`);
      return retainedOf(registry.find((item) => item.familyId === 0));
    },
    TRTypefaceManagerEnumerateTypefaces: () => registry.map((item) => retainedOf(item)),
    TRTypefaceManagerEnumerateFamilies: () => families,
  };
});

after(() => {
  delete (globalThis as Record<string, unknown>)["__tehreer"];
  rmSync(out, { recursive: true, force: true });
});

function typeface(): Wrapper {
  return FontFile.fromBytes(new Uint8Array(4)).typefaces.get(0);
}

function reset(): void {
  registry.length = 0;
  calls.length = 0;
  families = [];
}

test("register, look up and unregister pass tags and IDs through, and report what Core answers", () => {
  reset();
  const face = typeface();

  assert.equal(TypefaceManager.registerTypeface(face, 41, 7), true);
  assert.deepEqual(calls, ["register 41 7"]);
  assert.equal(TypefaceManager.registerTypeface(face, 42), false, "a typeface is registered once");
  assert.equal(TypefaceManager.getTypefaceTag(face), 41);
  assert.equal(TypefaceManager.getTypefaceFamilyId(face), 7);

  const other = typeface();
  assert.equal(TypefaceManager.registerTypeface(other, 41), false, "a tag is taken once");
  assert.equal(TypefaceManager.getTypefaceTag(other), 0);

  assert.equal(TypefaceManager.unregisterTypeface(face), true);
  assert.equal(TypefaceManager.unregisterTypeface(face), false);
  assert.equal(TypefaceManager.registerTypeface(face), true);
  assert.deepEqual(calls.at(-1), "register 0 0", "tag and family ID default to none");
});

test("a typeface from the manager owns a reference of its own and is the same Core object", () => {
  reset();
  const face = typeface();
  TypefaceManager.registerTypeface(face, 5);

  const found = TypefaceManager.getTypeface(5);
  assert.ok(found);
  assert.notEqual(found, face);
  assert.ok(found.equals(face));
  found.dispose();
  assert.equal(face.isDisposed, false, "disposing the copy leaves the other wrapper");
  assert.equal(TypefaceManager.getTypeface(5)?.equals(face), true);

  assert.equal(TypefaceManager.getTypeface(0), undefined);
  assert.equal(TypefaceManager.getTypeface(99), undefined);
});

test("tags and family IDs that are not whole numbers are a RangeError and reach no binding", () => {
  reset();
  const face = typeface();
  for (const bad of [-1, 1.5, NaN, Infinity, 2 ** 53, "3" as unknown as number]) {
    assert.throws(() => TypefaceManager.registerTypeface(face, bad), RangeError, `tag ${String(bad)}`);
    assert.throws(() => TypefaceManager.registerTypeface(face, 1, bad), RangeError, `family ${String(bad)}`);
    assert.throws(() => TypefaceManager.getTypeface(bad), RangeError, `get ${String(bad)}`);
  }
  assert.deepEqual(calls, []);
});

test("a disposed typeface is refused by every call, and a disposed wrapper leaves the registration", () => {
  reset();
  const face = typeface();
  TypefaceManager.registerTypeface(face, 8);
  face.dispose();

  assert.equal(TypefaceManager.getTypeface(8) !== undefined, true, "the manager keeps its own reference");
  for (const call of [
    () => TypefaceManager.registerTypeface(face),
    () => TypefaceManager.unregisterTypeface(face),
    () => TypefaceManager.getTypefaceTag(face),
    () => TypefaceManager.getTypefaceFamilyId(face),
  ]) {
    assert.throws(call, /already disposed/);
  }
});

test("matching by family ID and by name use different bindings and return owners", () => {
  reset();
  const withId = typeface();
  TypefaceManager.registerTypeface(withId, 1, 9);
  const withoutId = typeface();
  TypefaceManager.registerTypeface(withoutId, 2, 0);
  families = [
    { familyID: 0, familyName: "Roboto" },
    { familyID: 9, familyName: "Roboto" },
  ];

  const [byName, byId] = TypefaceManager.getAvailableFamilies() as [Family, Family];
  calls.length = 0;

  const named = byName.getTypefaceByStyle(5, 400, 0);
  assert.deepEqual(calls, ['match name "Roboto" 5 400 0']);
  assert.ok(named?.equals(withoutId));
  assert.equal(named?.isDisposed, false);

  const identified = byId.getTypefaceByStyle(3, 700, 1);
  assert.equal(calls.at(-1), "match id 9 3 700 1");
  assert.ok(identified?.equals(withId));

  assert.ok(TypefaceManager.getTypefaceByStyle("ROBOTO", 5, 400, 0)?.equals(withoutId));
  assert.equal(calls.at(-1), 'match name "ROBOTO" 5 400 0', "the name is Core's to compare");
  assert.ok(TypefaceManager.getTypefaceByStyle("", 5, 400, 0), "an empty name is passed on, not refused");

  registry.length = 0;
  assert.equal(byId.getTypefaceByStyle(5, 400, 0), undefined, "an emptied family finds nothing");
  assert.equal(TypefaceManager.getTypefaceByStyle("Roboto", 5, 400, 0), undefined);
});

test("families are snapshots with a name and an ID, and equal when both agree", () => {
  reset();
  families = [
    { familyID: 0, familyName: "Alpha" },
    { familyID: 4, familyName: "Beta" },
    { familyID: 0, familyName: undefined },
  ];

  const [a, b, unnamed] = TypefaceManager.getAvailableFamilies() as [Family, Family, Family];
  assert.equal(a.familyName, "Alpha");
  assert.equal(a.familyId, 0);
  assert.equal(b.familyId, 4);
  assert.equal(unnamed.familyName, "");
  assert.equal(a.toString(), "TypeFamily(Alpha)");

  const again = TypefaceManager.getAvailableFamilies();
  assert.equal(a.equals(again[0] as Family), true);
  assert.equal(a.equals(b), false);
  assert.equal(a.equals(unnamed), false);

  assert.equal(TypefaceManager.getTypeFamily("BETA")?.familyId, 4, "ASCII case is ignored");
  assert.equal(TypefaceManager.getTypeFamily("alpha")?.familyName, "Alpha");
  assert.equal(TypefaceManager.getTypeFamily("Gamma"), undefined);
  assert.equal(TypefaceManager.getTypeFamily("")?.familyName, "");
  assert.equal(TypefaceManager.getTypeFamily("")?.toString(), "TypeFamily()");
  assert.equal(TypefaceManager.getTypeFamily("")?.getTypefaceByStyle(5, 400, 0), undefined, "matching through an unnamed family does not throw");
  assert.equal(calls.at(-1), 'match name "" 5 400 0');

  families = [{ familyID: 0, familyName: "\u00c9cole" }];
  assert.equal(TypefaceManager.getTypeFamily("\u00e9cole"), undefined, "only ASCII letters fold, as in Core");
  assert.equal(TypefaceManager.getTypeFamily("\u00c9cole")?.familyName, "\u00c9cole");
});

test("a family cannot be made by the application", () => {
  reset();
  families = [{ familyID: 1, familyName: "X" }];
  const family = TypefaceManager.getAvailableFamilies()[0] as Family;
  const Constructor = family.constructor as new (token: unknown, name: string, id: number) => Family;
  assert.throws(() => new Constructor(undefined, "X", 1), /comes from the TypefaceManager/);
});

test("the available typefaces are owners of their own, in the order Core gives", () => {
  reset();
  const first = typeface();
  const second = typeface();
  TypefaceManager.registerTypeface(first, 1);
  TypefaceManager.registerTypeface(second, 2);

  const all = TypefaceManager.getAvailableTypefaces();
  assert.equal(all.length, 2);
  assert.ok((all[0] as Wrapper).equals(first));
  assert.ok((all[1] as Wrapper).equals(second));

  for (const item of all) {
    item.dispose();
  }
  assert.equal(first.isDisposed, false);
  assert.equal(TypefaceManager.getAvailableTypefaces().length, 2, "disposing the copies unregisters nothing");

  reset();
  assert.deepEqual(TypefaceManager.getAvailableTypefaces(), []);
  assert.deepEqual(TypefaceManager.getAvailableFamilies(), []);
});

test("a lookup by full name disposes the typefaces it does not return", () => {
  reset();
  const first = typeface();
  const second = typeface();
  TypefaceManager.registerTypeface(first, 1);
  TypefaceManager.registerTypeface(second, 2);
  const before = made.length;

  const wanted = second.fullName as string;
  const found = TypefaceManager.getTypefaceByName(wanted);
  assert.ok(found?.equals(second));
  assert.equal(found?.isDisposed, false);

  const created = made.slice(before);
  assert.equal(created.length, 2);
  assert.equal(created.filter((item) => item.disposed).length, 1, "only the one that is returned stays alive");

  const sizeBefore = made.length;
  assert.equal(TypefaceManager.getTypefaceByName("No such face"), undefined);
  assert.ok(made.slice(sizeBefore).every((item) => item.disposed), "nothing leaks when nothing matches");
});
