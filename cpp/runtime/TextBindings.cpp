#include "TextBindings.h"

#include "../generated/GeneratedSupport.h"
#include "../generated/Handles.h"
#include "StructCodecs.h"

#include <string>
#include <vector>

namespace tehreer {

namespace jsi = facebook::jsi;

namespace {

jsi::Value BindTextSetAttribute(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "TRTextSetAttribute";
    marshal::BeginCall();

    // Every conversion comes first, so a bad argument changes nothing. The attribute only borrows
    // the handle of a typeface or font features from `args`, which the call keeps alive; Core
    // retains what it keeps, so nothing is owned here and nothing has to be released.
    TRMutableTextRef text = marshal::ToHandle<TRMutableTextRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "text", false);
    TRUInteger index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRAttribute attribute = AttributeFromJs(rt, marshal::ArgAt(args, count, 3), kFunction, "attribute");

    TRBoolean result = TRTextSetAttribute(text, index, length, &attribute);
    marshal::RethrowCallbackError(rt);
    return marshal::FromBoolean(result != TRFalse);
}

// TRTypesetterCreate runs the `computeRoom` handlers of the replacements while it shapes, so it ends
// like every binding that can reach one: the error that a handler threw is rethrown after the call,
// and a typesetter that Core did return is released first.
jsi::Value BindTypesetterCreate(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "TRTypesetterCreate";
    marshal::BeginCall();

    // Every conversion that can run JavaScript comes first, and the handle of the text comes last,
    // so a getter cannot dispose it between here and the Core call. The attributes only borrow the
    // handles of typefaces, font features and replacements from `args`, which the call keeps alive;
    // Core retains what it keeps, so nothing is owned here and nothing has to be released.
    std::vector<TRAttribute> attributes;
    const jsi::Value &list = marshal::ArgAt(args, count, 1);
    if (!marshal::IsNullish(list)) {
        if (!list.isObject() || !list.getObject(rt).isArray(rt)) {
            marshal::Fail(rt, kFunction, "defaultAttributes", "must be an array");
        }
        jsi::Array array = list.getObject(rt).getArray(rt);
        const size_t length = array.size(rt);
        attributes.reserve(length);
        for (size_t index = 0; index < length; index++) {
            attributes.push_back(AttributeFromJs(rt, array.getValueAtIndex(rt, index), kFunction,
                "defaultAttributes[" + std::to_string(index) + "]"));
        }
    }
    TRTextRef text = marshal::ToHandle<TRTextRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "text", false);

    TRTypesetterRef result = TRTypesetterCreate(text, attributes.empty() ? nullptr : attributes.data(),
        static_cast<TRUInteger>(attributes.size()));
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRTypesetterRef>(rt, result, marshal::Ownership::Adopt);
}

} // namespace

void InstallTextBindings(jsi::Runtime &runtime, jsi::Object &target) {
    target.setProperty(runtime, "TRTextSetAttribute", jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, "TRTextSetAttribute"), 4, &BindTextSetAttribute));
    target.setProperty(runtime, "TRTypesetterCreate", jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, "TRTypesetterCreate"), 2, &BindTypesetterCreate));
}

} // namespace tehreer
