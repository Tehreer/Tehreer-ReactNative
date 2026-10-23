#pragma once

#include <jsi/jsi.h>

namespace tehreer {

/**
 * Binds `TRTextSetAttribute` and `TRTypesetterCreate`, the functions that the generator leaves out
 * (see `MANUAL` in its config) because they take the union `TRAttributeValue`, which the codec of
 * `TRAttribute` in `StructCodecs.cpp` writes from the `{ type, value }` object.
 */
void InstallTextBindings(facebook::jsi::Runtime &runtime, facebook::jsi::Object &target);

} // namespace tehreer
