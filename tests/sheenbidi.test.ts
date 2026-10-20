import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { SHEENBIDI_CLASSIC_HEADERS, SHEENBIDI_EXCLUDED, SHEENBIDI_OUT_OF_SCOPE } from "../scripts/generator/sheenbidi.mjs";

// The classic API of SheenBidi is bound by hand (cpp/runtime/SheenBidiBindings.cpp), so nothing
// generated can notice a function that a SheenBidi update adds. These tests compare the headers with
// the three places that must agree: scripts/generator/sheenbidi.mjs (what is excluded and why), the
// table of bindings in the C++ and the declarations in TypeScript.
const root = join(import.meta.dirname, "..");
const headers = join(root, "Libraries/Dependencies/SheenBidi/Headers/SheenBidi");
const skip = existsSync(headers) ? false : "SheenBidi is not fetched (npm run setup)";
const read = (path: string) => readFileSync(join(root, path), "utf8");

/** The public functions of a header: `SB_PUBLIC`, a return type, then the name and a parenthesis. */
function functionsOf(file: string): string[] {
  const text = readFileSync(join(headers, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  return [...text.matchAll(/\bSB_PUBLIC\s+[^;(){}]*?\b(SB\w+)\s*\(/g)].map((match) => match[1] as string);
}

const allHeaders = (): string[] => readdirSync(headers).filter((name) => name.endsWith(".h")).sort();
const classic = (): string[] => SHEENBIDI_CLASSIC_HEADERS.flatMap((file) => functionsOf(file));

test("every header with functions is either classic or out of scope, and the lists name real headers", { skip }, () => {
  const known = new Set<string>([...SHEENBIDI_CLASSIC_HEADERS, ...SHEENBIDI_OUT_OF_SCOPE.keys()]);
  assert.equal(known.size, SHEENBIDI_CLASSIC_HEADERS.length + SHEENBIDI_OUT_OF_SCOPE.size, "a header is on both lists");
  for (const file of known) {
    assert.ok(existsSync(join(headers, file)), `${file} is not a header of SheenBidi`);
  }
  for (const file of allHeaders()) {
    if (functionsOf(file).length > 0) {
      assert.ok(known.has(file), `${file} has public functions: list it in scripts/generator/sheenbidi.mjs`);
    }
  }
  for (const file of SHEENBIDI_CLASSIC_HEADERS) {
    assert.ok(functionsOf(file).length > 0, `${file} has no functions; it is not a header with an API to bind`);
  }
  for (const [file, reason] of SHEENBIDI_OUT_OF_SCOPE) {
    assert.ok(reason.length > 10, `${file} has no reason`);
  }
});

test("the classic headers are read completely, deprecated functions included", { skip }, () => {
  const names = classic();
  for (const name of ["SBAlgorithmCreate", "SBLineGetRunsPtr", "SBMirrorLocatorLoadLine", "SBCodepointDecodePreviousFromUTF16", "SBScriptGetOpenTypeTag", "SBScriptGetUnicodeTag", "SBVersionGetString"]) {
    assert.ok(names.includes(name), `${name} was not found`);
  }
  assert.equal(new Set(names).size, names.length);
});

test("every classic function is bound or excluded with a reason, and nothing else is bound", { skip }, () => {
  const functions = new Set(classic());
  for (const [name, reason] of SHEENBIDI_EXCLUDED) {
    assert.ok(functions.has(name), `${name} is excluded but no classic header declares it`);
    assert.ok(reason.length > 10, `${name} has no reason`);
  }

  const expected = [...functions].filter((name) => !SHEENBIDI_EXCLUDED.has(name)).sort();
  const cpp = read("cpp/runtime/SheenBidiBindings.cpp");
  const table = [...cpp.matchAll(/^ {4}\{ "(SB\w+)", \d+, &Bind\1 \},$/gm)].map((match) => match[1] as string);
  assert.deepEqual([...table].sort(), expected);
  for (const name of table) {
    assert.ok(cpp.includes(`TEHREER_BINDING(${name})`), `${name} has no function`);
  }

  const typescript = read("src/internal/SheenBidiFunctions.ts");
  const declared = [...typescript.matchAll(/^ {2}(SB\w+)\(/gm)].map((match) => match[1] as string);
  assert.deepEqual([...declared].sort(), expected);
});

test("the Release functions are the excluded ones, and each type of handle has its Retain", { skip }, () => {
  const releases = classic().filter((name) => name.endsWith("Release"));
  assert.deepEqual([...SHEENBIDI_EXCLUDED.keys()].sort(), releases.sort());
  for (const release of releases) {
    assert.ok(classic().includes(release.replace(/Release$/, "Retain")));
  }
});

test("the table of bindings is installed with the others, and the debug hook only in debug builds", () => {
  const bindings = read("cpp/runtime/TehreerBindings.cpp");
  assert.ok(bindings.includes("InstallSheenBidiBindings(runtime, bindings);"));

  const start = bindings.indexOf("#ifndef NDEBUG\n    Define");
  const debug = bindings.slice(start, bindings.indexOf("#endif", start));
  assert.ok(debug.includes("InstallSheenBidiTestHooks(runtime, bindings);"));

  const cpp = read("cpp/runtime/SheenBidiBindings.cpp");
  const hook = cpp.indexOf('"testGetBidiTextCount"');
  const debugStart = cpp.lastIndexOf("#ifndef NDEBUG");
  assert.ok(hook > debugStart, "the hook is behind #ifndef NDEBUG");
  assert.ok(debugStart > cpp.indexOf("void InstallSheenBidiBindings("), "and after the bindings of every build");
  assert.equal(cpp.split("gLiveTexts").length - 1, 4, "the counter is only used inside debug blocks");
  assert.equal(cpp.split('"testGetBidiTextCount"').length, 3);
  assert.ok(read("src/internal/SheenBidiFunctions.ts").includes("testGetBidiTextCount?()"));
});

test("a paragraph and a line take their own share of the text, so the algorithm can end first", () => {
  const cpp = read("cpp/runtime/SheenBidiBindings.cpp");
  // The share is taken from the owner that made them, at the point of creation.
  assert.match(cpp, /ReleaseObject<SBParagraphRef, SBParagraphRelease>, owner->text, kParagraph/);
  assert.match(cpp, /ReleaseObject<SBLineRef, SBLineRelease>, owner->text, kLine/);
  // The text is only ever read through a share: no raw pointer to it is kept by the owners.
  assert.match(cpp, /const std::u16string units;/);
  assert.match(cpp, /owner->text = lineOwner->text;/);
  // The release of an owner touches no JavaScript.
  const release = cpp.slice(cpp.indexOf("void ReleaseOwner("), cpp.indexOf("template <class Ref, void (*Release)(Ref)>"));
  assert.ok(!/jsi::|rt\b/.test(release), "ReleaseOwner must not use JSI");
});

test("the run codec is listed with the codecs that readPointerStructs finds", () => {
  const codecs = read("cpp/runtime/StructCodecs.cpp");
  assert.ok(codecs.includes("SheenBidiRunCodec()"));
  assert.ok(read("cpp/runtime/SheenBidiBindings.cpp").includes('{ "SBRun", sizeof(SBRun)'));
});
