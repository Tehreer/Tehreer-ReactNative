import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

// The JSI layer cannot run under node (it needs a JS runtime with a JSI implementation, which only
// exists in the example app), so these tests pin the names that three languages must agree on.
const root = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

const manifest = JSON.parse(read("package.json")) as {
  codegenConfig: { name: string; jsSrcsDir: string; ios: { modules: Record<string, { className: string }> } };
};

test("the module name agrees in the spec, in C++ and in the codegen config", () => {
  const spec = read("src/specs/NativeTehreer.ts");
  const header = read("cpp/TehreerModule.h");

  assert.match(spec, /getEnforcing<Spec>\("NativeTehreer"\)/);
  assert.match(header, /kModuleName = "NativeTehreer"/);
  assert.deepEqual(Object.keys(manifest.codegenConfig.ios.modules), ["NativeTehreer"]);
  assert.equal(manifest.codegenConfig.jsSrcsDir, "src/specs");
  // The generated C++ spec header is <codegen name>JSI.h and the base class is Native<Name>CxxSpec.
  assert.match(header, new RegExp(`${manifest.codegenConfig.name}JSI\\.h`));
  assert.match(header, /NativeTehreerCxxSpec<TehreerModule>/);
});

test("the iOS provider class named in the codegen config exists", () => {
  const className = manifest.codegenConfig.ios.modules["NativeTehreer"]?.className;
  assert.ok(className);
  assert.match(read(`ios/${className}.mm`), new RegExp(`@implementation ${className}`));
});

test("the autolinking config names the module class and its CMake target", () => {
  const config = read("react-native.config.cjs");
  const cmake = read("android/CMakeLists.txt");

  assert.match(config, /cxxModuleHeaderName: "TehreerModule"/);
  assert.match(config, /cxxModuleCMakeListsPath: "CMakeLists.txt"/);
  assert.match(config, /cxxModuleCMakeListsModuleName: "tehreer_module"/);
  assert.match(cmake, /add_library\(tehreer_module /);
});

test("the global property of the host object agrees between TypeScript and C++", () => {
  const typescript = /nativeBindingsName = "([^"]+)"/.exec(read("src/internal/NativeBindings.ts"));
  const cpp = /kBindingsName = "([^"]+)"/.exec(read("cpp/runtime/TehreerBindings.h"));

  assert.ok(typescript?.[1]);
  assert.equal(cpp?.[1], typescript[1]);
});

test("every binding of the TypeScript interface is exposed by the C++ host object", () => {
  const interfaceBody = /interface NativeBindings \{([\s\S]*?)\n\}/.exec(read("src/internal/NativeBindings.ts"));
  const names = [...(interfaceBody?.[1] ?? "").matchAll(/^\s+(\w+)\(/gm)].map((match) => match[1]);
  const cpp = read("cpp/runtime/TehreerBindings.cpp");

  assert.deepEqual(names, ["getVersion", "smokeTest"]);
  for (const name of names) {
    assert.ok(cpp.includes(`key == "${name}"`), `${name} is not handled by Bindings::get`);
    assert.ok(cpp.includes(`forAscii(runtime, "${name}")`), `${name} is not listed in getPropertyNames`);
  }
});
