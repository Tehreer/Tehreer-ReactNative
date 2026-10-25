#ifndef NDEBUG

#include "ViewBindings.h"

#include "../generated/GeneratedSupport.h"
#include "../generated/Handles.h"
#include "../views/ComposedFrames.h"
#include "../views/RendererSettings.h"
#include "../views/ReplacementHolder.h"
#include "../views/Typesetters.h"

#include <type_traits>

namespace tehreer {

namespace jsi = facebook::jsi;

void InstallViewTestHooks(jsi::Runtime &runtime, jsi::Object &target) {
    target.setProperty(runtime, "testGetViewCounts", jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, "testGetViewCounts"), 0,
        [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *, size_t) {
            jsi::Object counts(rt);
            counts.setProperty(rt, "typesetters", static_cast<double>(views::Typesetters::Count()));
            counts.setProperty(rt, "composedFrames", static_cast<double>(views::ComposedFrames::Count()));
            counts.setProperty(rt, "replacements", static_cast<double>(views::ReplacementHolder::Count()));
            return jsi::Value(rt, counts);
        }));

    // Applies the renderer props that an object has, by their names, to a renderer, so that a test
    // can read the settings back from Core. A name that the object lacks is the default of the struct.
    target.setProperty(runtime, "testApplyRendererSettings", jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, "testApplyRendererSettings"), 2,
        [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
            constexpr const char *kFunction = "testApplyRendererSettings";
            TRRendererRef renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);
            jsi::Object props = marshal::ToObject(rt, marshal::ArgAt(args, count, 1), kFunction, "props");

            views::RendererSettings settings;
            const auto read = [&](const char *name, auto &member) {
                jsi::Value value = props.getProperty(rt, name);
                if (value.isNumber()) {
                    using Member = std::remove_reference_t<decltype(member)>;
                    if constexpr (std::is_floating_point_v<Member>) {
                        member = static_cast<Member>(value.asNumber());
                    } else {
                        member = views::RendererSettings::Unsigned(value.asNumber());
                    }
                }
            };
            read("textColor", settings.textColor);
            read("drawStyle", settings.drawStyle);
            read("strokeColor", settings.strokeColor);
            read("strokeRadius", settings.strokeRadius);
            read("strokeCap", settings.strokeCap);
            read("strokeJoin", settings.strokeJoin);
            read("strokeMiter", settings.strokeMiter);
            read("glyphShadowColor", settings.shadowColor);
            read("glyphShadowRadius", settings.shadowRadius);
            read("glyphShadowDx", settings.shadowDx);
            read("glyphShadowDy", settings.shadowDy);
            settings.Apply(renderer);
            return jsi::Value::undefined();
        }));
}

} // namespace tehreer

#endif
