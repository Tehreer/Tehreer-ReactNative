import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { checkSyntax, findCompiler, NO_COMPILER } from "./CompileSupport.mjs";
import { BOUNDS, EXCLUDED, MANUAL } from "../scripts/generator/config.mjs";
import { checkFiles, outputFiles, writeFiles } from "../scripts/generator/files.mjs";
import { generate } from "../scripts/generator/generate.mjs";
import { parseHeader } from "../scripts/generator/parser.mjs";

const root = new URL("../", import.meta.url).pathname;
const headers = join(root, "Libraries/TehreerCore/Headers/Tehreer");
const cli = join(root, "scripts/generate-bindings.mjs");
const noCore = existsSync(headers) ? false : "the Core submodule is not initialised (git submodule update --init)";

// The generated files are checked in (see scripts/README.md), so they must match the headers.
test("the checked-in files are what the generator writes for the pinned Core", { skip: noCore }, () => {
  const problems = checkFiles(root, outputFiles(generate(headers)));
  assert.deepEqual(problems, [], "run `npm run generate` and commit the result");
});

test("every public function is bound, excluded, manual or a release", { skip: noCore }, () => {
  const { model } = generate(headers);
  const bound = new Set(model.bindings.map((binding) => binding.name));
  for (const name of [...EXCLUDED, ...MANUAL.keys(), ...model.releases]) {
    assert.ok(!bound.has(name), `${name} is bound although it is excluded, manual or a release`);
  }
  assert.deepEqual([...EXCLUDED].sort(), ["TRTextGetSheenBidiText", "TRVersionGetString"]);
  const declaredCount = readdirSync(headers)
    .filter((name) => /^TR.*\.h$/.test(name))
    .reduce((total, name) => total + parseHeader(readFileSync(join(headers, name), "utf8"), { publicMacro: "TR_PUBLIC", prefix: "TR" }).functions.length, 0);
  assert.ok(declaredCount > 0);
  assert.equal(model.bindings.length + EXCLUDED.size + MANUAL.size + model.releases.length, declaredCount);
  for (const name of ["TRRendererGetDrawCallbacks", "TRTextSetAttribute"]) assert.ok(MANUAL.has(name), name);
  assert.ok(Object.keys(BOUNDS).length > 0);
});

test("the bindings cover the objects, structs, out parameters and callbacks of Core", { skip: noCore }, () => {
  const { model } = generate(headers);
  const byName = new Map(model.bindings.map((binding) => [binding.name, binding]));

  assert.equal(byName.get("TRRendererCreate")?.returns["ownership"], "owned");
  assert.equal(byName.get("TRRendererGetTypeface")?.returns["ownership"], "borrowed");
  assert.equal(byName.get("TRComposedLineGetOrigin")?.returns.k, "struct");
  assert.equal(byName.get("TRGlyphRunGetForegroundColor")?.result.mode, "success");
  assert.equal(byName.get("TRComposedFrameEnumerateSelection")?.outputs[0]?.source, "collector");
  assert.equal(byName.get("TRPathEnumerate")?.params[2]?.kind, "callbackStruct");
  assert.equal(byName.get("TRGlyphRunGetGlyphIDsPtr")?.returns.k, "pointerView");
  assert.ok(!byName.has("TRTypefaceRelease"));
  assert.ok(byName.has("TRTypefaceRetain"));
});

// Ownership comes from the name, so a new or renamed function must be looked at, not guessed.
test("the references that Core functions return are adopted or retained as reviewed", { skip: noCore }, () => {
  const { model } = generate(headers);
  const returned = (ownership: string): string[] =>
    model.bindings.filter((b) => b.returns.k === "ref" && b.returns["ownership"] === ownership).map((b) => b.name);

  assert.deepEqual(returned("borrowed"), [
    "TRComposedFrameGetLine", "TRComposedLineGetGlyphRun", "TRFontFileGetTypeface", "TRFrameResolverGetTypesetter",
    "TRGlyphCacheGetDefault", "TRGlyphRunGetTypeface", "TRGlyphRunGetReplacement", "TRRendererGetGlyphCache",
    "TRRendererGetTypeface", "TRShapingEngineGetTypeface", "TRTypefaceManagerGetTypeface",
    "TRTypefaceManagerGetMatchingTypefaceByFamilyID", "TRTypefaceManagerGetMatchingTypefaceByFamilyName",
  ]);
  assert.deepEqual(returned("owned"), [
    "TRAttributeListRetain", "TRComposedFrameRetain", "TRComposedLineRetain", "TRFontFeaturesCreate", "TRFontFeaturesRetain",
    "TRFontFileCreateFromPath", "TRFontFileCreateFromMemory", "TRFontFileRetain", "TRFrameResolverCreate",
    "TRFrameResolverCreateFrame", "TRFrameResolverRetain", "TRGlyphCacheCreate", "TRGlyphCacheRetain", "TRGlyphImageRetain",
    "TRGlyphRunRetain", "TRLineLocatorCreate", "TRLineLocatorRetain", "TRPathRetain", "TRRendererCreate",
    "TRRendererCreateGlyphImage", "TRRendererCreateStrokeImage", "TRRendererCreateGlyphPath", "TRRendererRetain",
    "TRReplacementRetain", "TRShapingEngineCreate", "TRShapingEngineCreateShapingResult", "TRShapingEngineRetain",
    "TRShapingResultRetain", "TRTextCreate", "TRTextCreateCopy", "TRTextCreateMutableCopy", "TRTextCopyAttributes",
    "TRTextRetain", "TRTextCreateMutable", "TRTypefaceCreateWithVariation", "TRTypefaceCreateWithColors",
    "TRTypefaceCreateGlyphPath", "TRTypefaceRetain", "TRTypesetterCreateSimpleLine", "TRTypesetterCreateTruncationToken",
    "TRTypesetterCreateTruncatedLine", "TRTypesetterCreateJustifiedLine", "TRTypesetterRetain",
  ]);
});

test("the nullable parameters are exactly the reviewed ones", { skip: noCore }, () => {
  const { model } = generate(headers);
  const nullable = model.bindings.flatMap((b) => b.params.filter((p) => p.js && p.nullable).map((p) => `${b.name}.${p.name}`));
  assert.deepEqual(nullable, [
    "TRComposedFrameDraw.renderer", "TRComposedLineDraw.renderer", "TRFontFeaturesCreate.features",
    "TRFrameResolverSetTypesetter.typesetter", "TRGlyphRunComputeInkBox.renderer", "TRGlyphRunDraw.renderer",
    "TRPathEnumerate.transform", "TRRendererSetGlyphCache.cache", "TRRendererSetTypeface.typeface",
    "TRShapingEngineSetTypeface.typeface", "TRShapingEngineSetOpenTypeFeatures.features",
    "TRShapingEngineCreateShapingResult.codeUnits", "TRShapingResultGetCaretEdges.caretStops", "TRTextCreate.string",
    "TRTextGetCodeUnits.buffer", "TRTextAppendCodeUnits.codeUnitBuffer", "TRTextInsertCodeUnits.codeUnitBuffer",
    "TRTextSetCodeUnits.codeUnitBuffer", "TRTextReplaceCodeUnits.codeUnitBuffer", "TRTypefaceCreateWithVariation.coordinates",
    "TRTypefaceCreateWithColors.colors", "TRTypefaceGetTableData.buffer", "TRTypefaceGetGlyphName.buffer",
    "TRTypesetterCreateTruncationToken.tokenString",
  ]);
});

test("only the text has a mutable and a constant reference type that share an object", { skip: noCore }, () => {
  const { model } = generate(headers);
  const groups = new Map<string, Set<boolean>>();
  for (const ref of model.refs) groups.set(ref.group, (groups.get(ref.group) ?? new Set()).add(ref.const));
  const mixed = [...groups].filter(([, flags]) => flags.size > 1).map(([group]) => group);
  assert.deepEqual(mixed, ["TRText"]);

  const handles = readFileSync(join(root, "cpp/generated/Handles.h"), "utf8");
  assert.match(handles, /HandleTraits<TRTextRef> \{[^}]*kMutable = false;/);
  assert.match(handles, /HandleTraits<TRMutableTextRef> \{[^}]*kMutable = true;/);
});

test("the renderer of an ink box or a draw call is required or optional as Core documents it", { skip: noCore }, () => {
  const { model } = generate(headers);
  const nullable = (name: string, param: string): boolean | undefined =>
    model.bindings.find((b) => b.name === name)?.params.find((p) => p.name === param)?.nullable;

  assert.equal(nullable("TRComposedLineComputeInkBox", "renderer"), false);
  assert.equal(nullable("TRLineLocatorCreate", "renderer"), false);
  assert.equal(nullable("TRComposedLineDraw", "renderer"), true);
  assert.equal(nullable("TRGlyphRunComputeInkBox", "renderer"), true);
});

test("stale generated files are reported, and only files that carry the marker are removed", () => {
  const directory = mkdtempSync(join(tmpdir(), "tehreer-files-"));
  try {
    const files = new Map([
      ["cpp/generated/A.cpp", "// GENERATED FILE. DO NOT EDIT.\nint a;\n"],
      ["src/internal/NativeFunctions.ts", "// GENERATED FILE. DO NOT EDIT.\n"],
    ]);
    writeFiles(directory, files);
    assert.deepEqual(checkFiles(directory, files), []);

    // A changed file, a missing one, a leftover generated one and a file of someone else.
    writeFileSync(join(directory, "cpp/generated/A.cpp"), "// edited by hand\n");
    rmSync(join(directory, "src/internal/NativeFunctions.ts"));
    writeFileSync(join(directory, "cpp/generated/Old.cpp"), "// GENERATED FILE. DO NOT EDIT.\n");
    writeFileSync(join(directory, "cpp/generated/Mine.cpp"), "// written by hand\n");

    assert.deepEqual(checkFiles(directory, files).sort(), [
      "cpp/generated/A.cpp: out of date",
      "cpp/generated/Old.cpp: no longer generated",
      "src/internal/NativeFunctions.ts: missing",
    ]);

    writeFiles(directory, files);
    assert.deepEqual(checkFiles(directory, files), []);
    assert.ok(!existsSync(join(directory, "cpp/generated/Old.cpp")));
    assert.ok(existsSync(join(directory, "cpp/generated/Mine.cpp")));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("--check exits with 0 when the files are current", { skip: noCore }, () => {
  const result = spawnSync("node", [cli, "--check"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /up to date/);
});

test("the command fails loudly on a header it cannot express", { skip: noCore }, () => {
  const directory = mkdtempSync(join(tmpdir(), "tehreer-core-"));
  try {
    // Core's own headers, plus one more that has a signature the generator cannot express.
    mkdirSync(join(directory, "Headers"), { recursive: true });
    cpSync(headers, join(directory, "Headers/Tehreer"), { recursive: true });
    writeFileSync(join(directory, "Headers/Tehreer/TRBad.h"), `
      #include <Tehreer/TRBase.h>
      typedef const struct _TRBad *TRBadRef;
      TR_PUBLIC TRBadRef TRBadRetain(TRBadRef bad);
      TR_PUBLIC void TRBadRelease(TRBadRef bad);
      TR_PUBLIC void TRBadSetNames(TRBadRef bad, const char **names);
    `);

    const result = spawnSync("node", [cli, "--core", directory], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /TRBadSetNames/);
    assert.match(result.stderr, /const char \*\*/);

    const missing = spawnSync("node", [cli, "--core", join(directory, "nothing")], { encoding: "utf8" });
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /submodule/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

const compiler = findCompiler();

test("the checked-in glue compiles against Core's headers and the JSI stub", { skip: noCore || (compiler ? false : NO_COMPILER) }, async () => {
  assert.ok(compiler);
  const generated = join(root, "cpp/generated");
  const includes = [generated, join(root, "tests/fixtures/jsi-stub"), join(root, "Libraries/TehreerCore/Headers")];
  const sources = readdirSync(generated).filter((name) => name.endsWith(".cpp")).sort();
  assert.ok(sources.length > 10);

  const results = await Promise.all(sources.map((name) => checkSyntax(compiler, join(generated, name), includes)));
  const failed = results.filter((result) => !result.ok);
  assert.deepEqual(failed.map((result) => `${result.file}\n${result.output}`), []);
});
