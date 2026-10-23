#pragma once

#include <jsi/jsi.h>

namespace tehreer {

/**
 * Binds the functions of Core that keep JavaScript handlers (`TRReplacementCreate`, the only one
 * that keeps callbacks and `userData` after it returns; see `MANUAL` in the generator's config),
 * and `invokeReplacementDraw`, which finds the handler of a replacement for a painter. The native
 * data of a glyph image never holds JavaScript: it stays native.
 */
void InstallCallbackBindings(facebook::jsi::Runtime &runtime, facebook::jsi::Object &target);

/**
 * Binds `installDrawContext` and `restoreDrawContext`, which put the draw callbacks of the
 * JavaScript drawing surface (`DrawingContext`) on a renderer for the length of one draw call and
 * take them off again. Unlike the replacement's, these callbacks are never kept after the call: the
 * handler lives only between the two functions.
 */
void InstallDrawBindings(facebook::jsi::Runtime &runtime, facebook::jsi::Object &target);

#ifndef NDEBUG
/** The `test*` functions for callbacks, which only debug builds contain. */
void InstallCallbackTestHooks(facebook::jsi::Runtime &runtime, facebook::jsi::Object &target);

/** The `test*` functions for the native data of glyph images (see `GlyphImageNativeData.h`). */
void InstallGlyphImageTestHooks(facebook::jsi::Runtime &runtime, facebook::jsi::Object &target);
#endif

} // namespace tehreer
