#include "ViewBindings.h"

#include "../generated/GeneratedSupport.h"
#include "../generated/Handles.h"
#include "../views/ComposedFrames.h"
#include "../views/ReplacementHolder.h"
#include "../views/Typesetters.h"

#include <utility>
#include <vector>

namespace tehreer {

namespace jsi = facebook::jsi;

namespace {

jsi::Value BindRegisterTypesetter(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "registerTypesetter";
    marshal::BeginCall();

    TRTypesetterRef typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);
    return jsi::Value(static_cast<double>(views::Typesetters::Register(typesetter)));
}

jsi::Value BindUnregisterTypesetter(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    views::Typesetters::Unregister(marshal::ToNumber<TRInt32>(rt, marshal::ArgAt(args, count, 0), "unregisterTypesetter", "id"));
    return jsi::Value::undefined();
}

jsi::Value BindRegisterFrame(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "registerComposedFrame";
    marshal::BeginCall();

    TRComposedFrameRef frame = marshal::ToHandle<TRComposedFrameRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "frame", false);
    return jsi::Value(static_cast<double>(views::ComposedFrames::Register(frame)));
}

jsi::Value BindUnregisterComposedFrame(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    views::ComposedFrames::Unregister(marshal::ToNumber<TRInt32>(rt, marshal::ArgAt(args, count, 0), "unregisterComposedFrame", "id"));
    return jsi::Value::undefined();
}

jsi::Value BindCreateReplacementHolder(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "createReplacementHolder";
    marshal::BeginCall();

    TRReplacementKind kind = marshal::ToNumber<TRReplacementKind>(rt, marshal::ArgAt(args, count, 0), kFunction, "kind");
    TRReplacementRoom room = {};
    room.ascent = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "ascent");
    room.descent = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 2), kFunction, "descent");
    room.extent = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 3), kFunction, "extent");

    jsi::Object list = marshal::ToObject(rt, marshal::ArgAt(args, count, 4), kFunction, "rects");
    if (!list.isArray(rt)) {
        throw jsi::JSError(rt, "createReplacementHolder: 'rects' must be an array");
    }
    jsi::Array array = list.getArray(rt);
    const size_t length = array.size(rt);
    if (length % 5 != 0) {
        throw jsi::JSError(rt, "createReplacementHolder: 'rects' must hold x, y, width, height and color for each rectangle");
    }

    std::vector<views::ReplacementRect> rects;
    rects.reserve(length / 5);
    for (size_t i = 0; i < length; i += 5) {
        views::ReplacementRect rect;
        rect.x = marshal::ToNumber<TRFloat>(rt, array.getValueAtIndex(rt, i), kFunction, "rects");
        rect.y = marshal::ToNumber<TRFloat>(rt, array.getValueAtIndex(rt, i + 1), kFunction, "rects");
        rect.width = marshal::ToNumber<TRFloat>(rt, array.getValueAtIndex(rt, i + 2), kFunction, "rects");
        rect.height = marshal::ToNumber<TRFloat>(rt, array.getValueAtIndex(rt, i + 3), kFunction, "rects");
        rect.color = marshal::ToNumber<TRColor>(rt, array.getValueAtIndex(rt, i + 4), kFunction, "rects");
        rects.push_back(rect);
    }

    TRReplacementRef replacement = views::ReplacementHolder::Create(kind, room, std::move(rects));
    if (replacement == nullptr) {
        return jsi::Value::undefined();
    }
    return marshal::FromHandle<TRReplacementRef>(rt, replacement, marshal::Ownership::Adopt);
}

void Define(jsi::Runtime &rt, jsi::Object &target, const char *name, unsigned argc, jsi::HostFunctionType function) {
    target.setProperty(rt, name, jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, name), argc, std::move(function)));
}

} // namespace

void InstallViewBindings(jsi::Runtime &runtime, jsi::Object &target) {
    Define(runtime, target, "registerTypesetter", 1, &BindRegisterTypesetter);
    Define(runtime, target, "unregisterTypesetter", 1, &BindUnregisterTypesetter);
    Define(runtime, target, "registerComposedFrame", 1, &BindRegisterFrame);
    Define(runtime, target, "unregisterComposedFrame", 1, &BindUnregisterComposedFrame);
    Define(runtime, target, "createReplacementHolder", 5, &BindCreateReplacementHolder);
}

} // namespace tehreer
