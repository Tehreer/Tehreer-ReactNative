# Binding generator

`generate-bindings.mjs` reads the public headers of Tehreer Core (`Libraries/TehreerCore/Headers/Tehreer/TR*.h`) and writes

- `cpp/generated/` the C++17 JSI glue: one `<Header>Bindings.cpp` per Core header, plus `Bindings.h/.cpp` (the `InstallBindings` entry point), `Structs.h` (struct codecs and `kStructCodecs`, the table of them by name), `Layouts.h` (compile-time layout checks), `Handles.h` (retain/release traits) and `GeneratedSupport.h` (the contract with the runtime);
- `src/internal/NativeFunctions.ts` the typed signature of every binding, with the C declaration in its comment.

```bash
npm run generate          # write the files
npm run generate:check    # exit 1 if the files on disk differ from a generation
node scripts/generate-bindings.mjs --core <Core directory>   # another Core checkout
```

No dependency, no download. The generator is plain Node (`>=22.18`).

## Generated files are checked in

The files are **checked in and never edited by hand.** Each carries `GENERATED FILE. DO NOT EDIT.` and the command that writes it.

Why checked in: `tsc` needs `NativeFunctions.ts` on a fresh clone, and the native builds (Gradle, CocoaPods) compile `cpp/generated` without running Node. The cost is that the files can fall behind the Core submodule, so:

- `tests/generatedOutput.test.ts` (part of `npm test`) runs the generator in memory and fails with `run npm run generate` if the checked-in files differ, are missing, or if a generated file is left over;
- bumping the Core pin (`scripts/sync-core`) is followed by `npm run generate` and the result is committed in the same change.

The generator only deletes files in `cpp/generated` that carry the marker, so a file written by hand there is never removed (but should not exist: the directory belongs to the generator).

## Layout of the generator

| Module | Role |
|--------|------|
| `generator/parser.mjs` | Reads one header: typedefs, structs, unions, function pointer types, public functions and their Doxygen `@param` texts. Throws `ParseError` on a public declaration it cannot read. |
| `generator/model.mjs` | Turns declarations into a binding plan and decides what can be expressed. Throws `GeneratorError` naming the function and the type. |
| `generator/emitCpp.mjs`, `generator/emitTs.mjs` | Print the plan. They make no decisions. |
| `generator/config.mjs` | What the headers do not say: `EXCLUDED`, `MANUAL`, `BOUNDS`, `SCALAR_OUTS`, `POINTER_COUNTS`. |
| `generator/generate.mjs`, `generator/files.mjs` | Header directory to files; writing and checking them. |

`*.d.mts` files next to them type the modules for the TypeScript tests.

## What a binding does

The generated glue converts arguments, calls one `TR*` function and converts the result. It reads and writes JavaScript values only through the `tehreer::marshal` functions that `GeneratedSupport.h` declares; **the C++ runtime (`cpp/runtime`) defines them** (numbers, handles, strings, buffers, pointer views, `Fail`). The conventions are written at the top of `NativeFunctions.ts`. In short:

| Core | JavaScript |
|------|------------|
| integers, floats, `TRTag`, `TRColor`, `TRGlyphID`, enumerations | `number` (`TRInvalidIndex` is `-1` both ways) |
| `TRBoolean` | `boolean` |
| `TR*Ref` | opaque `Handle<"TRGroup">`; `NULL` is `undefined`; a parameter documented as accepting `NULL` takes `undefined` |
| struct by value (`TRPoint`, `TRRect`, ...) | object with the member names |
| `const char *`, `const TRStringView *` | `string` |
| `const void *` / `const T *` with a count | `ArrayBuffer` or typed array, checked against the count; array of structs: array of objects |
| `const T *` returned by a getter | `PointerView<"T">` (an opaque host object: address, element, owner and the element count that `POINTER_COUNTS` names for the getter, which the runtime never lets a read exceed; `src/collections` reads it) |
| `T *` that Core fills in | not a parameter; part of the result |
| enumeration with a callback | the collected items, as an array |

A getter that returns a pointer into Core memory needs an entry in `POINTER_COUNTS` (`{ TRTypefaceGetNamedStylesPtr: "TRTypefaceGetNamedStyleCount({typeface})" }`): the expression is evaluated after the getter and recorded in the `PointerView`. The generator stops for a getter without one, for an entry that names no function or parameter, and for one that is not a pointer getter, so a new getter cannot be bound without saying how long its array is.

A function that returns `TRBoolean` and fills in values gives `undefined` for `TRFalse`. One that returns anything else and fills in values gives `{ result, ...values }`.

**Ownership** follows Core's naming: a function with `Create` or `Copy` in its name, and `Retain`, returns a reference the handle adopts; `Get` returns one the handle retains first. Any other name returning a reference is refused (ownership unknown). `TR*Release` is not bound: a handle releases its single reference on `dispose()` or collection, and a release from JavaScript would free it twice.

**Collecting callbacks never run JavaScript the caller wrote.** The generated trampolines turn each call into an item and append it to a `marshal::Collector`; if making an item throws, the first error is kept, `stop` is set, and the error is rethrown when the Core function returns.

A collecting callback is given the address of a `marshal::Collector` on the stack as its `userData`. That is an exception to the rule of the skill (section 4) that `userData` is a key into a handler table, and it is safe because the enumeration is synchronous and Core keeps no callback after the call returns. Callbacks that Core keeps and calls later (`TRReplacementCreate`, bound by hand in `cpp/runtime/ReplacementBindings.cpp`) use the handler table, and run a handler that the app wrote, which can throw.

**Every binding checks for such an error.** Right after the Core call (before any result is converted) the generated code calls `marshal::RethrowCallbackError(rt)`, which throws the error that a trampoline of the runtime recorded and does nothing otherwise. A function that returns a reference the caller owns (`Create`, `Copy`, `Retain`) calls `RethrowCallbackError(rt, result)`, which releases that reference first so a failed callback leaks nothing. `GeneratedSupport.h` declares `HasCallbackError` and `ThrowCallbackError`, which `cpp/runtime/Callbacks.cpp` defines; `tests/callbacks.test.ts` requires the call after the call to Core in every binding, and `marshal::BeginCall()` as the first statement of every binding (it forgets an error that was recorded but never thrown, so a stale one cannot surface from an unrelated call). `RethrowCallbackError` also lets the runtime destroy the handlers that were queued (`DrainRetiredHandlers`).

**Handles remember mutability.** A handle made from a `const` reference type (`TRTextRef`) is refused where a non-const type (`TRMutableTextRef`) is expected, so an object Core documents as immutable is never mutated; a mutable handle is accepted for both.

**Buffers cannot overrun.** The count of every buffer is read from the signature (`count`, `size`, `capacity`, `length` next to the pointer), or from `BOUNDS`, and the binding checks `count * unit <= byteLength` before calling Core. The unit of a `void *` is bytes (`size`, `capacity`), the code unit of the `encoding` parameter, or the code unit of the text in the first parameter. If none applies the generator stops.

## Struct layouts

`Layouts.h` has, for every struct and union that a Core header declares (not only the ones that are converted: the draw callbacks, the attributes and what a typeface lists are read by native code too), a second declaration of it printed from the parsed header, and `static_assert`s that compare the two: `sizeof`, `alignof`, that the struct is standard layout, the type of every member (`std::is_same` of `decltype`) and `offsetof` of every member of a struct. A header that moves, retypes, adds, removes or renames a member without `npm run generate` stops the compiler, and the generated glue and the runtime read members by name, so they never depend on an offset. `Structs.h` includes it, so every file of the glue is checked. The generator, not a hand-written file, owns these descriptions so that a stale one cannot exist; `cpp/runtime/StructCodecs.cpp` adds only the conversion that cannot be printed (`TRAttribute`, whose union member depends on `type`) and relies on the same checks. TypeScript has no offsets.

**What the checks cannot see.** The mirror is printed from the parsed header, so it proves that the header and the generated code agree, and that the compiler lays the real struct out as the mirror: sizes, alignments, member types and offsets. It does not see (1) tail padding: a member added after the last one, into padding, changes no offset and no size; (2) a union member smaller than the largest, which changes neither; (3) a change below the typedef of a member. For (3) `Layouts.h` also has `TEHREER_CHECK_SCALAR(Name, base, width)` for every scalar typedef (`TRFloat`, `TRUInt16`, `TRGlyphID`, `TRUInteger`, ...): the typedef must still be the fundamental type the header names, with the width the members were laid out with (`sizeof(void *)` for the pointer-sized ones). (1) and (2) are not detected; Core's own tests are where a struct change is expected to be caught.

`tests/structLayouts.test.ts` compiles `Layouts.h` against copies of Core's headers that are edited the way a change of Core could (a member added, retyped, swapped, renamed, a union that grows, a callback whose signature changes) and requires each to fail.

## What is not generated

| Set | Functions | Why |
|-----|-----------|-----|
| `EXCLUDED` | `TRVersionGetString`, `TRTextGetSheenBidiText` | declared but not implemented / needs SheenBidi's text API |
| `MANUAL` | draw callbacks and user data of the renderer, native data of a glyph image, `TRReplacementCreate`, `TRTextSetAttribute`, `TRTypesetterCreate` | C function pointers that stay native, retained callbacks that need the handler table (`TRReplacementCreate`, the only one, bound in `cpp/runtime/ReplacementBindings.cpp`), and the union `TRAttributeValue` written by the attribute codec (`TRTextSetAttribute`, `TRTypesetterCreate`, bound in `cpp/runtime/TextBindings.cpp`); `cpp/runtime` binds them by hand |
| releases | every `TR*Release` | see Ownership |

A name in `EXCLUDED`, `MANUAL` or `BOUNDS` that no header declares stops the generator, so these lists cannot go stale quietly.

## SheenBidi

The parser and the plan take the public macro, the name prefix and the boolean type as options, so they read SheenBidi's `SB_PUBLIC` headers, but **the generator does not produce the SheenBidi bindings.** An `SBCodepointSequence` holds a raw pointer into a string, and SheenBidi keeps that pointer inside the algorithm, the paragraphs and lines made from it, and the locators; the generator stops on such a struct (`tests/generatorModel.test.ts`) instead of guessing. The classic API is bound by hand in `cpp/runtime/SheenBidiBindings.cpp`, in the way `TRReplacementCreate` is, and typed in `src/internal/SheenBidiFunctions.ts`.

How the text reaches SheenBidi: a JavaScript `string` is copied to UTF-16 in native memory (`BidiText`, immutable, shared). Every handle (`Owner`) holds a share of it, so a paragraph or a line that was made from an algorithm keeps the text after the algorithm's handle is disposed, a script locator holds the text it was loaded with, and a mirror locator holds the text of the line it was loaded with (JavaScript never passes a `stringBuffer`). The copy is freed with the last share, on whatever thread that is. Debug builds expose `testGetBidiTextCount()`, the number of copies alive, for the device tests.

`scripts/generator/sheenbidi.mjs` is the contract: the classic headers, the functions that are not bound with the reason (the five `Release` functions), and the headers that are not part of the classic API (`SBAllocator.h` and the experimental text API). `tests/sheenbidi.test.ts` compares it with the headers in `Libraries/Dependencies/SheenBidi` (skipped when `npm run setup` has not run), the table of bindings in the C++ and the declarations in TypeScript, so a function that a SheenBidi update adds fails the test until it is bound or listed.

Differences from the Core bindings: a codepoint sequence is a string (UTF-16 only), `SBMirrorLocatorLoadLine` takes no string buffer, the agents of the locators are returned as copies (`SBScriptLocatorGetAgent`, `SBMirrorLocatorGetAgent`), and `SBLineGetRunsPtr` is a `PointerView` of `SBRun`, which the runtime reads with its own codec (`SheenBidiRunCodec`, listed by `FindStructCodec`). A level (`SBLevel`) above 125 that is not one of the two default directions is a `RangeError`, where SheenBidi would take it for a default.

### Unicode enums

`generate-unicode-enums.mjs` (a port of Tehreer-Web's) writes `src/unicode/enums.ts` (`BidiClass`, `GeneralCategory`, `Script` as constant objects with the values of SheenBidi's headers) from `SBBidiType.h`, `SBGeneralCategory.h` and `SBScript.h`:

```bash
npm run generate:unicode         # write src/unicode/enums.ts
npm run generate:unicode:check   # exit 1 if it differs from a generation
node scripts/generate-unicode-enums.mjs --sheenbidi <SheenBidi directory>
```

The printing is in `generator/unicodeEnums.mjs`. The file is checked in, and `tests/unicodeEnums.test.ts` fails when it is stale (skipped without the fetched sources). A header that changes shape (no constants, a repeated name or value) stops the generator.

## Compile check

`npm test` compiles the generated C++ with `clang++ -std=c++17 -fsyntax-only -Wall -Wextra -Werror` (or `g++`, `c++`, or `$CXX`) against Core's headers and a stub of the JSI declarations in `tests/fixtures/jsi-stub/`, both for a small sample (`tests/fixtures/sample`: a version, an object lifecycle, a struct by value, an out parameter, a text buffer, a pointer view and a callback) and for all checked-in files. The tests skip with a message when no compiler is found. The stub only declares what the glue uses; it is replaced by React Native's `<jsi/jsi.h>` once the native build supplies it, which is the first thing to verify then.

## Updating after a Core change

1. `scripts/sync-core` to bump the submodule.
2. `npm run generate`. A header the generator cannot express stops it with the function and the type; extend the generator, or add the function to `MANUAL` with a reason.
3. Review the diff of `cpp/generated` and `NativeFunctions.ts`, fix the runtime and the TypeScript that use them, commit everything together.

## Known limitations

- The parser drops preprocessor lines without evaluating them, so a `TR_PUBLIC`
  declaration inside `#if 0` (or any conditional) is still bound. No Core header
  does this today; if one starts to, the parser must learn to reject it.
- The SheenBidi bindings are written by hand (see the SheenBidi section), so the generator does not notice a change of SheenBidi's headers; `tests/sheenbidi.test.ts` does.

# Packaging (`pack-vendor.mjs`, `test-packed.mjs`)

The podspec and `android/CMakeLists.txt` compile Core and its dependencies from `Libraries/`, and nothing may be downloaded when an app is built, so the npm tarball carries them.

- `npm pack` and `npm publish` run the `prepack` hook (`node scripts/pack-vendor.mjs prepack`). It fails with a message that says what to do when the Core submodule or `Libraries/Dependencies` is missing, empty or incomplete (`git submodule update --init`, `npm run setup`). Otherwise it puts a filtered copy of `Libraries/Dependencies` in its place and keeps the full tree in `Libraries/.Dependencies.full`; the `postpack` hook swaps them back. If a pack is killed half way, the next `prepack` or `node scripts/pack-vendor.mjs postpack` restores the full tree. It never changes `Libraries/TehreerCore`.
- The allowlist is in `scripts/packaging/Vendor.mjs`: sources and headers (`.c .cc .cpp .h .hh .hpp .inc`), the few templates and CMake files that the CMake projects read, and every license, notice, authors and copying file of a dependency. Tests, docs, tools, Python and data files are left out. Core is packed by the `files` field of `package.json` (headers, sources, `CMakeLists.txt`, its two templates, license and notice; no tests, fonts or demo).
- When a dependency is bumped and a CMake project starts to read another file, `npm run test:packed` fails (the build of the packed copy) and the file is added to the allowlist.
- `node scripts/pack-vendor.mjs list` prints the files that would be packed, `check` only verifies.
- `npm run test:packed` (`test-packed.mjs`) packs into `$TMPDIR/tehreer-rn-dev-42`, checks the tarball, builds Core with its CMake project from the extracted package, copies `example/` there with the extracted package in `node_modules`, and runs `gradlew :app:assembleDebug` for one ABI (offline) and `pod install` (`--ios-build` also runs `xcodebuild` of the pod). Options are in the header of the script. It needs about 4 GB of free disk space and deletes its scratch folder at the end.
