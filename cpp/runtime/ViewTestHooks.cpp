#ifndef NDEBUG

#include "ViewBindings.h"

#include "../views/ReplacementHolder.h"
#include "../views/Typesetters.h"

namespace tehreer {

namespace jsi = facebook::jsi;

void InstallViewTestHooks(jsi::Runtime &runtime, jsi::Object &target) {
    target.setProperty(runtime, "testGetViewCounts", jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, "testGetViewCounts"), 0,
        [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *, size_t) {
            jsi::Object counts(rt);
            counts.setProperty(rt, "typesetters", static_cast<double>(views::Typesetters::Count()));
            counts.setProperty(rt, "replacements", static_cast<double>(views::ReplacementHolder::Count()));
            return jsi::Value(rt, counts);
        }));
}

} // namespace tehreer

#endif
