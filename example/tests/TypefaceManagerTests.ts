import type { NativeBindings } from '../../src/internal/NativeBindings';
import { FontFile } from '../../src/graphics/FontFile';
import type { Typeface } from '../../src/graphics/Typeface';
import { TypefaceManager } from '../../src/graphics/TypefaceManager';
import { fontBytes as robotoBytes, variableFontBytes } from './fontData';

// The suite of TypefaceManager and TypeFamily (issue #16), against the real registry of Core in
// Hermes. The registry is shared by the whole process, so every test unregisters what it registered
// (see `register`), whatever the outcome. The matching cases follow Core's own
// TypefaceManagerTests.cpp (testVariationMatching): the variation coordinates of Roboto-Variable
// are the weight and the width.

export interface TestResult {
  passed: number;
  failures: string[];
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

function roboto(): Typeface {
  return FontFile.fromBytes(robotoBytes).typefaces.get(0);
}

function variable(): Typeface {
  return FontFile.fromBytes(variableFontBytes).typefaces.get(0);
}

function collect(b: NativeBindings): void {
  if (b.testCollectGarbage) {
    b.testCollectGarbage();
    b.testCollectGarbage();
  }
}

// What a test registered, to unregister afterwards.
let registered: Typeface[] = [];

function register(typeface: Typeface, tag = 0, familyId = 0): boolean {
  const done = TypefaceManager.registerTypeface(typeface, tag, familyId);
  if (done) {
    registered.push(typeface);
  }
  return done;
}

function cleanUp(): void {
  // The registry keeps its own reference, so what it holds is unregistered by enumerating it
  // instead of trusting the list of wrappers made by the tests.
  for (const typeface of TypefaceManager.getAvailableTypefaces()) {
    TypefaceManager.unregisterTypeface(typeface);
    typeface.dispose();
  }
  registered = [];
}

// The tag of what a match found, which is 0 for none.
function tagOf(found: Typeface | undefined): number {
  if (found === undefined) {
    return 0;
  }
  const tag = TypefaceManager.getTypefaceTag(found);
  found.dispose();
  return tag;
}

function fold(text: string | undefined): string {
  return (text ?? '').replace(/[A-Z]/g, (letter) => String.fromCharCode(letter.charCodeAt(0) + 32));
}

const tests: [string, (b: NativeBindings) => void][] = [
  ['a typeface is registered by tag and family ID, found again and unregistered', () => {
    const face = roboto();
    check(register(face, 11, 21), 'registered');
    check(TypefaceManager.getTypefaceTag(face) === 11, 'tag');
    check(TypefaceManager.getTypefaceFamilyId(face) === 21, 'family ID');

    const found = TypefaceManager.getTypeface(11);
    check(found !== undefined && found.equals(face), 'the tag finds the same Core object');
    check(found !== face, 'a new wrapper');
    check(TypefaceManager.getTypeface(12) === undefined && TypefaceManager.getTypeface(0) === undefined, 'no such tag, and 0 is none');
    found!.dispose();

    const other = roboto();
    check(TypefaceManager.getTypefaceTag(other) === 0 && TypefaceManager.getTypefaceFamilyId(other) === 0, 'not registered: zeros');
    check(!TypefaceManager.unregisterTypeface(other), 'not registered, so not unregistered');
    other.dispose();

    check(TypefaceManager.unregisterTypeface(face), 'unregistered');
    check(!TypefaceManager.unregisterTypeface(face), 'only once');
    check(TypefaceManager.getTypeface(11) === undefined, 'the tag is free');
    check(TypefaceManager.getTypefaceTag(face) === 0 && TypefaceManager.getTypefaceFamilyId(face) === 0, 'back to zeros');
    check(register(face, 11, 21), 'it can be registered again');
    face.dispose();
  }],

  ['a typeface registered without a tag or a family ID reports zeros', () => {
    const face = roboto();
    check(register(face), 'registered with the defaults');
    check(TypefaceManager.getTypefaceTag(face) === 0 && TypefaceManager.getTypefaceFamilyId(face) === 0, 'zeros');
    face.dispose();
  }],

  ['a typeface registers once, and a tag is taken once', () => {
    const face = roboto();
    const other = roboto();
    check(register(face, 31, 0), 'first');
    check(!register(face, 32, 0), 'the same typeface again');
    check(!register(other, 31, 0), 'a taken tag');
    check(register(other, 0, 0) && register(variable(), 0, 0), 'tag 0 is not a tag, so it is never taken');
    check(TypefaceManager.getTypefaceTag(other) === 0, 'still none');
  }],

  ['the manager keeps its own reference: the wrapper, the font file and the base can be disposed', () => {
    const file = FontFile.fromBytes(variableFontBytes);
    const base = file.typefaces.get(0);
    const derived = base.getVariationInstance([700, 100])!;
    check(register(derived, 41, 51), 'registered');
    derived.dispose();
    base.dispose();
    file.dispose();
    check(derived.isDisposed, 'the wrapper is disposed');

    const found = TypefaceManager.getTypeface(41);
    check(found !== undefined && found.weight === 700 && found.width === 5, 'the typeface lives on in the manager');
    check(found!.getGlyphId(0x61) === 1, 'and still works');
    check(TypefaceManager.unregisterTypeface(found!), 'it unregisters through another wrapper');
    check(TypefaceManager.getTypeface(41) === undefined, 'gone');
    found!.dispose();
  }],

  ['a collected wrapper leaves the registration in place (the manager holds its own reference that keeps the typeface alive)', (b) => {
    const base = variable();
    let face: Typeface | undefined = base.getVariationInstance([300, 100])!;
    check(register(face, 61, 0), 'registered');
    registered = [];
    face = undefined;
    collect(b);
    collect(b);
    const found = TypefaceManager.getTypeface(61);
    check(found !== undefined && found.weight === 300, 'the finalizer released only the wrapper reference');
    check(TypefaceManager.unregisterTypeface(found!), 'unregistered');
    found!.dispose();
    base.dispose();
  }],

  ['the typeface of a family that is closest to a width and a weight is picked', () => {
    const base = variable();
    const light = base.getVariationInstance([300, 75])!;
    const bold = base.getVariationInstance([700, 100])!;
    const condensed = base.getVariationInstance([700, 75])!;
    check(light.weight === 300 && light.width === 3 && bold.weight === 700 && condensed.width === 3, 'the instances report their traits');

    check(register(base, 600, 250) && register(light, 601, 250) && register(bold, 602, 250) && register(condensed, 603, 250), 'registered');
    const match = (width: number, weight: number, slope = 0): number =>
      tagOf(TypefaceManager.getAvailableFamilies().find((family) => family.familyId === 250)!.getTypefaceByStyle(width as 5, weight, slope as 0));

    check(match(5, 400) === 600, 'regular');
    check(match(5, 700) === 602, 'bold');
    check(match(3, 300) === 601, 'condensed light');
    check(match(3, 700) === 603, 'condensed bold');
    check(match(7, 300) === 600, 'nothing is wider, so the closest narrower width, and then the weight');
    check(match(5, 350) === 600 || match(5, 350) === 601, 'a weight between two');

    check(TypefaceManager.unregisterTypeface(base) && tagOf(TypefaceManager.getAvailableFamilies().find((f) => f.familyId === 250)!.getTypefaceByStyle(5, 400, 0)) !== 600, 'after the first goes away another is the closest');
    [light, bold, condensed, base].forEach((face) => face.dispose());
  }],

  ['ties go to the typeface that was registered first', () => {
    const first = roboto();
    const second = roboto();
    register(first, 701, 260);
    register(second, 702, 260);
    const family = TypefaceManager.getAvailableFamilies().find((f) => f.familyId === 260)!;
    check(tagOf(family.getTypefaceByStyle(5, 400, 0)) === 701, 'the first');
    TypefaceManager.unregisterTypeface(first);
    check(tagOf(family.getTypefaceByStyle(5, 400, 0)) === 702, 'the next one takes over');
    first.dispose();
    second.dispose();
  }],

  ['typefaces without a family ID are matched by name, ignoring ASCII case', () => {
    const regular = roboto();
    const base = variable();
    const bold = base.getVariationInstance([700, 100])!;
    register(regular, 801, 0);
    register(bold, 802, 0);
    const name = regular.familyName!;
    check(name === 'Roboto', name);

    check(tagOf(TypefaceManager.getTypefaceByStyle(name, 5, 400, 0)) === 801, 'regular');
    check(tagOf(TypefaceManager.getTypefaceByStyle(bold.familyName!.toUpperCase(), 5, 700, 0)) === 802, 'upper case, bold');
    check(tagOf(TypefaceManager.getTypefaceByStyle(name.toLowerCase(), 5, 400, 0)) === 801, 'lower case');
    check(TypefaceManager.getTypefaceByStyle('Nobody', 5, 400, 0) === undefined, 'no such name');
    check(TypefaceManager.getTypefaceByStyle('', 5, 400, 0) === undefined, 'the empty name is a name of its own');
    check(TypefaceManager.getTypefaceByStyle('Robotö', 5, 400, 0) === undefined, 'only ASCII letters fold');

    const byId = roboto();
    register(byId, 803, 270);
    check(tagOf(TypefaceManager.getTypefaceByStyle(name, 5, 400, 0)) === 801, 'a typeface with an ID is not matched by name');
    [regular, bold, base, byId].forEach((face) => face.dispose());
  }],

  ['families are listed by name, found by name, and match through the family', () => {
    const a = roboto();
    const b = roboto();
    register(a, 901, 280);
    register(b, 902, 0);

    const families = TypefaceManager.getAvailableFamilies();
    const byId = families.find((family) => family.familyId === 280);
    const byName = families.find((family) => family.familyId === 0 && family.familyName === 'Roboto');
    check(byId !== undefined && byId.familyName === 'Roboto', 'family with an ID takes the name of its first typeface');
    check(byName !== undefined, 'family grouped by name');
    check(!byId!.equals(byName!) && byId!.equals(byId!), 'equals compares the ID and the name');
    check(families.every((family, i) => i === 0 || fold(families[i - 1]!.familyName) <= fold(family.familyName)), 'ordered by name');
    check(byId!.toString() === 'TypeFamily(Roboto)', byId!.toString());

    check(tagOf(byId!.getTypefaceByStyle(5, 400, 0)) === 901, 'matched by ID');
    check(tagOf(byName!.getTypefaceByStyle(5, 400, 0)) === 902, 'matched by name');

    const found = TypefaceManager.getTypeFamily('ROBOTO');
    check(found !== undefined && found.familyName === 'Roboto', 'found by name, case ignored');
    check(TypefaceManager.getTypeFamily('Nobody') === undefined, 'no such family');

    const snapshot = byId!;
    TypefaceManager.unregisterTypeface(a);
    check(snapshot.getTypefaceByStyle(5, 400, 0) === undefined, 'a family whose typefaces are gone finds nothing');
    check(!TypefaceManager.getAvailableFamilies().some((family) => family.familyId === 280), 'and is no longer listed');
    a.dispose();
    b.dispose();
  }],

  ['a typeface is found by its full name, and the others are not kept', () => {
    const face = roboto();
    register(face, 951, 0);
    const found = TypefaceManager.getTypefaceByName('Roboto Regular');
    check(found !== undefined && found.equals(face), 'found');
    found!.dispose();
    check(TypefaceManager.getTypefaceByName('No Such Face') === undefined, 'no such name');
    face.dispose();
  }],

  ['the available typefaces are ordered by family and style name and are owners of their own', () => {
    const base = variable();
    const instances = [[300, 100], [700, 100], [500, 75]].map((coordinates) => base.getVariationInstance(coordinates)!);
    instances.forEach((face, i) => register(face, 1001 + i, 0));
    register(roboto(), 1010, 0);

    const all = TypefaceManager.getAvailableTypefaces().filter((face) => {
      const tag = TypefaceManager.getTypefaceTag(face);
      return tag >= 1001 && tag <= 1010;
    });
    check(all.length === 4, `${all.length} typefaces`);
    const keys = all.map((face) => `${fold(face.familyName)}\u0000${fold(face.styleName)}`);
    check(keys.every((key, i) => i === 0 || keys[i - 1]! <= key), `ordered: ${JSON.stringify(keys)}`);

    all.forEach((face) => face.dispose());
    check(TypefaceManager.getTypeface(1010) !== undefined, 'disposing the copies unregisters nothing');
    TypefaceManager.getAvailableTypefaces().forEach((face) => face.dispose());
    instances.forEach((face) => face.dispose());
    base.dispose();
  }],

  ['tags and family IDs that are not whole numbers are refused, and nothing is registered', () => {
    const face = roboto();
    for (const bad of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53]) {
      expectThrows(() => TypefaceManager.registerTypeface(face, bad), /whole number/, 'RangeError');
      expectThrows(() => TypefaceManager.registerTypeface(face, 1, bad), /whole number/, 'RangeError');
      expectThrows(() => TypefaceManager.getTypeface(bad), /whole number/, 'RangeError');
    }
    expectThrows(() => TypefaceManager.registerTypeface(face, '1' as unknown as number), /whole number/, 'RangeError');
    check(TypefaceManager.getTypefaceTag(face) === 0, 'not registered');
    check(!TypefaceManager.getAvailableTypefaces().some((candidate) => candidate.equals(face)), 'not listed');
    face.dispose();
  }],

  ['a style that is no number, and a name that is no string, are refused', () => {
    expectThrows(() => TypefaceManager.getTypefaceByStyle('Roboto', 'x' as unknown as 5, 400, 0), /must be a number/);
    expectThrows(() => TypefaceManager.getTypefaceByStyle('Roboto', 5, 400.5, 0), /must be an integer/, 'RangeError');
    expectThrows(() => TypefaceManager.getTypefaceByStyle('Roboto', 5, 400, Number.NaN as 0), /must be an integer/, 'RangeError');
    expectThrows(() => TypefaceManager.getTypefaceByStyle(1 as unknown as string, 5, 400, 0), /must be a string/);
    expectThrows(() => TypefaceManager.getTypefaceByStyle(undefined as unknown as string, 5, 400, 0), /must not be null/);
  }],

  ['a disposed typeface is refused, and the manager does not need the wrapper', () => {
    const face = roboto();
    register(face, 1101, 0);
    TypefaceManager.unregisterTypeface(face);
    registered = [];
    face.dispose();
    face.dispose();
    expectThrows(() => TypefaceManager.registerTypeface(face), /already disposed/);
    expectThrows(() => TypefaceManager.unregisterTypeface(face), /already disposed/);
    expectThrows(() => TypefaceManager.getTypefaceTag(face), /already disposed/);
    expectThrows(() => TypefaceManager.getTypefaceFamilyId(face), /already disposed/);
    check(TypefaceManager.getTypeface(1101) === undefined, 'the unregistered typeface is gone');
  }],

  ['a family cannot be made by the application', () => {
    const family = (() => {
      const face = roboto();
      register(face, 1201, 290);
      face.dispose();
      return TypefaceManager.getAvailableFamilies().find((candidate) => candidate.familyId === 290)!;
    })();
    const Family = family.constructor as new (token: unknown, name: string, id: number) => unknown;
    expectThrows(() => new Family(undefined, 'Roboto', 290), /comes from the TypefaceManager/);
  }],
];

export function runTypefaceManagerTests(bindings: NativeBindings): TestResult {
  const result: TestResult = { passed: 0, failures: [] };
  for (const [name, body] of tests) {
    try {
      body(bindings);
      result.passed++;
    } catch (e) {
      result.failures.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      cleanUp();
    }
  }
  return result;
}

export const typefaceManagerTestCount = tests.length;
