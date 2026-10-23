#pragma once

#include <jsi/jsi.h>

namespace tehreer {

#ifndef NDEBUG
/**
 * The `test*` functions that drive the native painter of the platform from JavaScript, which only
 * debug builds contain: `testPaintFrame` draws a composed frame through the platform painter onto
 * an offscreen canvas and returns its pixels, `testGetPaintCounts` counts the platform images that
 * painters made and destroyed. They exist so that device tests and the visual check of the example
 * app run the same painter as the views.
 */
void InstallPaintTestHooks(facebook::jsi::Runtime &runtime, facebook::jsi::Object &target);
#endif

} // namespace tehreer
