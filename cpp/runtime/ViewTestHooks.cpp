#ifndef NDEBUG

#include "ViewBindings.h"

#include "../fabric/StaticReplacements.h"
#include "../fabric/ViewText.h"

namespace tehreer {

namespace jsi = facebook::jsi;

void InstallViewTestHooks(jsi::Runtime &runtime, jsi::Object &target) {
    target.setProperty(runtime, "testGetViewCounts", jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, "testGetViewCounts"), 0,
        [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *, size_t) {
            jsi::Object counts(rt);
            counts.setProperty(rt, "texts", static_cast<double>(fabric::ViewTextRegistry::Count()));
            counts.setProperty(rt, "replacements", static_cast<double>(fabric::StaticReplacements::LiveCount()));
            return jsi::Value(rt, counts);
        }));
}

} // namespace tehreer

#endif
