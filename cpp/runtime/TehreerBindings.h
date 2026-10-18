#pragma once

#include <jsi/jsi.h>

namespace tehreer {

/** The property of `global` that holds the host object. Must match `src/internal/NativeBindings.ts`. */
constexpr const char *kBindingsName = "__tehreer";

/**
 * Installs the host object that holds all bindings on `global` of the runtime. Installing twice on
 * the same runtime replaces nothing: the first host object stays.
 */
void InstallBindings(facebook::jsi::Runtime &runtime);

} // namespace tehreer
