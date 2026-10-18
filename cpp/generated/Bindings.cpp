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

#include "Bindings.h"

namespace tehreer {
namespace generated {

void InstallBindings(jsi::Runtime &rt, jsi::Object &target) {
    InstallTRAttributeList(rt, target);
    InstallTRComposedFrame(rt, target);
    InstallTRComposedLine(rt, target);
    InstallTRFontFeatures(rt, target);
    InstallTRFontFile(rt, target);
    InstallTRFrameResolver(rt, target);
    InstallTRGlyphCache(rt, target);
    InstallTRGlyphImage(rt, target);
    InstallTRGlyphRun(rt, target);
    InstallTRLineLocator(rt, target);
    InstallTRPath(rt, target);
    InstallTRRenderer(rt, target);
    InstallTRReplacement(rt, target);
    InstallTRShapingEngine(rt, target);
    InstallTRShapingResult(rt, target);
    InstallTRText(rt, target);
    InstallTRTypeface(rt, target);
    InstallTRTypefaceManager(rt, target);
    InstallTRTypesetter(rt, target);
}

} // namespace generated
} // namespace tehreer
