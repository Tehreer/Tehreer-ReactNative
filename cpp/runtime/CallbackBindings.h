#pragma once

#include <jsi/jsi.h>

namespace tehreer {

/**
 * Binds the functions of Core that keep JavaScript handlers (`TRReplacementCreate`, the only one
 * that keeps callbacks and `userData` after it returns; see `MANUAL` in the generator's config).
 * The draw callbacks and the native data of a glyph image never hold JavaScript: they stay native.
 */
void InstallCallbackBindings(facebook::jsi::Runtime &runtime, facebook::jsi::Object &target);

#ifndef NDEBUG
/** The `test*` functions for callbacks, which only debug builds contain. */
void InstallCallbackTestHooks(facebook::jsi::Runtime &runtime, facebook::jsi::Object &target);
#endif

} // namespace tehreer
