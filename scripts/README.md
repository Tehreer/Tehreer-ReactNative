# Binding generator

`generate-bindings.mjs` reads the public headers of Tehreer Core (`Libraries/TehreerCore/Headers/Tehreer/TR*.h`) and writes

- `cpp/generated/` the C++17 JSI glue: one `<Header>Bindings.cpp` per Core header, plus `Bindings.h/.cpp` (the `InstallBindings` entry point), `Structs.h` (struct codecs), `Handles.h` (retain/release traits) and `GeneratedSupport.h` (the contract with the runtime);
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
| `generator/config.mjs` | What the headers do not say: `EXCLUDED`, `MANUAL`, `BOUNDS`. |
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
| `const T *` returned by a getter | `PointerView<"T">` (address and owner; its length is the matching count function) |
| `T *` that Core fills in | not a parameter; part of the result |
| enumeration with a callback | the collected items, as an array |

A function that returns `TRBoolean` and fills in values gives `undefined` for `TRFalse`. One that returns anything else and fills in values gives `{ result, ...values }`.

**Ownership** follows Core's naming: a function with `Create` or `Copy` in its name, and `Retain`, returns a reference the handle adopts; `Get` returns one the handle retains first. Any other name returning a reference is refused (ownership unknown). `TR*Release` is not bound: a handle releases its single reference on `dispose()` or collection, and a release from JavaScript would free it twice.

**Callbacks never run JavaScript the caller wrote.** The generated trampolines turn each call into an item and append it to a `marshal::Collector`; if making an item throws, the first error is kept, `stop` is set, and the error is rethrown when the Core function returns.

A collecting callback is given the address of a `marshal::Collector` on the stack as its `userData`. That is an exception to the rule of the skill (section 4) that `userData` is a key into a handler table, and it is safe because the enumeration is synchronous and Core keeps no callback after the call returns. Callbacks that Core keeps and calls later (such as `TRReplacementCreate`, which is bound by hand) use the handler table.

**Handles remember mutability.** A handle made from a `const` reference type (`TRTextRef`) is refused where a non-const type (`TRMutableTextRef`) is expected, so an object Core documents as immutable is never mutated; a mutable handle is accepted for both.

**Buffers cannot overrun.** The count of every buffer is read from the signature (`count`, `size`, `capacity`, `length` next to the pointer), or from `BOUNDS`, and the binding checks `count * unit <= byteLength` before calling Core. The unit of a `void *` is bytes (`size`, `capacity`), the code unit of the `encoding` parameter, or the code unit of the text in the first parameter. If none applies the generator stops.

## What is not generated

| Set | Functions | Why |
|-----|-----------|-----|
| `EXCLUDED` | `TRVersionGetString`, `TRTextGetSheenBidiText` | declared but not implemented / needs SheenBidi's text API |
| `MANUAL` | draw callbacks and user data of the renderer, native data of a glyph image, `TRReplacementCreate`, `TRTextSetAttribute`, `TRTypesetterCreate` | C function pointers that stay native, retained callbacks that need the handler table, and the union `TRAttributeValue` written by the attribute codec; `cpp/runtime` binds them by hand |
| releases | every `TR*Release` | see Ownership |

A name in `EXCLUDED`, `MANUAL` or `BOUNDS` that no header declares stops the generator, so these lists cannot go stale quietly.

## SheenBidi

The parser and the plan take the public macro, the name prefix and the boolean type as options, so they read SheenBidi's `SB_PUBLIC` headers, but **SheenBidi bindings are not generated yet.** The classic headers are not part of this checkout (they are fetched by `scripts/fetch-deps`), and their `SBCodepointSequence` holds a raw string buffer, which needs a decision about how text reaches the `unicode` package. The generator stops on it instead of guessing (`tests/generatorModel.test.ts` covers this). That decision belongs to the issue that adds the `unicode` package.

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
- SheenBidi bindings are not generated yet (see the PR description).
