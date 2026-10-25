import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { checkSyntax, findCompiler, NO_COMPILER } from "./CompileSupport.mjs";

// The Fabric component TLinePaint, the one native view of TLabel and TTextView. Shadow nodes and views
// need React Native's C++, Kotlin and Objective-C++ and a device to run, so the parts that need only
// Core are compiled here and the names that JavaScript, C++, Kotlin and Objective-C++ must agree on
// are pinned. What the views do is checked on a device by example/tests/LabelTests.tsx.
const root = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const compiler = findCompiler();
const coreHeaders = join(root, "Libraries/TehreerCore/Headers");
const skip = !compiler ? NO_COMPILER : !existsSync(join(coreHeaders, "Tehreer")) ? "the Core submodule is not initialised" : false;
const kotlin = (name: string) => read(`android/src/main/java/com/tehreer/reactnative/${name}.kt`);

test("the files that need only Core compile against its headers", { skip }, async () => {
  const files = [
    "cpp/views/TextLayout.cpp", "cpp/views/Typesetters.cpp", "cpp/views/ComposedFrames.cpp", "cpp/views/ReplacementHolder.cpp", "cpp/painter/PaintCallbacks.cpp",
  ];
  for (const file of files) {
    const result = await checkSyntax(compiler as string, join(root, file), [join(root, "cpp"), coreHeaders], { standard: "c++20" });
    assert.ok(result.ok, `${file}: ${result.output}`);
  }
});

test("the component name agrees in the spec, C++, Kotlin, Objective-C++ and the configs", () => {
  const manifest = JSON.parse(read("package.json")) as { codegenConfig: { type: string; ios: { components: Record<string, { className: string }> } } };
  // "all" generates components too; with "modules" the specs of the components would be ignored.
  assert.equal(manifest.codegenConfig.type, "all");
  const descriptors = [...read("react-native.config.cjs").matchAll(/"(\w+ComponentDescriptor)"/g)].map((match) => match[1]);
  const name = "TLinePaint";

  assert.deepEqual(Object.keys(manifest.codegenConfig.ios.components), [name]);
  assert.match(read(`src/specs/${name}NativeComponent.ts`), new RegExp(`codegenNativeComponent<NativeProps>\\("${name}", \\{ interfaceOnly: true \\}\\)`));
  assert.match(read("cpp/views/ComponentNames.cpp"), new RegExp(`${name}ComponentName\\[\\] = "${name}"`));
  assert.match(kotlin(`${name}Manager`), new RegExp(`NAME = "${name}"`));
  assert.equal(manifest.codegenConfig.ios.components[name]?.className, name);
  assert.match(read(`ios/${name}.mm`), new RegExp(`@implementation ${name}\\b`));
  assert.match(read(`ios/${name}.mm`), new RegExp(`Class<RCTComponentViewProtocol> ${name}Cls\\(void\\)`));
  // The CLI finds the descriptor of Android by this name, and autolinking includes TehreerModule.h only.
  assert.match(read("cpp/views/ComponentDescriptors.h"), new RegExp(`using ${name}ComponentDescriptor =`));
  assert.deepEqual(descriptors, [`${name}ComponentDescriptor`]);
  assert.match(read("cpp/TehreerModule.h"), /views\/ComponentDescriptors\.h/);
  assert.match(read("android/CMakeLists.txt"), /cpp\/views\/\*\.cpp/);
  assert.match(kotlin("TehreerPackage"), /listOf\(TLinePaintManager\(\)\)/);
});

test("the old native views are gone: JavaScript lays out, scrolls and handles touches", () => {
  for (const file of ["TLabel", "TTextView", "TextContainer", "LineView", "ComposedLine", "LineLocator", "Typesetter", "TextLayoutTasks"]) {
    assert.ok(!existsSync(join(root, `android/src/main/java/com/tehreer/reactnative/${file}.kt`)), `${file}.kt is back`);
  }
  for (const file of ["TLabel", "TTextView", "LineView"]) {
    assert.ok(!existsSync(join(root, `ios/${file}.mm`)), `${file}.mm is back`);
  }
  for (const file of ["TLabelNativeComponent", "TTextViewNativeComponent"]) {
    assert.ok(!existsSync(join(root, `src/specs/${file}.ts`)), `${file}.ts is back`);
  }
  // The views have no event: what happens to the text is for JavaScript to see.
  assert.ok(!/DirectEventHandler/.test(read("src/specs/TLinePaintNativeComponent.ts")));
});

test("the view bindings that TypeScript declares are defined in C++", () => {
  const cpp = read("cpp/runtime/ViewBindings.cpp");
  const ts = read("src/internal/NativeBindings.ts");
  for (const name of ["registerTypesetter", "unregisterTypesetter", "registerComposedFrame", "unregisterComposedFrame", "createReplacementHolder"]) {
    assert.match(ts, new RegExp(`\\b${name}\\(`), `${name} is not declared in NativeBindings.ts`);
    assert.match(cpp, new RegExp(`Define\\(runtime, target, "${name}"`), `${name} is not installed`);
  }
  assert.match(read("cpp/runtime/TehreerBindings.cpp"), /InstallViewBindings\(runtime, bindings\)/);
});

test("every native that Kotlin declares is registered in C++ with the same name and signature kind", () => {
  const bridge = read("android/src/main/cpp/JavaBridge.cpp");
  assert.match(bridge, /Java_com_tehreer_reactnative_JniBridge_nRegister/);
  assert.match(kotlin("JniBridge"), /nRegister\(\)/);
  // A static archive only gives up the members that something refers to; Java finds nRegister by name.
  assert.match(read("android/CMakeLists.txt"), /--undefined=Java_com_tehreer_reactnative_JniBridge_nRegister/);

  for (const [kotlinName, cppName] of [["ComposedFrame", "ComposedFrame"], ["Renderer", "Renderer"]] as [string, string][]) {
    const declared = [...kotlin(kotlinName as string).matchAll(/external fun (n\w+)\(/g)].map((match) => match[1] as string);
    assert.ok(declared.length > 0, kotlinName);
    const cpp = read(`android/src/main/cpp/${cppName}.cpp`);
    for (const native of declared) {
      assert.match(cpp, new RegExp(`\\{ "${native}", "`), `${kotlinName}.${native} is not registered`);
    }
    // The other way round: nothing is registered that Kotlin does not declare.
    for (const registered of [...cpp.matchAll(/\{ "(n\w+)", "/g)].map((match) => match[1] as string)) {
      assert.ok(declared.includes(registered), `${kotlinName}.${registered} is registered but not declared`);
    }
    assert.match(cpp, new RegExp(`register_com_tehreer_reactnative_${cppName}\\(JNIEnv`));
    assert.match(bridge, new RegExp(`register_com_tehreer_reactnative_${cppName}\\(env\\)`));
  }
});

test("every prop of the component reaches the code that reads it", () => {
  const spec = read("src/specs/TLinePaintNativeComponent.ts");
  const props = [...spec.matchAll(/^ {2}(\w+)\?: CodegenTypes\.WithDefault/gm)].map((match) => match[1] as string);
  // No array props: each setting is a property of its own, named as in Core's `Renderer` and `FrameResolver`.
  assert.ok(!/ReadonlyArray/.test(spec));
  const manager = kotlin("TLinePaintManager");
  const view = read("ios/TLinePaint.mm");
  const shadow = read("cpp/views/TextShadowNode.h");
  const frameSettings = read("cpp/views/TextLayout.h");
  const rendererSettings = read("cpp/views/RendererSettings.h");
  // The shadow node reads the typesetter and the frame resolver settings; the views read the rest.
  const measuring = ["maxLines", "textAlignment", "isTruncationEnabled", "truncationMode", "truncationPlace", "extraLineSpacing", "lineHeightMultiplier", "isJustificationEnabled", "justificationLevel"];
  const renderer = ["textColor", "drawStyle", "strokeColor", "strokeRadius", "strokeCap", "strokeJoin", "strokeMiter", "glyphShadowColor", "glyphShadowRadius", "glyphShadowDx", "glyphShadowDy"];
  assert.match(shadow, /props\.typesetterId/);
  assert.match(shadow, /FrameSettings::From\(props\)/);
  for (const prop of props) {
    if (prop === "typesetterId") {
      continue;
    }
    if (measuring.includes(prop)) {
      assert.match(frameSettings, new RegExp(`props\\.${prop}\\b`), `${prop} is not read by FrameSettings`);
      continue;
    }
    assert.match(manager, new RegExp(`name = "${prop}"`), `${prop} has no ReactProp in Kotlin`);
    if (renderer.includes(prop)) {
      assert.match(rendererSettings, new RegExp(`props\\.${prop}\\b`), `${prop} is not read by RendererSettings`);
    } else {
      assert.match(view, new RegExp(`next\\.${prop}\\b`), `${prop} is not read by the iOS view`);
    }
  }
  assert.match(view, /RendererSettings::From\(next\)/);
});

test("native holds nothing for the shadow thread but the id tables and the holders, each with a why-comment", () => {
  // A mutex or an atomic is only where two threads meet; the files say why.
  for (const file of ["cpp/views/Typesetters.h", "cpp/views/ComposedFrames.h", "cpp/views/ReplacementHolder.h"]) {
    assert.match(read(file), /mutex/);
  }
  const mutexFiles = ["cpp/views", "cpp/painter", "ios", "android/src/main/cpp"].flatMap((dir) => {
    const names = ["Typesetters.cpp", "ComposedFrames.cpp", "ReplacementHolder.cpp", "TextLayout.cpp", "TLinePaint.mm", "PaintCallbacks.cpp", "ComposedFrame.cpp"];
    return names.filter((name) => existsSync(join(root, dir, name)) && /std::mutex|std::atomic|NSLock/.test(read(`${dir}/${name}`)));
  });
  assert.deepEqual(mutexFiles.sort(), ["ComposedFrames.cpp", "ReplacementHolder.cpp", "Typesetters.cpp"]);
});

test("a view that goes frees what it owns, so nothing is held for React Native's states", () => {
  assert.match(read("ios/TLinePaint.mm"), /prepareForRecycle[\s\S]*releaseFrame/);
  assert.match(kotlin("TLinePaintManager"), /onDropViewInstance[\s\S]*view\.release\(\)/);
  // No state, so React Native has none to keep.
  assert.ok(!/StateData|getStateData|setStateData/.test(read("cpp/views/TextShadowNode.h")));
});

test("the Kotlin objects that own native memory give it back: by dispose, and by a private Finalizer if nobody does", () => {
  for (const name of ["ComposedFrame", "Renderer"]) {
    const source = kotlin(name);
    assert.match(source, /private class Finalizer\(/, `${name} has no Finalizer`);
    assert.match(source, /protected fun finalize\(\)/);
    assert.match(source, /private val finalizer = Finalizer\(/);
    // Releasing twice (dispose, then the finalizer) must not free twice.
    assert.match(source, /compareAndSet\(false, true\)/);
    assert.match(source, /fun dispose\(\)[\s\S]*finalizer\.release\(\)/);
  }
  // The view disposes both when it is dropped.
  assert.match(kotlin("TLinePaint"), /fun release\(\)[\s\S]*composedFrame\?\.dispose\(\)[\s\S]*renderer\.dispose\(\)/);
  // A frame that is replaced is given back at once.
  assert.match(kotlin("TLinePaint"), /composedFrame\?\.dispose\(\)\s+composedFrameId = id/);
});

test("the Android view clips what it draws to its bounds", () => {
  assert.match(kotlin("TLinePaint"), /clipRect\(0, 0, width, height\)/);
});

test("the text views draw lines that JavaScript chose, with the line locator of Core", () => {
  const view = read("src/views/TTextView.tsx");
  assert.match(view, /new LineLocator\(frame, measuring\)/);
  assert.match(view, /TLinePaintNativeComponent/);
  assert.match(read("src/views/TLabel.tsx"), /TLinePaintNativeComponent/);
  assert.match(read("src/views/useTextView.ts"), /registerComposedFrame\(/);
  assert.match(read("src/views/useTextView.ts"), /unregisterComposedFrame\(/);
});
