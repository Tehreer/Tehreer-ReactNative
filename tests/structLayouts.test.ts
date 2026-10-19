import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { checkSyntax, findCompiler, NO_COMPILER } from "./CompileSupport.mjs";
import { generate } from "../scripts/generator/generate.mjs";
import { parseHeader } from "../scripts/generator/parser.mjs";

// The layouts of the C structs are checked when the native module is compiled, by cpp/generated/
// Layouts.h, which the generator prints from the headers. These tests check what the generator
// prints, and that a header that no longer agrees with it stops the compiler.
const root = new URL("../", import.meta.url).pathname;
const core = join(root, "Libraries/TehreerCore/Headers");
const headers = join(core, "Tehreer");
const noCore = existsSync(headers) ? false : "the Core submodule is not initialised (git submodule update --init)";
const compiler = findCompiler();
const noCompiler = noCore || (compiler ? false : NO_COMPILER);

const layoutsHeader = (): string => readFileSync(join(root, "cpp/generated/Layouts.h"), "utf8");

function recordsOf(directory: string): { kind: string; name: string; members: string[] }[] {
  return readdirSync(directory)
    .filter((name) => /^TR.*\.h$/.test(name))
    .flatMap((name) => parseHeader(readFileSync(join(directory, name), "utf8"), { publicMacro: "TR_PUBLIC", prefix: "TR" }).typedefs)
    .flatMap((typedef) => (typedef.kind === "struct" || typedef.kind === "union"
      ? [{ kind: typedef.kind, name: typedef.name, members: typedef.members.map((member) => member.name) }]
      : []));
}

test("every struct and union of Core has its size, alignment, member types and offsets checked", { skip: noCore }, () => {
  const text = layoutsHeader();
  const records = recordsOf(headers);

  // The structs that the API reads or writes are among them; none is left out by a filter.
  const names = records.map((record) => record.name);
  for (const name of [
    "TRPoint", "TRSize", "TRRect", "TRAffineTransform", "TROpenTypeFeature", "TRReplacementRoom", "TRStringView",
    "TRAttribute", "TRAttributeValue", "TRDrawCallbacks", "TRPathCallbacks", "TRReplacementCallbacks",
    "TRVariationAxis", "TRNamedStyle", "TRPaletteEntry", "TRPredefinedPalette", "TRBitmapStrike",
  ]) {
    assert.ok(names.includes(name), `${name} is declared by a header`);
  }

  for (const record of records) {
    const check = record.kind === "struct" ? "TEHREER_CHECK_STRUCT" : "TEHREER_CHECK_UNION";
    assert.ok(text.includes(`${check}(${record.name}, ${record.name}Layout);`), `${record.name}: size and alignment`);
    const memberCheck = record.kind === "struct" ? "TEHREER_CHECK_MEMBER" : "TEHREER_CHECK_UNION_MEMBER";
    for (const member of record.members) {
      assert.ok(text.includes(`${memberCheck}(${record.name}, ${record.name}Layout, ${member});`), `${record.name}.${member}`);
    }
  }
});

test("the macros check size, alignment, standard layout, member type and offset", { skip: noCore }, () => {
  const text = layoutsHeader();
  assert.match(text, /static_assert\(sizeof\(Real\) == sizeof\(Mirror\)/);
  assert.match(text, /static_assert\(alignof\(Real\) == alignof\(Mirror\)/);
  assert.match(text, /std::is_standard_layout<Real>::value/);
  assert.match(text, /std::is_same<decltype\(Real::member\), decltype\(Mirror::member\)>::value/);
  assert.match(text, /offsetof\(Real, member\) == offsetof\(Mirror, member\)/);
  // A union has no offsets, so it must not be given the check that needs them.
  assert.match(text, /union TRAttributeValueLayout \{[\s\S]*?\};\nTEHREER_CHECK_UNION\(TRAttributeValue, TRAttributeValueLayout\);/);
  assert.doesNotMatch(text, /TEHREER_CHECK_MEMBER\(TRAttributeValue,/);
});

test("a function pointer member is printed with its own signature, so a change of it is caught", { skip: noCore }, () => {
  assert.match(layoutsHeader(), /void \(\*computeRoom\)\(void \*userData, TRFloat layoutWidth, TRReplacementRoom \*room\);/);
  assert.match(layoutsHeader(), /void \(\*drawReplacement\)\(void \*userData, const struct _TRGlyphRun \*run, TRPoint origin\);/);
});

test("the struct codecs are listed by name for the runtime", { skip: noCore }, () => {
  const { cpp, model } = generate(headers);
  const text = cpp.get("Structs.h") ?? "";
  assert.ok(model.structs.length >= 6);
  for (const struct of model.structs) {
    assert.match(text, new RegExp(`"${struct.name}", sizeof\\(${struct.name}\\)`), struct.name);
  }
  assert.match(text, /#include "Layouts\.h"/);
});

test("the device suite has a round-trip sample for every struct that is converted", { skip: noCore }, () => {
  const suite = readFileSync(join(root, "tests/device/StructTests.ts"), "utf8");
  const samples = [...suite.slice(suite.indexOf("const structs"), suite.indexOf("const attributes")).matchAll(/^ {2}(TR\w+):/gm)].map((match) => match[1]);
  const converted = [...generate(headers).model.structs.map((struct) => struct.name), "TRAttribute"];
  assert.deepEqual(samples.sort(), converted.sort());
});

const checkSource = "#include \"Layouts.h\"\n";

// A copy of Core's headers that is edited the way a change of Core could, then compiled against
// the checked-in Layouts.h, which stays as it is: the build has to fail.
async function compileWith(edit: (read: (file: string) => string, write: (file: string, text: string) => void) => void): Promise<{ ok: boolean; output: string }> {
  assert.ok(compiler);
  const directory = mkdtempSync(join(tmpdir(), "tehreer-layout-"));
  try {
    cpSync(core, join(directory, "Headers"), { recursive: true });
    const path = (file: string): string => join(directory, "Headers/Tehreer", file);
    edit((file) => readFileSync(path(file), "utf8"), (file, text) => writeFileSync(path(file), text));
    const source = join(directory, "Check.cpp");
    writeFileSync(source, checkSource);
    const result = await checkSyntax(compiler, source, [join(directory, "Headers"), join(root, "cpp/generated"), join(root, "tests/fixtures/jsi-stub")]);
    return { ok: result.ok, output: result.output };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function replace(text: string, from: string, to: string): string {
  assert.ok(text.includes(from), `the header no longer contains: ${from}`);
  return text.replace(from, to);
}

test("the unchanged headers agree with the layouts", { skip: noCompiler }, async () => {
  const result = await compileWith(() => undefined);
  assert.equal(result.ok, true, result.output);
});

test("a header that no longer agrees with the layouts does not compile", { skip: noCompiler }, async () => {
  const geometry = (edit: (text: string) => string) => (read: (file: string) => string, write: (file: string, text: string) => void) =>
    write("TRGeometry.h", edit(read("TRGeometry.h")));

  const cases: [string, Parameters<typeof compileWith>[0], RegExp][] = [
    ["a member is added", geometry((text) => replace(text, "TRFloat y;                      /**< The vertical coordinate. */", "TRFloat y; TRFloat z;")), /TRPoint: the size/],
    ["a member changes its type but not its size", geometry((text) => replace(text, "TRFloat height;", "TRInt32 height;")), /TRSize\.height: the type/],
    ["two members of one type swap places", geometry((text) => replace(text, "TRFloat x;                      /**< The horizontal coordinate. */\n    TRFloat y;", "TRFloat y;\n    TRFloat x;")), /TRPoint\.x: the offset/],
    ["a member is renamed", geometry((text) => replace(text, "TRFloat tx;", "TRFloat dx;")), /no member named 'tx'/],
    ["a member of a union gets bigger than the others", (read, write) => {
      write("TRAttribute.h", replace(read("TRAttribute.h"), "TRFloat lineSpacing;", "double lineSpacing;"));
    }, /TRAttributeValue/],
    ["the signature of a callback changes", (read, write) => {
      write("TRReplacement.h", replace(read("TRReplacement.h"), "TRFloat layoutWidth, TRReplacementRoom *room", "TRFloat layoutWidth, TRReplacementRoom room"));
    }, /TRReplacementCallbacks\.computeRoom: the type/],
  ];

  const results = await Promise.all(cases.map(([, edit]) => compileWith(edit)));
  results.forEach((result, index) => {
    const [description, , expected] = cases[index] as (typeof cases)[number];
    assert.equal(result.ok, false, `${description}: the build did not fail`);
    assert.match(result.output, expected, description);
  });
});
