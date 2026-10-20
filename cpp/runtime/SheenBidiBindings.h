#pragma once

#include "../generated/Structs.h"

#include <jsi/jsi.h>

namespace tehreer {

/**
 * Binds the classic API of SheenBidi (`SBAlgorithm`, `SBParagraph`, `SBLine`, `SBScriptLocator`,
 * `SBMirrorLocator`, `SBCodepoint` and `SBCodepointSequence`) by hand. The generator does not
 * produce these: an `SBCodepointSequence` holds a raw pointer into a string, and SheenBidi keeps
 * that pointer inside the algorithm, its paragraphs, its lines and the locators, so the native side
 * has to own a copy of the string for as long as any of them lives. See `scripts/generator/sheenbidi.mjs`
 * for the list of what is bound and what is not, and `SheenBidiBindings.cpp` for how the copy is kept.
 */
void InstallSheenBidiBindings(facebook::jsi::Runtime &runtime, facebook::jsi::Object &target);

/**
 * The codec of `SBRun` (`{ offset, length, level }`), which `readPointerStructs` uses to read the
 * runs of a line out of SheenBidi's memory. `FindStructCodec` lists it with the generated ones.
 */
const generated::StructCodec &SheenBidiRunCodec();

#ifndef NDEBUG
/** The `test*` functions for SheenBidi, which only debug builds contain. */
void InstallSheenBidiTestHooks(facebook::jsi::Runtime &runtime, facebook::jsi::Object &target);
#endif

} // namespace tehreer
