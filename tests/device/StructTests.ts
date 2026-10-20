import type { NativeBindings } from "../../src/internal/NativeBindings.js";
import type { Handle } from "../../src/internal/NativeFunctions.js";

// The suite of the struct marshalling (issue #8). It runs against the real bindings in Hermes, so it
// needs a debug build of the native module (the `testRoundTripStruct` and `testGetStructNames`
// hooks). The device runner calls it like the other suites:
//
//     import { runStructTests, structTestCount } from "../../tests/device/StructTests";
//     const result = runStructTests(bindings);   // { passed, failures }
//
// Only `import type` is used from the library, so Metro has nothing to resolve. The layout of the
// structs is not tested here: it is checked when the native module is compiled (cpp/generated/Layouts.h),
// and TypeScript has no offsets. What is tested is what the conversion does with a value.

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

function hooks(b: NativeBindings) {
  const { testRoundTripStruct, testGetStructNames } = b;
  if (!testRoundTripStruct || !testGetStructNames) {
    throw new Error("the debug hooks are missing: the struct tests need a debug build of the native module");
  }
  return {
    roundTrip: (name: string, value: unknown): unknown => testRoundTripStruct.call(b, name, value),
    names: (): string[] => testGetStructNames.call(b),
  };
}

function features(b: NativeBindings): Handle<"TRFontFeatures"> {
  const created = b.TRFontFeaturesCreate([{ tag: 1, value: 1 }], 1);
  check(created !== undefined, "TRFontFeaturesCreate returned no handle");
  return created as Handle<"TRFontFeatures">;
}

// Values that a 32-bit float holds exactly, so that a result can be compared with `===`.
const structs: Record<string, unknown> = {
  TRPoint: { x: 1.5, y: -2.25 },
  TRSize: { width: 10, height: 0 },
  TRRect: { origin: { x: 1, y: 2 }, size: { width: 3, height: 4 } },
  TRAffineTransform: { a: 1, b: 0.5, c: -0.5, d: 2, tx: 10, ty: -20 },
  // A tag and a value above 2^31 stay unsigned.
  TROpenTypeFeature: { tag: 0xffffffff, value: 0x80000000 },
  TRReplacementRoom: { ascent: 12, descent: 3.5, extent: 100 },
  TRAttribute: { type: 2, value: 16 },
  // SheenBidi's run of a line, which the codec of cpp/runtime/SheenBidiBindings.cpp reads.
  SBRun: { offset: 5, length: 7, level: 3 },
};

// The type of every attribute that Core defines, with a value of the kind it takes. The handle kinds
// (typeface 1, replacement 7, font features 22) have tests of their own below. The numbers are the
// `TRAttribute*` constants of TRAttribute.h, in that file's names.
const attributes: [number, string, unknown][] = [
  [2, "TRAttributeTypeSize", 16.5],
  [3, "TRAttributeScaleX", 1.25],
  [4, "TRAttributeScaleY", 0.75],
  [5, "TRAttributeBaselineOffset", -3],
  [6, "TRAttributeObliqueness", 0.25],
  [8, "TRAttributeTextAlignment", 4],
  [9, "TRAttributeFirstLineHeadIndent", 24],
  [10, "TRAttributeHeadIndent", 8],
  [11, "TRAttributeTailIndent", -8],
  [12, "TRAttributeFirstIndentLineCount", 3],
  [13, "TRAttributeParagraphSpacingBefore", 6],
  [14, "TRAttributeParagraphSpacing", 7],
  [15, "TRAttributeLineHeightMultiple", 1.5],
  [16, "TRAttributeMinimumLineHeight", 10],
  [17, "TRAttributeMaximumLineHeight", 40],
  [18, "TRAttributeLineSpacing", 2],
  [19, "TRAttributeForegroundColor", 0xff336699],
  [20, "TRAttributeUserData", 123456],
  [21, "TRAttributeLanguage", 0x55524420], // 'URD '
  [23, "TRAttributeBackgroundColor", 0x80ffffff],
  [24, "TRAttributeUnderline", true],
  [25, "TRAttributeStrikethrough", false],
  [26, "TRAttributeDecorationColor", 0xffffffff],
];

const tests: [string, (b: NativeBindings) => void][] = [
  ["every struct that is converted has a round-trip sample here", (b) => {
    // Adding a struct to the generator or to StructCodecs.cpp without a sample fails here.
    check(JSON.stringify([...hooks(b).names()].sort()) === JSON.stringify(Object.keys(structs).sort()),
      `the native module converts ${hooks(b).names().join(", ")}`);
  }],

  ["a struct survives the trip through its C layout", (b) => {
    const { roundTrip } = hooks(b);
    for (const [name, value] of Object.entries(structs)) {
      check(JSON.stringify(roundTrip(name, value)) === JSON.stringify(value), `${name}: ${JSON.stringify(roundTrip(name, value))}`);
    }
  }],

  ["a float is stored as a 32-bit float, and infinity is a valid one", (b) => {
    const { roundTrip } = hooks(b);
    const point = roundTrip("TRPoint", { x: 0.1, y: Infinity }) as { x: number; y: number };
    check(point.x === Math.fround(0.1) && point.x !== 0.1, `x came back as ${point.x}`);
    check(point.y === Infinity, "infinity");
    expectThrows(() => roundTrip("TRPoint", { x: Number.NaN, y: 0 }), /'value\.x' must not be NaN/, "RangeError");
    expectThrows(() => roundTrip("TRPoint", { x: 0, y: 1e40 }), /'value\.y' is out of range/, "RangeError");
  }],

  ["unsigned members keep every 32-bit value and refuse the rest", (b) => {
    const { roundTrip } = hooks(b);
    const feature = roundTrip("TROpenTypeFeature", { tag: 0x80000000, value: 0xffffffff }) as { tag: number; value: number };
    check(feature.tag === 0x80000000 && feature.value === 0xffffffff, `${feature.tag} ${feature.value}`);
    expectThrows(() => roundTrip("TROpenTypeFeature", { tag: -1, value: 1 }), /'value\.tag' is out of range/, "RangeError");
    expectThrows(() => roundTrip("TROpenTypeFeature", { tag: 1, value: 2 ** 32 }), /'value\.value' is out of range/, "RangeError");
    expectThrows(() => roundTrip("TROpenTypeFeature", { tag: 1.5, value: 1 }), /'value\.tag' must be an integer/, "RangeError");
  }],

  ["a nested struct converts member by member, and an error names the path", (b) => {
    const { roundTrip } = hooks(b);
    expectThrows(() => roundTrip("TRRect", { origin: { x: 1, y: 2 }, size: { width: 3 } }), /'value\.size\.height' must be a number/);
    expectThrows(() => roundTrip("TRRect", { origin: 5, size: { width: 3, height: 4 } }), /'value\.origin' must be an object/);
    expectThrows(() => roundTrip("TRRect", { origin: { x: "1", y: 2 }, size: { width: 3, height: 4 } }), /'value\.origin\.x' must be a number/);
  }],

  ["a value that is no object is refused, extra members are ignored", (b) => {
    const { roundTrip } = hooks(b);
    for (const value of [undefined, null, 1, "x", true]) {
      expectThrows(() => roundTrip("TRSize", value), /'value' must be an object/);
    }
    expectThrows(() => roundTrip("TRSize", { width: 1 }), /'value\.height' must be a number/);
    const size = roundTrip("TRSize", { width: 1, height: 2, depth: 3 });
    check(JSON.stringify(size) === JSON.stringify({ width: 1, height: 2 }), "the extra member is dropped");
  }],

  ["an error thrown by a getter of the value comes out unchanged", (b) => {
    const { roundTrip } = hooks(b);
    const failure = new TypeError("from the getter");
    const value = { x: 1, get y(): number { throw failure; } };
    try {
      roundTrip("TRPoint", value);
    } catch (e) {
      check(e === failure, "the same error object");
      return;
    }
    throw new Error("nothing was thrown");
  }],

  ["an unknown struct is refused", (b) => {
    const { roundTrip } = hooks(b);
    expectThrows(() => roundTrip("TRNothing", {}), /'name' is not a struct that JavaScript converts/, "RangeError");
    expectThrows(() => roundTrip(1 as unknown as string, {}), /'name' must be a string/);
  }],

  ["every attribute type is stored in its own member and read back", (b) => {
    const { roundTrip } = hooks(b);
    for (const [type, name, value] of attributes) {
      const result = roundTrip("TRAttribute", { type, value }) as { type: number; value: unknown };
      check(result.type === type && result.value === value, `${name}: ${JSON.stringify(result)}`);
    }
  }],

  ["an attribute that Core does not define is refused", (b) => {
    const { roundTrip } = hooks(b);
    // 0 and 27 are the neighbours of the defined range 1 to 26: a new attribute in Core must be
    // added to the table of StructCodecs.cpp and to the list above, and this fails until it is.
    for (const type of [0, 27, 999]) {
      expectThrows(() => roundTrip("TRAttribute", { type, value: 1 }), /'value\.type' is not an attribute type of Core/, "RangeError");
    }
    expectThrows(() => roundTrip("TRAttribute", { type: "2", value: 1 }), /'value\.type' must be a number/);
    expectThrows(() => roundTrip("TRAttribute", { value: 1 }), /'value\.type' must be a number/);
  }],

  ["an attribute value must have the kind of its type", (b) => {
    const { roundTrip } = hooks(b);
    expectThrows(() => roundTrip("TRAttribute", { type: 2, value: "16" }), /'value\.value' must be a number/);
    expectThrows(() => roundTrip("TRAttribute", { type: 24, value: 1 }), /'value\.value' must be a boolean/);
    expectThrows(() => roundTrip("TRAttribute", { type: 19, value: -1 }), /'value\.value' is out of range/, "RangeError");
    expectThrows(() => roundTrip("TRAttribute", { type: 21, value: 2 ** 32 }), /'value\.value' is out of range/, "RangeError");
    expectThrows(() => roundTrip("TRAttribute", { type: 20, value: -1 }), /'value\.value' must be a non-negative integer/, "RangeError");
    expectThrows(() => roundTrip("TRAttribute", { type: 20, value: 1.5 }), /'value\.value' must be a non-negative integer/, "RangeError");
    expectThrows(() => roundTrip("TRAttribute", { type: 2 }), /'value\.value' must be a number/);
  }],

  ["a count of indent lines maps -1 to TRInvalidIndex both ways", (b) => {
    const { roundTrip } = hooks(b);
    const result = roundTrip("TRAttribute", { type: 12, value: -1 }) as { value: number };
    check(result.value === -1, `came back as ${result.value}`);
    expectThrows(() => roundTrip("TRAttribute", { type: 12, value: -2 }), /'value\.value' is out of range/, "RangeError");
  }],

  ["a handle in an attribute is borrowed on the way in and retained on the way out", (b) => {
    const { roundTrip } = hooks(b);
    const original = features(b);
    const result = roundTrip("TRAttribute", { type: 22, value: original }) as { type: number; value: Handle<"TRFontFeatures"> };

    check(result.type === 22, "type");
    check(result.value !== original, "a new handle, not the one that was passed");
    check(b.handleEquals(original, result.value), "both hold the same Core object");

    // Releasing the copy must not free what the original refers to, and the other way round.
    b.disposeHandle(result.value);
    check(b.TRFontFeaturesGetCount(original) === 1, "the object outlives the returned handle");

    const second = roundTrip("TRAttribute", { type: 22, value: original }) as { value: Handle<"TRFontFeatures"> };
    b.disposeHandle(original);
    check(b.TRFontFeaturesGetCount(second.value) === 1, "the returned handle keeps the object alive on its own");
    b.disposeHandle(second.value);
  }],

  ["a handle in an attribute is checked like any other handle argument", (b) => {
    const { roundTrip } = hooks(b);
    const handle = features(b);
    expectThrows(() => roundTrip("TRAttribute", { type: 1, value: handle }), /'value\.value' must be a TRTypeface handle, not TRFontFeatures/);
    expectThrows(() => roundTrip("TRAttribute", { type: 7, value: handle }), /must be a TRReplacement handle/);
    expectThrows(() => roundTrip("TRAttribute", { type: 22, value: undefined }), /'value\.value' must not be null or undefined/);
    expectThrows(() => roundTrip("TRAttribute", { type: 22, value: {} }), /'value\.value' is not a Tehreer handle/);
    expectThrows(() => roundTrip("TRAttribute", { type: 22, value: 3 }), /'value\.value' is not a Tehreer handle/);
    b.disposeHandle(handle);
    expectThrows(() => roundTrip("TRAttribute", { type: 22, value: handle }), /'value\.value' is already disposed/);
  }],
];

export function runStructTests(bindings: NativeBindings): TestResult {
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

export const structTestCount = tests.length;
