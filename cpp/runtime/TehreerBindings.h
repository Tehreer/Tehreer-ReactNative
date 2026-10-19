#pragma once

#include <jsi/jsi.h>

namespace tehreer {

/** The property of `global` that holds the bindings. Must match `src/internal/NativeBindings.ts`. */
constexpr const char *kBindingsName = "__tehreer";

/**
 * Installs the bindings on `global` of the runtime: the generated functions of Core, the handle
 * functions (`disposeHandle`, `isHandleDisposed`, `handleEquals`) and `getVersion`. Installing
 * twice on the same runtime replaces nothing: the first object stays.
 *
 * The object is frozen and the property is read-only and non-configurable, so app code cannot
 * replace a function that the library holds on to. Debug builds (no `NDEBUG`) add `test*`
 * functions that the device tests use; release builds do not contain them.
 */
void InstallBindings(facebook::jsi::Runtime &runtime);

} // namespace tehreer
