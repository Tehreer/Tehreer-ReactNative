---
name: web-wrapper
description: Rules, conventions and workflow for wrapping Tehreer Core in Tehreer-Web (TypeScript + WebAssembly for the web, the base of the React components). Use when the Core API changes and the web wrapper has to follow, when adding a TypeScript class or struct layout for a Core object, when moving logic from TypeScript into Core, or when verifying the wrapper against Android and Cocoa.
---

# Wrap Tehreer Core in Tehreer-Web

The web repo is `/Users/mta/Learning/Tehreer-Web` (npm package `tehreer`, ES modules, TypeScript 5.9, strict). It compiles Core with Emscripten into one WebAssembly module and exposes every public header as a TypeScript API shaped like Tehreer-Android and Tehreer-Cocoa. It has no React in it yet: widgets (`TLabel`, `TTextView`) and a React package are meant to be built on top. Core is **not** a submodule: the build reads `../Tehreer-Core` (override with `TEHREER_CORE`), and its dependency sources from `../Tehreer-Core/build/_deps` (override with `TR_DEPS_SRC`). Emscripten comes from `brew install emscripten` (`emcc`, `emcmake`).

## 1. Principles

1. **Core owns the logic.** Layout, shaping, matching, drawing math, run backgrounds and decorations, cluster/caret math, typeface registry and style matching live in Core. TypeScript never re-implements them. If the web needs a rule Core lacks, add it to Core (with tests there), then bridge it. A setting that Core stores but cannot return gets a getter in Core (as `TRShapingEngineGet*` did), not a copy in TypeScript.
2. **The bridge is thin.** A member converts arguments, calls one `TR*` function through `Module`, converts the result. No algorithms, no mirrored state, except what section 6 allows.
3. **TypeScript keeps web terminology, not Core's.** `Rect {x, y, width, height}`, `Color` as `0xAARRGGBB`, `CanvasRenderingContext2D`, `Path2D`, `ImageData`, `fromIndex`/`toIndex`, `typeSize`, `strokeRadius`. Core words are mirrored when they say something new (`computeInkBox`, `isScalable`, `bitmapStrikes`, `DrawStyle`). Defaults are Core's.
4. **API compatibility is not sacred.** Break the API when that lets the wrapper follow Core more directly; say so in the summary.
5. **Web-only concerns stay in TypeScript:** canvas painting of draw callbacks (`CanvasPainter`), `Path` to `Path2D`/SVG, `fetch` of fonts, `Symbol.dispose`/`FinalizationRegistry`, and (later) widgets and React.
6. **No dependency without asking.** The library has none; dev dependencies are `typescript` and `@types/node`. Tests use `node:test`. Ask before adding a package or downloading anything (an Emscripten port such as libpng included).

## 2. Layout

```
native/        CMakeLists.txt (Core + deps -> one module), Module.c (tw_version, tw_layout), exports.json (generated)
scripts/       build-wasm.sh, generate-bindings.mjs, copy-wasm.mjs
src/
  index.ts     the public surface, in the order of the folders below
  initialize.ts   initialize(), getVersion()
  Color.ts, geometry.ts
  collections/ List, NumberKind, CoreList (CoreList, IndexedList, corePoints, coreNumbers), CoreView
  graphics/    FontFile, Typeface (+ VariationAxis, NamedStyle, ColorPalette, BitmapStrike), TypefaceManager, TypeFamily,
               Renderer, GlyphCache, GlyphImage, Path, PathSink, enums.ts
  layout/      TText, TMutableText, TextAttributes, TextAttributeCodec, Typesetter, FrameResolver, ComposedFrame,
               ComposedLine, GlyphRun, LineLocator, Replacement, enums.ts
  sfnt/        ShapingEngine, ShapingResult, FontFeatures, OpenTypeFeature, SfntTag, enums.ts
  unicode/     BidiAlgorithm, BidiParagraph, BidiLine, BidiBuffer, BidiRun, BidiPair, ScriptClassifier, ScriptRun,
               CodePoint, BaseDirection, enums.ts (generated: BidiClass, GeneralCategory, Script)
  drawing/     DrawingContext, CanvasPainter, ReplacementDelegate
  internal/    Module, Memory, Struct, Structs, Callbacks, NativeObject, Adopt, Validation, NativeFunctions.ts (generated)
  wasm/        tehreer.js, tehreer.wasm (generated, git-ignored), tehreer.d.ts (hand-written)
tests/         node:test suites; fixtures are Core's Tests/Fonts
```

Folders mirror Android's packages; one class per file, file named after the class (PascalCase). Everything under `internal/` and `native/exports.json`, `src/internal/NativeFunctions.ts` is never public API.

## 3. The module and the bindings

- **`Module`** (`internal/Module.ts`) is the loaded WebAssembly module: an `export let` ES binding that throws "not initialized" until `initialize()` has finished, and is the module everywhere after. Call Core as `Module._TRTypefaceGetWeight(handle)`. Never cache `Module.HEAPU8` and friends across a call that can allocate: memory growth replaces them. Read them through `Module` each time (the `Struct`/`Memory` helpers do).
- **Bindings are generated.** `scripts/generate-bindings.mjs` parses `Headers/Tehreer/*.h` and writes `native/exports.json` (the exported functions) and `src/internal/NativeFunctions.ts` (a typed `NativeFunctions` interface, with the C signature in a comment). `build-wasm.sh` runs it first. It also reads the classic SheenBidi headers (`SHEENBIDI_HEADERS`, from `build/deps/SheenBidi`, so the build links the dependencies first) and exports the `SB*` functions; the unicode package wraps those, the same classes as Tehreer-Android. `scripts/generate-unicode-enums.mjs` writes `src/unicode/enums.ts` from their constants. A `BidiBuffer` (reference counted UTF-16 copy of the text) is kept by algorithm, paragraphs and lines, as SheenBidi does not own it. Declared-but-undefined functions go in its `EXCLUDED` set (`TRVersionGetString`, `TRTextGetSheenBidiText`); the version comes from `tw_version()` in `native/Module.c`.
- **WebAssembly C ABI (verified by the tests):** a struct passed by value (`TRPoint`, `TRSize`, `TRRect`) is passed as the address of a copy; a struct returned by value is written through a first argument `ret`; `TRUInteger`, pointers and `size_t` are 32 bits; `TRBoolean` is a byte; floats arrive as doubles. The generated declarations say which parameters are structs.
- **No file system** (`-sFILESYSTEM=0`), single threaded (no `SharedArrayBuffer`, no COOP/COEP). Fonts come from bytes (`new FontFile(bytes)`, `FontFile.fromUrl()`). FreeType has no libpng, so `CBDT` bitmap glyphs have no images.

## 4. Handles, lifetimes, ownership

- A wrapper extends `NativeObject` and owns **one** Core reference: `super(handle, (h) => Module._TRFooRelease(h))`. `nativeHandle` throws "already disposed" after `dispose()`. `[Symbol.dispose]()` supports `using`. A `FinalizationRegistry` releases what was never disposed; nothing may depend on it. `equals(other)` compares handles.
- **Follow Core's ownership rule.** `Create`/`Copy` returns an owned reference: wrap it with `adopting` (or the `adopt` constructor overload). `Get` is not retained: wrap it with `retaining`, which calls `TR*Retain` first (`Typeface.retaining(TRFontFileGetTypeface(...))`). A child therefore never depends on its parent staying alive (a `GlyphRun` outlives its line, a `Typeface` its font file). The exception is data behind a pointer (section 5), which belongs to its owner.
- **Internal constructors** use an overload with the `adopt` symbol: `constructor(token: typeof adopt, handle: number)`, marked `/** @internal */` (`stripInternal` removes it from the declarations). Public constructors create the Core object (`checkCreated`).
- When Core takes an object (typeface, replacement, font features, glyph cache, typesetter) it retains it; the wrapper does not need to keep its own reference. A temporary that was made only for the call (`FontFeatures` from an array) is disposed after it. `LineLocator` is the exception: Core does not retain the frame, so the wrapper keeps the frame and the renderer.
- Core objects are immutable and thread safe after creation. `Renderer`, `ShapingEngine`, `FrameResolver` and `TMutableText` are mutable configuration objects.
- **Callbacks** (`internal/Callbacks.ts`): function pointers are made **once** (`installCallbacks()`, `Module.addFunction` with the WebAssembly signature: pointers and integers `i`, floats `f`, a by-value struct is `i`). `userData` is a key into a `HandlerTable`, never a pointer to JavaScript. An error thrown in a handler cannot cross Core's frames: `guard()` keeps the first one and sets `stop`, and `callingBack(() => Module._TR…)` rethrows it when the call returns. Every call that can reach user code (replacement `computeRoom`, draw callbacks, path sinks) goes through `callingBack`; callbacks that only collect go through `collect<T>()`, which is why C enumerations come back as arrays (`getSelectionRects`, `getVisualEdges`, `findLines`, `getAvailableTypefaces`).
- **State of callbacks in Core objects:** a replacement's `computeRoom`/`finalize` use `replacements`/`replacementKeys`; a glyph image's cached canvas image uses `TRGlyphImageSetNativeData` with `imageData` and the `imageDestroy` pointer.

## 5. Memory: structs, views and lists

- **No pointer arithmetic outside `internal/Struct.ts` and `internal/Structs.ts`.** Every C struct that is read or written is described once in `Structs.ts` with the name of the C type, members in the order of the C declaration: `TRRect = struct({ x: f32, y: f32, width: f32, height: f32 })`. Offsets and size are computed with the alignment of a 32-bit target. Use:
  - `view(address)` / `at(base, index)`: lazy view, each property reads or writes memory when used;
  - `snapshot(address)`: plain object; `assign(address, values)`: write the given fields;
  - `allocate(stack, values?)`, `returning(call)` (a struct that Core returns), `passing(values, body)` (a struct that Core takes by value);
  - `union({...})` for unions (`TRAttributeValue`), `stringPointer` for a `TRStringView *` member, `readOptionalStringView(pointer)` for a pointer that can be `NULL`.
  Field types: `u8 u16 i32 u32 f32 ptr bool`. Add a struct there, never read an offset by hand.
- **Compiler check.** `native/Module.c` exports `tw_layout(buffer, capacity)`, JSON of `sizeof`/`offsetof` of every described struct. `tests/Structs.test.ts` compares it with `structs` in both directions (every described struct is checked, every checked struct is described). A new struct needs: its layout in `Structs.ts`, its entry in `structs`, and its `BEGIN/FIELD/END` block in `tw_layout` (a nested member such as `origin.x` is given under the flat name).
- **Lists** (`collections/`): collections of Core are read-only `List<T>` (`length`, `get`, `at`, `slice` view, iteration, `map`/`find`/`some`/`every`/`reduce`, `toArray`). `NumberList<Float | UInt16 | UInt32 | UInt8 | Int32>` adds `toTypedArray()`; `PointList` adds `toFloat32Array()`. They read Core memory when an element is asked for (`CoreList`, like Cocoa's `CoreCollection` and Android's `*BufferList`), keep the owner and fail with "already disposed" once it is disposed. `IndexedList` makes objects from an index (runs, lines, typefaces). A struct element is a `CoreView` subclass whose getters read the struct (`CoreVariationAxis`). A list whose elements are numbers of Core is passed to Core without a copy (`coreBufferOf`); anything else is copied into a temporary buffer (`withValues`).
- Never convert Core data into arrays or objects in a constructor or cache it in a field: read when the property is asked for.

## 6. State the wrapper may keep

Only what Core cannot give back or must not be re-made on each read: the `Typeface` and the `OpenTypeFeature[]` that were set on a `ShapingEngine` (identity, cheaper than re-wrapping), the frame and renderer a `LineLocator` was made with (Core does not retain the frame), the handlers in the tables of `Callbacks.ts`, and the `ImageCache` attached to a glyph image. Everything else is asked from Core each time (`FrameResolver.typesetter`, `Renderer.glyphCache`, every number and enum).

## 7. Mapping rules (Core to TypeScript)

| Core | Wrapper |
|------|---------|
| `index` + `length` parameters (never `TRRange`) | `fromIndex`/`toIndex` parameters, `startIndex`/`endIndex` properties; the wrapper passes `index` and `toIndex - fromIndex`. Validate order with `checkOrderedRange`; the upper bound is Core's (it knows the text): a `NULL`/`TRInvalidIndex` result for a range becomes a `RangeError` |
| `TRInvalidIndex` / `NULL` for none | `-1` for an index; `undefined` for an optional object; `RangeError` for an invalid range or index; `Error` for a failed creation |
| `TRBoolean` out-flag (`…Distance(…, &distance)`) | allocate the out value on the stack, throw `RangeError` when the flag is false |
| `*Ptr()` + count | `List` over the buffer (section 5), `NumberList`/`PointList` for numbers and points |
| callbacks with `TRBoolean *stop` | arrays from `collect()`; sinks (`PathSink`) and delegates for the rest |
| `TRStringView` | `string | undefined` through `readStringView`; text is always UTF-16 (`TRStringEncodingUTF16`), so indices are JavaScript string indices |
| `TRColor` | `Color` = unsigned `0xAARRGGBB` number (`>>> 0` after reading a signed result); `Color.toCss()` for canvas |
| Core enums | numeric `enum` whose values are Core's constants (one file `enums.ts` per package), PascalCase members |
| `TRPoint`/`TRSize`/`TRRect`/`TRAffineTransform` | `Point`/`Size`/`Rect {x,y,width,height}`/`AffineTransform` (`geometry.ts`) |
| `TRPath` | `Path` (verbs + coordinates, a `PathSink`) made by `Path.takeNative(handle)`, which copies the outline and releases the reference; `toSvgPathData()`, `toPath2D()` |
| `TRTag` | `SfntTag` = number, `SfntTag.make('head')`, `SfntTag.toString(tag)` |
| Stroke, skew | `strokeRadius` and `skewX` go to Core as they are, default 0.5 and 0 |
| Glyph images | `Renderer.getGlyphImage/getStrokeImage` return an owning `GlyphImage?`; placements own their images (the trampoline retains them) |
| Truncation | `isTruncationEnabled` is `TRFrameResolverSetTruncationEnabled`; place and mode do not enable it |
| `maxLines` 0 | `maxLines: number | undefined` |
| Glyph run data | `glyphIds: NumberList<UInt16>`, `glyphOffsets: PointList`, `glyphAdvances: NumberList<Float>`, `clusterMap: NumberList<UInt32>` |

Naming: classes PascalCase, members camelCase, no `I` prefix, no default exports, `T` prefix only where the DOM clashes or the other wrappers have it (`TText`, `TMutableText`; `Text` is a DOM class). Booleans read as `is…`/`has…`. Names follow Android where Core words are not clearer; `getXxx(...)` methods for things that take arguments or make an object, properties for the rest.

## 8. Text attributes

`TText` and `TMutableText` wrap `TRText`/`TRMutableText` with UTF-16. Attributes are one typed object, `TextAttributes = RunAttributes & ParagraphAttributes` (camelCase names of the `TRAttribute*` types). `TMutableText.setAttributes(fromIndex, toIndex, attributes)` writes one `TRAttribute` per member; `removeAttributes(from, to, ...names)`; `getAttributeRun(index)` returns `{ attributes, length }` read with `readAttributeList`. `userData` is a number (an application token, never a JavaScript object). `fontFeatures` accepts a `FontFeatures` or an array; `languageTag` takes an OpenType tag (`ShapingEngine.getLanguageTag('ur')`). To support a new Core attribute: add it to `ATTRIBUTES` in `TextAttributeCodec.ts` with its kind, to `RunAttributes` or `ParagraphAttributes`, and a test in `tests/Text.test.ts` that stores and reads it back.

`Replacement` takes a `ReplacementDelegate { computeRoom(layoutWidth), draw?(context, bounds) }`; the state lives in `replacements` until Core finalizes the replacement (no cycle between a wrapper and its state, so the wrapper can be collected).

## 9. Drawing

Core draws; the wrapper provides primitives. `GlyphRun.draw`, `ComposedLine.draw`, `ComposedFrame.draw` call `TRGlyphRunDraw`, `TRComposedLineDraw`, `TRComposedFrameDraw` through `renderer.drawInto(context, call)`, which installs `TRDrawCallbacks` (`drawGlyphImage`, `fillRect`, `drawReplacement`, `beginShadow`, `endShadow`; no `drawGlyphPath`) on the renderer for the call and takes them away after, even when an error is thrown. Origins follow Core (run: start on its baseline; line: origin of its container; frame: top left). `CanvasPainter` turns callbacks into `CanvasRenderingContext2D`/`OffscreenCanvasRenderingContext2D` calls: alpha images are tinted per color and cached on the glyph image, ARGB images are unpremultiplied, clips use `save/rect/clip/restore`, shadows use `shadowBlur` and offsets. Core multiplies positions by `renderScale`; the transform of the context applies after, so a scaled context needs `renderScale = 1`. `Renderer.drawGlyphs(context, run)` draws a run at the origin through placements. The image factory can be replaced for tests (`setImageSourceFactory`).

## 10. Updating the wrapper after a Core change

1. **Identify the change.** `git diff <old>..<new> -- Headers/Tehreer` (public API is what matters). Read the Doxygen of every changed function: ownership, range semantics, out parameters, `stop`.
2. **Regenerate and rebuild.** `bash scripts/build-wasm.sh` (regenerates `exports.json` and `NativeFunctions.ts`, then builds into `src/wasm/`). Core must be at the commit to adopt; the script reads the working tree of `../Tehreer-Core`, committed or not. A removed or renamed function shows up as a type error in the wrapper, a new one as a new member of `NativeFunctions`.
3. **Fix the call sites.** `npx tsc -p tsconfig.json --noEmit`, then `npx tsc -p tests/tsconfig.json --noEmit`.
4. **Structs.** If a struct changed, update `Structs.ts` and `tw_layout` in `native/Module.c`; `tests/Structs.test.ts` fails until they agree with the compiler.
5. **Adopt, don't just port.** For each new capability: does the wrapper hold logic that Core now owns? Delete it. Does Core expose something that deserves a member (new attribute, getter)? Add it with the names of section 7 and a test. Keep Android and Cocoa in step: same capability, same name where the language allows.
6. **Test** (section 11), then update `README.md` if a convention or a limitation changed.
7. **Commit** only when asked: tag `[lib]`, `[test]`, `[native]` or `[docs]`, imperative summary, stage files explicitly (never `node_modules`, `build`, `dist`, `src/wasm/tehreer.*`; they are git-ignored).

## 11. Testing

```bash
npm test                   # tsc -p tests/tsconfig.json, copies the module, node --test build/tests/
npm run typecheck          # library and tests
npm run build              # dist/: JavaScript, declarations, the module
```

Run one file: `npx tsc -p tests/tsconfig.json && node scripts/copy-wasm.mjs build/src/wasm && node --test build/tests/Layout.test.js`.

- Fixtures are Core's fonts (`Tests/Fonts`: `Roboto-Regular.abc.ttf`, `Roboto-Variable.abc.ttf`, `RocherColorGX.abc.ttf`, `NotoNastaliqUrdu-Regular.ttf`, …), read through `tests/Support.ts` (`ready()`, `loadFont()`, `RecordingContext`).
- Drawing is tested with a `RecordingContext` and `setImageSourceFactory`; callbacks, errors thrown from handlers, cached image data and replacement state are checked for being released (`imageData.size`, `replacements.size`).
- Every suite calls `await ready()`; `Uninitialized.test.ts` runs in its own process to check the error before `initialize()`.
- One test is skipped on purpose (bitmap emoji need libpng).
- **Browser check.** Node has no canvas. After a change to drawing, build (`npm run build`), serve `dist/` and a small page from a scratch directory (`python3 -m http.server`), open it in the browser pane, draw a frame into a real `<canvas>` and look at it. Remember `dist/wasm` must sit next to `dist/index.js`.

## 12. Gotchas

- `Module.HEAP*` are replaced when the memory grows; take a view only when you use it, after any allocation (`malloc`, `withUtf16`, a call into Core). The 18-million-character test in `Text.test.ts` and the growth test in `Structs.test.ts` guard this.
- A float that Core returns arrives as a double of a 32-bit float: compare with a tolerance unless the value is exactly representable.
- Unsigned results (`TRColor`, `TRTag`) come back signed from WebAssembly when the top bit is set: `>>> 0`.
- `stripInternal` removes `@internal` members from the declarations: never mark a member `@internal` that public code needs.
- With `verbatimModuleSyntax`, a type-only import must be `import type`. Imports end in `.js` (NodeNext).
- Constructor overloads with the `adopt` token: the implementation signature must accept both forms; keep `/** @internal */` on the token overload.
- A subclass constructor that calls `super` in two branches (`TMutableText`) compiles, but code before `super` must not touch `this`.
- Do not change the typeface of a renderer, the settings of a shaping engine or a mutable text while something is drawing or shaping with it.
- Core's `TRShapingEngineGetLanguageTag(engine)` reads the tag; the converter from a name is `TRShapingEngineGetLanguageTagForName`.
- Emscripten exports are plain functions: `Module._TRFoo` may be passed around without binding. `addFunction` signatures use `i`/`f`, not C types; a wrong signature fails at the first call from Core.
- `npm install` is allowed only for the existing dev dependencies; ask before adding anything.
