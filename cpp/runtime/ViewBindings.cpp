#include "ViewBindings.h"

#include "../fabric/FrameRegistry.h"
#include "../fabric/StaticReplacements.h"
#include "../fabric/TextFrameComposer.h"
#include "../fabric/ViewText.h"
#include "../generated/GeneratedSupport.h"
#include "../generated/Handles.h"

#include <cmath>
#include <memory>
#include <vector>

namespace tehreer {

namespace jsi = facebook::jsi;

namespace {

jsi::Value BindRegisterViewText(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "registerViewText";
    marshal::BeginCall();

    // Every conversion first: a bad argument registers nothing.
    TRTextRef text = marshal::ToHandle<TRTextRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "text", false);
    const jsi::Value &typefaceArg = marshal::ArgAt(args, count, 1);
    TRTypefaceRef typeface = marshal::IsNullish(typefaceArg)
        ? nullptr
        : marshal::ToHandle<TRTypefaceRef>(rt, typefaceArg, kFunction, "typeface", false);
    float typeSize = marshal::ToNumber<float>(rt, marshal::ArgAt(args, count, 2), kFunction, "typeSize");

    // The box owns one reference of each; the handles keep their own. Make takes nothing when it
    // refuses, so the references are given back: a replacement of JavaScript would be measured with
    // a room of zero on the Yoga thread.
    TRTextRetain(text);
    if (typeface != nullptr) {
        TRTypefaceRetain(typeface);
    }
    std::shared_ptr<const fabric::ViewText> box;
    std::uint32_t id = 0;
    try {
        box = fabric::ViewText::Make(text, typeface, typeSize);
        if (box) {
            id = fabric::ViewTextRegistry::Register(box);
        }
    } catch (...) {
        if (!box) {
            TRTextRelease(text);
            if (typeface != nullptr) {
                TRTypefaceRelease(typeface);
            }
        }
        throw;
    }
    if (!box) {
        TRTextRelease(text);
        if (typeface != nullptr) {
            TRTypefaceRelease(typeface);
        }
        return jsi::Value(0);
    }
    return jsi::Value(static_cast<double>(id));
}

jsi::Value BindUnregisterViewText(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    std::uint32_t id = marshal::ToNumber<std::uint32_t>(rt, marshal::ArgAt(args, count, 0), "unregisterViewText", "id");
    fabric::ViewTextRegistry::Unregister(id);
    return jsi::Value::undefined();
}

jsi::Value BindCreateStaticReplacement(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "createStaticReplacement";
    marshal::BeginCall();

    TRReplacementKind kind = marshal::ToNumber<TRReplacementKind>(rt, marshal::ArgAt(args, count, 0), kFunction, "kind");
    TRReplacementRoom room = {};
    room.ascent = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "ascent");
    room.descent = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 2), kFunction, "descent");
    room.extent = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 3), kFunction, "extent");

    jsi::Object list = marshal::ToObject(rt, marshal::ArgAt(args, count, 4), kFunction, "rects");
    if (!list.isArray(rt)) {
        throw jsi::JSError(rt, "createStaticReplacement: 'rects' must be an array");
    }
    jsi::Array array = list.getArray(rt);
    const size_t length = array.size(rt);
    if (length % 5 != 0) {
        throw jsi::JSError(rt, "createStaticReplacement: 'rects' must hold x, y, width, height and color for each rectangle");
    }

    auto paint = std::make_shared<fabric::ReplacementPaint>();
    paint->rects.reserve(length / 5);
    for (size_t i = 0; i < length; i += 5) {
        fabric::ReplacementRect rect;
        rect.x = marshal::ToNumber<float>(rt, array.getValueAtIndex(rt, i), kFunction, "rects");
        rect.y = marshal::ToNumber<float>(rt, array.getValueAtIndex(rt, i + 1), kFunction, "rects");
        rect.width = marshal::ToNumber<float>(rt, array.getValueAtIndex(rt, i + 2), kFunction, "rects");
        rect.height = marshal::ToNumber<float>(rt, array.getValueAtIndex(rt, i + 3), kFunction, "rects");
        // A color is an unsigned 32-bit number; ToNumber<TRColor> refuses a negative one.
        rect.color = marshal::ToNumber<TRColor>(rt, array.getValueAtIndex(rt, i + 4), kFunction, "rects");
        paint->rects.push_back(rect);
    }

    TRReplacementRef replacement = fabric::StaticReplacements::Create(kind, room, std::move(paint));
    if (replacement == nullptr) {
        return jsi::Value::undefined();
    }
    return marshal::FromHandle<TRReplacementRef>(rt, replacement, marshal::Ownership::Adopt);
}

jsi::Value BindAcquireViewFrame(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    std::uint32_t id = marshal::ToNumber<std::uint32_t>(rt, marshal::ArgAt(args, count, 0), "acquireViewFrame", "frameId");
    std::shared_ptr<const fabric::ComposedFrameBox> box = fabric::FrameRegistry::Find(id);
    if (!box) {
        return jsi::Value::undefined();
    }
    // The handle takes a reference of its own, so the frame outlives the state it came from.
    return marshal::FromHandle<TRComposedFrameRef>(rt, box->get(), marshal::Ownership::Retain);
}

void Define(jsi::Runtime &rt, jsi::Object &target, const char *name, unsigned argc, jsi::HostFunctionType function) {
    target.setProperty(rt, name, jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, name), argc, std::move(function)));
}

} // namespace

void InstallViewBindings(jsi::Runtime &runtime, jsi::Object &target) {
    Define(runtime, target, "registerViewText", 3, &BindRegisterViewText);
    Define(runtime, target, "unregisterViewText", 1, &BindUnregisterViewText);
    Define(runtime, target, "createStaticReplacement", 5, &BindCreateStaticReplacement);
    Define(runtime, target, "acquireViewFrame", 1, &BindAcquireViewFrame);
}

} // namespace tehreer
