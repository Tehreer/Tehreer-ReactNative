/*
 * Copyright (C) 2026 Muhammad Tayyab Akram
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// GENERATED FILE. DO NOT EDIT.
// Written by scripts/generate-bindings.mjs from Libraries/TehreerCore/Headers/Tehreer.
// Change the generator or the Core header, then run `npm run generate`.

#ifndef TEHREER_GENERATED_BINDINGS_H
#define TEHREER_GENERATED_BINDINGS_H

#include "GeneratedSupport.h"

namespace tehreer {
namespace generated {

/** Adds every binding to `target`, a property for each Core function with the name of the function. */
void InstallBindings(jsi::Runtime &rt, jsi::Object &target);

void InstallTRAttributeList(jsi::Runtime &rt, jsi::Object &target);
void InstallTRComposedFrame(jsi::Runtime &rt, jsi::Object &target);
void InstallTRComposedLine(jsi::Runtime &rt, jsi::Object &target);
void InstallTRFontFeatures(jsi::Runtime &rt, jsi::Object &target);
void InstallTRFontFile(jsi::Runtime &rt, jsi::Object &target);
void InstallTRFrameResolver(jsi::Runtime &rt, jsi::Object &target);
void InstallTRGlyphCache(jsi::Runtime &rt, jsi::Object &target);
void InstallTRGlyphImage(jsi::Runtime &rt, jsi::Object &target);
void InstallTRGlyphRun(jsi::Runtime &rt, jsi::Object &target);
void InstallTRLineLocator(jsi::Runtime &rt, jsi::Object &target);
void InstallTRPath(jsi::Runtime &rt, jsi::Object &target);
void InstallTRRenderer(jsi::Runtime &rt, jsi::Object &target);
void InstallTRReplacement(jsi::Runtime &rt, jsi::Object &target);
void InstallTRShapingEngine(jsi::Runtime &rt, jsi::Object &target);
void InstallTRShapingResult(jsi::Runtime &rt, jsi::Object &target);
void InstallTRText(jsi::Runtime &rt, jsi::Object &target);
void InstallTRTypeface(jsi::Runtime &rt, jsi::Object &target);
void InstallTRTypefaceManager(jsi::Runtime &rt, jsi::Object &target);
void InstallTRTypesetter(jsi::Runtime &rt, jsi::Object &target);

} // namespace generated
} // namespace tehreer

#endif
