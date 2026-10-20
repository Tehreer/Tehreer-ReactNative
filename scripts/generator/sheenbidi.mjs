// Copyright (C) 2026 Muhammad Tayyab Akram
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// What the wrapper does with the public functions of SheenBidi. The generator does not produce
// them: an `SBCodepointSequence` holds a raw pointer into a string that SheenBidi keeps, so
// cpp/runtime/SheenBidiBindings.cpp binds them by hand and owns a copy of each string. This file
// is the other half of that contract. tests/sheenbidi.test.ts compares it with the headers, with
// the table of bindings in the C++ and with the declarations in TypeScript, so a function that a
// SheenBidi update adds fails the test until it is bound or listed here with a reason.

/** The headers of the classic API, whose functions are all bound unless `SHEENBIDI_EXCLUDED` says why not. */
export const SHEENBIDI_CLASSIC_HEADERS = [
  "SBAlgorithm.h",
  "SBCodepoint.h",
  "SBCodepointSequence.h",
  "SBLine.h",
  "SBMirrorLocator.h",
  "SBParagraph.h",
  "SBScript.h",
  "SBScriptLocator.h",
  "SBVersion.h",
];

const RELEASE = "a handle releases its one reference when it is disposed or collected, and a release from JavaScript would free it twice";

/** Functions of the classic headers that are not bound, with the reason. */
export const SHEENBIDI_EXCLUDED = new Map([
  ["SBAlgorithmRelease", RELEASE],
  ["SBParagraphRelease", RELEASE],
  ["SBLineRelease", RELEASE],
  ["SBScriptLocatorRelease", RELEASE],
  ["SBMirrorLocatorRelease", RELEASE],
]);

/**
 * Headers whose functions are not bound at all, with the reason. They are not part of the classic
 * API that the `unicode` package wraps (the issue names the algorithm, paragraph, line, run, script
 * locator, mirror locator, code point and the three property enumerations).
 */
export const SHEENBIDI_OUT_OF_SCOPE = new Map([
  ["SBAllocator.h", "replaces the allocator of the whole process, which Core and the other libraries share"],
  ["SBAttributeInfo.h", "belongs to the experimental text API (SBText)"],
  ["SBAttributeList.h", "belongs to the experimental text API (SBText)"],
  ["SBAttributeRegistry.h", "belongs to the experimental text API (SBText)"],
  ["SBText.h", "the experimental text API, a different design from the classic algorithm/paragraph/line objects"],
  ["SBTextConfig.h", "belongs to the experimental text API (SBText)"],
  ["SBTextIterators.h", "belongs to the experimental text API (SBText)"],
]);
