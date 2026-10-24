#pragma once

#include <jsi/jsi.h>

namespace tehreer {

/**
 * Binds what the views need from JavaScript (see `src/views/`):
 *
 * - `registerTypesetter(typesetter)` gives the native side of a view the typesetter that JavaScript
 *   made, by an id for the `typesetterId` prop; `unregisterTypesetter(id)` drops the table's
 *   reference (a view keeps the one it took).
 * - `createReplacementHolder(kind, ascent, descent, extent, rects)` makes a replacement whose room
 *   and drawing are data (`rects` is a flat array of x, y, width, height and color), because a
 *   replacement cannot call JavaScript from the threads that lay out and draw a view.
 */
void InstallViewBindings(facebook::jsi::Runtime &runtime, facebook::jsi::Object &target);

#ifndef NDEBUG
/** `testGetViewCounts()`: how many typesetters are registered and replacement holders are alive. */
void InstallViewTestHooks(facebook::jsi::Runtime &runtime, facebook::jsi::Object &target);
#endif

} // namespace tehreer
