import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { checkSyntax, findCompiler, NO_COMPILER } from "./CompileSupport.mjs";

// The Fabric component of issue #26. Shadow nodes need React Native's C++ and a device to run, so
// the pure parts run here (the UTF-8 decoding, the syntax of the Core-only composer) and the names
// that JavaScript, C++, Kotlin and Objective-C++ must agree on are pinned. The measurement itself is
// checked on a device by example/tests/ViewTests.tsx.
const root = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const compiler = findCompiler();
const coreHeaders = join(root, "Libraries/TehreerCore/Headers");
const skip = !compiler ? NO_COMPILER : !existsSync(join(coreHeaders, "Tehreer")) ? "the Core submodule is not initialised" : false;

test("Utf8ToUtf16 decodes like the WHATWG decoder", { skip }, () => {
  const scratch = mkdtempSync(join(tmpdir(), "tehreer-utf8-"));
  try {
    const program = join(scratch, "check");
    const build = spawnSync(compiler as string, [
      "-std=c++20", "-Wall", "-Wextra", "-Werror", `-I${join(root, "cpp")}`,
      join(root, "tests/fixtures/fabric/Utf8Check.cpp"), "-o", program,
    ], { encoding: "utf8" });
    assert.equal(build.status, 0, build.stdout + build.stderr);
    const run = spawnSync(program, [], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.match(run.stdout, /^OK/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("the composer compiles against the headers of Core alone", { skip }, async () => {
  const result = await checkSyntax(compiler as string, join(root, "cpp/fabric/TextFrameComposer.cpp"), [join(root, "cpp"), coreHeaders], { standard: "c++20" });
  assert.ok(result.ok, result.output);
});

test("the component name agrees in the spec, C++, Kotlin and the codegen config", () => {
  const name = "TehreerTextBase";
  const manifest = JSON.parse(read("package.json")) as {
    codegenConfig: { type: string; ios: { components: Record<string, { className: string }> } };
  };

  assert.match(read("src/specs/TehreerTextBaseNativeComponent.ts"), new RegExp(`codegenNativeComponent<NativeProps>\\("${name}", \\{ interfaceOnly: true \\}\\)`));
  assert.match(read("cpp/fabric/TehreerTextBaseShadowNode.cpp"), new RegExp(`TehreerTextBaseComponentName\\[\\] = "${name}"`));
  assert.match(read("android/src/main/java/com/tehreer/reactnative/TehreerTextBaseManager.kt"), new RegExp(`NAME = "${name}"`));
  // "all" generates components too; with "modules" the spec of the component would be ignored.
  assert.equal(manifest.codegenConfig.type, "all");
  const className = manifest.codegenConfig.ios.components[name]?.className;
  assert.ok(className);
  assert.match(read(`ios/${className}.mm`), new RegExp(`@implementation ${className}`));
  // The CLI finds the descriptor of Android by this name, and autolinking includes TehreerModule.h only.
  assert.match(read("cpp/fabric/TehreerTextBaseComponentDescriptor.h"), /using TehreerTextBaseComponentDescriptor =/);
  assert.match(read("cpp/TehreerModule.h"), /fabric\/TehreerTextBaseComponentDescriptor\.h/);
  assert.match(read("android/CMakeLists.txt"), /cpp\/fabric\/\*\.cpp/);
  // The CLI skips interfaceOnly components when it looks for descriptors, so Android lists it itself.
  assert.match(read("react-native.config.cjs"), /componentDescriptors: \["TehreerTextBaseComponentDescriptor"\]/);
  assert.match(read("android/src/main/java/com/tehreer/reactnative/TehreerPackage.kt"), /TehreerTextBaseManager\(\)/);
});

// The painters of issues #24 and #25: the parts that need no engine or device are compiled here, and
// the names that Kotlin, C++ and the build files must agree on are pinned.
test("the platform independent painter and the frame registry compile against the headers of Core alone", { skip }, async () => {
  for (const file of ["cpp/painter/PaintCallbacks.cpp", "cpp/fabric/FrameRegistry.cpp"]) {
    const result = await checkSyntax(compiler as string, join(root, file), [join(root, "cpp"), coreHeaders], { standard: "c++20" });
    assert.ok(result.ok, `${file}: ${result.output}`);
  }
});

test("every JNI function that Kotlin declares is defined in C++ with the same name, and the build keeps them", () => {
  const kotlin = read("android/src/main/java/com/tehreer/reactnative/TehreerPaintJni.kt");
  const cpp = read("android/src/main/cpp/TextBaseJni.cpp");
  const declared = [...kotlin.matchAll(/@JvmStatic external fun (\w+)\(/g)].map((match) => match[1]);
  assert.deepEqual(declared.sort(), ["create", "destroy", "draw", "setFrame"]);
  for (const name of declared) {
    assert.match(cpp, new RegExp(`Java_com_tehreer_reactnative_TehreerPaintJni_${name}\\(`));
  }
  // A static archive only gives up the members that something refers to, and nothing in C++ refers to these.
  const cmake = read("android/CMakeLists.txt");
  assert.match(cmake, /--undefined=Java_com_tehreer_reactnative_TehreerPaintJni_create/);
  assert.match(cmake, /android\/src\/main\/cpp\/\*\.cpp/);
  assert.match(cmake, /cpp\/painter\/\*\.cpp/);
});

test("the Kotlin manager reads the frame id from the key that the state writes", () => {
  const state = read("cpp/fabric/TehreerTextBaseState.h");
  assert.match(state, /builder\.putInt\(6, frame \? static_cast<int>\(frame->id\(\)\) : 0\)/);
  assert.match(read("android/src/main/java/com/tehreer/reactnative/TehreerTextBaseManager.kt"), /view\.setFrame\(state\.getInt\(6\)\)/);
});
