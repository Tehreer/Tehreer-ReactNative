import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { checkSyntax, findCompiler, NO_COMPILER } from "./CompileSupport.mjs";
import { generate } from "../scripts/generator/generate.mjs";

const url = (path: string): string => new URL(path, import.meta.url).pathname;

const sample = generate(url("./fixtures/sample/Tehreer"), {
  excluded: new Set(),
  manual: new Set(),
  bounds: {},
  scalarOuts: { TRSampleGetDistance: ["distance"] },
  skipIncludes: [],
});

const cpp = (name: string): string => {
  const text = sample.cpp.get(name);
  assert.ok(text, `${name} is generated`);
  return text;
};

test("every generated file says that it is generated", () => {
  for (const [name, text] of sample.cpp) {
    assert.match(text, /GENERATED FILE\. DO NOT EDIT\./, name);
    assert.match(text, /npm run generate/, name);
  }
  assert.match(sample.ts, /GENERATED FILE\. DO NOT EDIT\./);
});

test("the files are one per header plus the shared ones", () => {
  assert.deepEqual([...sample.cpp.keys()].sort(), [
    "Bindings.cpp", "Bindings.h", "GeneratedSupport.h", "Handles.h", "Structs.h", "TRSampleBindings.cpp",
  ]);
  assert.match(cpp("Bindings.cpp"), /InstallTRSample\(rt, target\)/);
});

test("a function without parameters returns its number", () => {
  const text = cpp("TRSampleBindings.cpp");
  assert.match(text, /BindTRSampleVersionGetMajor\(jsi::Runtime &rt, const jsi::Value &, const jsi::Value \*, size_t\)/);
  assert.match(text, /return marshal::FromNumber<TRUInt32>\(rt, result\);/);
});

test("an object that is created is adopted, one that is got is retained, and release is not bound", () => {
  const text = cpp("TRSampleBindings.cpp");
  assert.match(text, /FromHandle<TRSampleRef>\(rt, result, marshal::Ownership::Adopt\)/);
  assert.match(text, /BindTRSampleGetOwner[\s\S]*?marshal::Ownership::Retain/);
  assert.doesNotMatch(text, /BindTRSampleRelease/);
  assert.match(cpp("Handles.h"), /static void Release\(TRSampleRef ref\) \{ TRSampleRelease\(ref\); \}/);
});

test("a struct is converted by member in both directions", () => {
  const structs = cpp("Structs.h");
  assert.match(structs, /inline jsi::Value TRPointToJs\(/);
  assert.match(structs, /result\.x = marshal::ToNumber<TRFloat>\(rt, object\.getProperty\(rt, "x"\)/);
  assert.match(cpp("TRSampleBindings.cpp"), /TRPoint a_origin = TRPointFromJs\(/);
});

test("an out parameter is returned, and undefined stands for a false flag", () => {
  const text = cpp("TRSampleBindings.cpp");
  assert.match(text, /TRFloat o_distance = 0;/);
  assert.match(text, /TRSampleGetDistance\(a_sample, a_index, &o_distance\)/);
  assert.match(text, /if \(result == TRFalse\) \{\s*return jsi::Value::undefined\(\);/);
});

test("a text buffer is checked against its count and the size of a code unit", () => {
  assert.match(cpp("TRSampleBindings.cpp"),
    /RequireCapacity\(rt, kFunction, "string", static_cast<size_t>\(a_length\), marshal::CodeUnitSize\(a_encoding\), a_string\.byteLength\)/);
});

test("a buffer that may be NULL is checked only when present, any other always", () => {
  // `string` is documented as accepting NULL.
  assert.match(cpp("TRSampleBindings.cpp"), /if \(a_string\.data != nullptr\) \{\s*marshal::RequireCapacity\(rt, kFunction, "string"/);

  const directory = mkdtempSync(join(tmpdir(), "tehreer-required-"));
  try {
    const header = readFileSync(url("./fixtures/sample/Tehreer/TRSample.h"), "utf8").replace(
      "TR_EXTERN_C_END\n\n#endif",
      `TR_PUBLIC void TRSampleFill(TRSampleRef sample, const TRFloat *advances, const TRPoint *offsets, TRUInteger count);
       TR_EXTERN_C_END
       #endif`,
    );
    writeFileSync(join(directory, "TRSample.h"), header);
    const text = generate(directory, { excluded: new Set(), manual: new Set(), bounds: {}, scalarOuts: { TRSampleGetDistance: ["distance"] }, skipIncludes: [] }).cpp.get("TRSampleBindings.cpp") ?? "";

    // Without a guard, so an empty array or buffer with a count above zero is rejected.
    assert.match(text, /\n {4}marshal::RequireCapacity\(rt, kFunction, "advances"/);
    assert.match(text, /\n {4}marshal::RequireElements\(rt, kFunction, "offsets"/);
    assert.doesNotMatch(text, /if \(a_advances\.data != nullptr\)/);
    assert.doesNotMatch(text, /if \(a_offsets != nullptr\)/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("buffers are taken after every other argument, so no JavaScript runs while a pointer is held", () => {
  const text = cpp("TRSampleBindings.cpp");
  const body = text.slice(text.indexOf("jsi::Value BindTRSampleSetText"));
  // `string` comes before `length` and `encoding` in the header but is converted after them.
  assert.ok(body.indexOf("a_encoding =") < body.indexOf("a_string ="));
  assert.ok(body.indexOf("a_length =") < body.indexOf("a_string ="));
  assert.match(cpp("GeneratedSupport.h"), /only while no JavaScript runs/);
});

test("handles are converted after structs and arrays and before the buffers", () => {
  const body = cpp("TRSampleBindings.cpp");
  const text = body.slice(body.indexOf("jsi::Value BindTRSampleSetText"));
  assert.ok(text.indexOf("a_length =") < text.indexOf("a_sample ="));
  assert.ok(text.indexOf("a_sample =") < text.indexOf("a_string ="));
  const set = body.slice(body.indexOf("jsi::Value BindTRSampleSetOrigin"));
  assert.ok(set.indexOf("a_origin =") < set.indexOf("a_sample ="));
});

test("an error in a struct member names the path of the member", () => {
  const structs = cpp("Structs.h");
  assert.match(structs, /const std::string &parameter/);
  assert.match(structs, /\(parameter \+ "\.x"\)\.c_str\(\)/);
});

test("a callback stops the enumeration once, in both places", () => {
  const text = cpp("TRSampleBindings.cpp");
  assert.equal(text.match(/\*stop = TRTrue;/g)?.length, 2);
});

test("a callback collects into an array, stops on error and rethrows after the call", () => {
  const text = cpp("TRSampleBindings.cpp");
  assert.match(text, /void CollectTRSampleEnumerate_func\(void \*userData, TRUInteger index, TRPoint origin, TRBoolean \*stop\)/);
  assert.match(text, /collector->error = std::current_exception\(\);\s*\*stop = TRTrue;/);
  assert.match(text, /TRSampleEnumerate\(a_sample, a_index, a_length, CollectTRSampleEnumerate_func, &collector\)/);
  assert.match(text, /jsi::Value items = collector\.Finish\(\);/);
});

test("the typed declarations say what each function takes and gives", () => {
  const ts = sample.ts;
  assert.match(ts, /TRSampleVersionGetMajor\(\): number;/);
  assert.match(ts, /TRSampleCreate\(size: number\): Handle<"TRSample"> \| undefined;/);
  assert.match(ts, /TRSampleGetOwner\(sample: Handle<"TRSample">\): Handle<"TRSample"> \| undefined;/);
  assert.match(ts, /TRSampleGetOrigin\(sample: Handle<"TRSample">\): TRPoint;/);
  assert.match(ts, /TRSampleSetOrigin\(sample: Handle<"TRSample">, origin: TRPoint\): void;/);
  assert.match(ts, /TRSampleGetDistance\(sample: Handle<"TRSample">, index: number\): number \| undefined;/);
  assert.match(ts, /TRSampleSetText\(sample: Handle<"TRSample">, string: ArrayBuffer \| ArrayBufferView \| undefined, length: number, encoding: number\): boolean;/);
  assert.match(ts, /TRSampleGetAdvancesPtr\(sample: Handle<"TRSample">\): PointerView<"TRFloat"> \| undefined;/);
  assert.match(ts, /TRSampleEnumerate\(sample: Handle<"TRSample">, index: number, length: number\): \{ index: number; origin: TRPoint \}\[\] \| undefined;/);
  assert.match(ts, /export interface TRPoint \{\s*x: number;\s*y: number;\s*\}/);
  assert.doesNotMatch(ts, /TRSampleRelease/);
  assert.match(ts, /`TRBoolean TRSampleGetDistance\(TRSampleRef sample, TRUInteger index, TRFloat \*distance\)`/);
});

test("the output is the same on every run", () => {
  const again = generate(url("./fixtures/sample/Tehreer"), { excluded: new Set(), manual: new Set(), bounds: {}, scalarOuts: { TRSampleGetDistance: ["distance"] }, skipIncludes: [] });
  assert.deepEqual([...again.cpp], [...sample.cpp]);
  assert.equal(again.ts, sample.ts);
});

const compiler = findCompiler();

test("the glue of the sample compiles against the JSI stub", { skip: compiler ? false : NO_COMPILER }, async () => {
  assert.ok(compiler);
  const directory = mkdtempSync(join(tmpdir(), "tehreer-sample-"));
  try {
    for (const [name, text] of sample.cpp) writeFileSync(join(directory, name), text);

    const includes = [directory, url("./fixtures/jsi-stub"), url("./fixtures/sample")];
    const results = await Promise.all(
      [...sample.cpp.keys()].filter((name) => name.endsWith(".cpp")).map((name) => checkSyntax(compiler, join(directory, name), includes)),
    );
    for (const result of results) assert.ok(result.ok, `${result.file}\n${result.output}`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("the compile check rejects glue that does not match the header", { skip: compiler ? false : NO_COMPILER }, async () => {
  assert.ok(compiler);
  const directory = mkdtempSync(join(tmpdir(), "tehreer-sample-"));
  try {
    for (const [name, text] of sample.cpp) writeFileSync(join(directory, name), text);
    // A member that the header does not have, as after a renamed field in Core.
    writeFileSync(join(directory, "Structs.h"), cpp("Structs.h").replace("result.x =", "result.renamed ="));

    const includes = [directory, url("./fixtures/jsi-stub"), url("./fixtures/sample")];
    const result = await checkSyntax(compiler, join(directory, "TRSampleBindings.cpp"), includes);
    assert.equal(result.ok, false);
    assert.match(result.output, /renamed/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
