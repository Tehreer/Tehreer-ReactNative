#ifndef NDEBUG

#include "ViewBindings.h"

#include "../generated/GeneratedSupport.h"
#include "../generated/Handles.h"
#include "../views/RendererSettings.h"
#include "../views/ReplacementHolder.h"
#include "../views/Typesetters.h"

#include <vector>

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

    // Applies the numbers of the `rendererInts` and `rendererFloats` props to a renderer, so that a
    // test can read the settings back from Core.
    target.setProperty(runtime, "testApplyRendererSettings", jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, "testApplyRendererSettings"), 3,
        [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
            constexpr const char *kFunction = "testApplyRendererSettings";
            TRRendererRef renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);
            jsi::Array ints = marshal::ToObject(rt, marshal::ArgAt(args, count, 1), kFunction, "ints").getArray(rt);
            jsi::Array floats = marshal::ToObject(rt, marshal::ArgAt(args, count, 2), kFunction, "floats").getArray(rt);
            std::vector<double> intValues;
            std::vector<double> floatValues;
            for (size_t i = 0; i < ints.size(rt); i++) {
                intValues.push_back(ints.getValueAtIndex(rt, i).asNumber());
            }
            for (size_t i = 0; i < floats.size(rt); i++) {
                floatValues.push_back(floats.getValueAtIndex(rt, i).asNumber());
            }
            views::RendererSettings::From(intValues.data(), intValues.size(), floatValues.data(), floatValues.size()).Apply(renderer);
            return jsi::Value::undefined();
        }));
}

} // namespace tehreer

#endif
