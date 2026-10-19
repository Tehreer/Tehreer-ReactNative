import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { compileModules, importModule } from "./CompileModules.mjs";

type Values = Record<string, number>;
const out = compileModules(["src/graphics/enums.ts", "src/layout/enums.ts", "src/sfnt/enums.ts"]);
const graphics = (await importModule(out, "graphics/enums.js")) as Record<string, Values>;
const layout = (await importModule(out, "layout/enums.js")) as Record<string, Values>;
const sfnt = (await importModule(out, "sfnt/enums.js")) as Record<string, Values>;

// Core declares its enumerations as anonymous `enum { TRPrefixName = value }` blocks. Each public
// enum maps to the prefix its constants share, so the test compares names and values.
const headers = new URL("../Libraries/TehreerCore/Headers/Tehreer/", import.meta.url).pathname;

const prefixes: Record<string, [Values, string]> = {
  TypeWeight: [graphics.TypeWeight as Values, "TRWeight"],
  TypeWidth: [graphics.TypeWidth as Values, "TRWidth"],
  TypeSlope: [graphics.TypeSlope as Values, "TRSlope"],
  DrawStyle: [graphics.DrawStyle as Values, "TRDrawStyle"],
  StrokeCap: [graphics.StrokeCap as Values, "TRStrokeCap"],
  StrokeJoin: [graphics.StrokeJoin as Values, "TRStrokeJoin"],
  GlyphImageFormat: [graphics.GlyphImageFormat as Values, "TRGlyphImageFormat"],
  GlyphImageKind: [graphics.GlyphImageKind as Values, "TRGlyphImageKind"],
  WritingDirection: [sfnt.WritingDirection as Values, "TRWritingDirection"],
  ShapingOrder: [sfnt.ShapingOrder as Values, "TRShapingOrder"],
  BreakMode: [layout.BreakMode as Values, "TRBreakMode"],
  TruncationPlace: [layout.TruncationPlace as Values, "TRTruncationPlace"],
  TextAlignment: [layout.TextAlignment as Values, "TRTextAlignment"],
  VerticalAlignment: [layout.VerticalAlignment as Values, "TRVerticalAlignment"],
  ReplacementKind: [layout.ReplacementKind as Values, "TRReplacementKind"]
};

// Core enumerations that are not public API: booleans, the encoding and attribute ids that the
// wrapper hides, and a flag of a variation axis that the wrapper exposes as a boolean.
const internalPrefixes = ["TRFalse", "TRTrue", "TRStringEncoding", "TRAttribute", "TRVariationAxisFlag"];

function coreConstants(): Map<string, number> {
  const constants = new Map<string, number>();
  for (const file of readdirSync(headers).filter((name) => name.endsWith(".h"))) {
    const text = readFileSync(headers + file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const block of text.matchAll(/\benum\s*\{([^}]*)\}/g)) {
      for (const member of (block[1] ?? "").matchAll(/\b(TR\w+)\s*=\s*(0x[0-9a-fA-F]+|\d+)/g)) {
        constants.set(member[1] as string, Number(member[2]));
      }
    }
  }
  return constants;
}

test("every Core enum constant has the same name and value in its public enum", () => {
  const core = coreConstants();
  assert.ok(core.size > 40, `parsed only ${core.size} constants`);

  for (const [name, [values, prefix]] of Object.entries(prefixes)) {
    const expected = Object.fromEntries(
      [...core].filter(([key]) => key.startsWith(prefix)).map(([key, value]) => [key.slice(prefix.length), value])
    );
    assert.ok(Object.keys(expected).length > 0, `${name}: no constants with prefix ${prefix}`);
    assert.deepEqual({ ...values }, expected, name);
  }
});

test("no Core enum constant is left without a public enum", () => {
  const known = Object.values(prefixes).map(([, prefix]) => prefix);
  const orphans = [...coreConstants().keys()].filter(
    (key) => !known.some((prefix) => key.startsWith(prefix)) && !internalPrefixes.some((prefix) => key.startsWith(prefix))
  );
  assert.deepEqual(orphans, []);
});
