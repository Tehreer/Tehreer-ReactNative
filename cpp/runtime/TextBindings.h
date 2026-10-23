#pragma once

#include <jsi/jsi.h>

namespace tehreer {

/**
 * Binds `TRTextSetAttribute`, the one function of the text that the generator leaves out (see
 * `MANUAL` in its config): its argument is the union `TRAttributeValue`, which the codec of
 * `TRAttribute` in `StructCodecs.cpp` writes from the `{ type, value }` object.
 */
void InstallTextBindings(facebook::jsi::Runtime &runtime, facebook::jsi::Object &target);

} // namespace tehreer
