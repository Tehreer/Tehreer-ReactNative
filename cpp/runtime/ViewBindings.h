#pragma once

#include <jsi/jsi.h>

namespace tehreer {

/**
 * Binds what the Fabric views need from JavaScript (see `src/views/ViewText.ts`):
 *
 * - `registerViewText(text, typeface | undefined, typeSize)` gives the shadow node an immutable text
 *   with the defaults of its typesetter and returns its id, or 0 when the text holds a replacement
 *   that is not static (the measure thread cannot run its JavaScript). `unregisterViewText(id)`
 *   drops the registry's share.
 * - `createStaticReplacement(kind, ascent, descent, extent, rects)` makes a replacement whose room
 *   and drawing are data (`rects` is a flat array of x, y, width, height, color).
 * - `acquireViewFrame(frameId)` hands out a reference of the frame that a view paints, or
 *   `undefined` when it is gone, so that JavaScript asks Core about the very same frame.
 */
void InstallViewBindings(facebook::jsi::Runtime &runtime, facebook::jsi::Object &target);

#ifndef NDEBUG
/** `testGetViewCounts()`: how many view texts and static replacements are alive. */
void InstallViewTestHooks(facebook::jsi::Runtime &runtime, facebook::jsi::Object &target);
#endif

} // namespace tehreer
