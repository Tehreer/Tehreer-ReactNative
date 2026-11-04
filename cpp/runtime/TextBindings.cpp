#include "TextBindings.h"

#include "../generated/GeneratedSupport.h"
#include "../generated/Handles.h"
#include "StructCodecs.h"

#include <string>
#include <vector>

namespace tehreer {

namespace jsi = facebook::jsi;

namespace {

jsi::Value BindTypesetterSetAttribute(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "TRTypesetterSetAttribute";
    marshal::BeginCall();

    // Every conversion comes first, so a bad argument changes nothing, and the handle is read last,
    // after the conversions that can run JavaScript or throw, so no raw pointer is held across them.
    // The attribute only borrows the handle of a typeface or font features from `args`, which the
    // call keeps alive; Core retains what it keeps, so nothing is owned here and nothing has to be
    // released.
    TRUInteger index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRAttribute attribute = AttributeFromJs(rt, marshal::ArgAt(args, count, 3), kFunction, "attribute");
    TRMutableTypesetterRef typesetter = marshal::ToHandle<TRMutableTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    TRBoolean result = TRTypesetterSetAttribute(typesetter, index, length, &attribute);
    marshal::RethrowCallbackError(rt);
    return marshal::FromBoolean(result != TRFalse);
}

// Reads the default attributes, an array of `{ type, value }` or nothing. The attributes only borrow
// the handles of typefaces, font features and replacements from the array, which the call keeps alive.
std::vector<TRAttribute> DefaultAttributesFromJs(jsi::Runtime &rt, const jsi::Value &list, const char *function) {
    std::vector<TRAttribute> attributes;
    if (!marshal::IsNullish(list)) {
        if (!list.isObject() || !list.getObject(rt).isArray(rt)) {
            marshal::Fail(rt, function, "defaultAttributes", "must be an array");
        }
        jsi::Array array = list.getObject(rt).getArray(rt);
        const size_t length = array.size(rt);
        attributes.reserve(length);
        for (size_t index = 0; index < length; index++) {
            attributes.push_back(AttributeFromJs(rt, array.getValueAtIndex(rt, index), function,
                "defaultAttributes[" + std::to_string(index) + "]"));
        }
    }
    return attributes;
}

// TRTypesetterCreate runs the `computeRoom` handlers of the replacements while it shapes, so it ends
// like every binding that can reach one: the error that a handler threw is rethrown after the call,
// and a typesetter that Core did return is released first.
jsi::Value BindTypesetterCreate(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "TRTypesetterCreate";
    marshal::BeginCall();

    // Every conversion that can run JavaScript comes first, and the buffer of the string comes last,
    // so a getter cannot detach it between here and the Core call.
    TRUInteger length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "length");
    TRStringEncoding encoding = marshal::ToNumber<TRStringEncoding>(rt, marshal::ArgAt(args, count, 2), kFunction, "encoding");
    std::vector<TRAttribute> attributes = DefaultAttributesFromJs(rt, marshal::ArgAt(args, count, 3), kFunction);
    marshal::ConstBuffer string = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 0), kFunction, "string", true);

    if (marshal::CodeUnitSize(encoding) != 0 && string.data != nullptr) {
        marshal::RequireCapacity(rt, kFunction, "string", static_cast<size_t>(length), marshal::CodeUnitSize(encoding), string.byteLength);
    }

    TRTypesetterRef result = TRTypesetterCreate(string.data, length, encoding,
        attributes.empty() ? nullptr : attributes.data(), static_cast<TRUInteger>(attributes.size()));
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRTypesetterRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTypesetterCreateMutable(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "TRTypesetterCreateMutable";
    marshal::BeginCall();

    TRStringEncoding encoding = marshal::ToNumber<TRStringEncoding>(rt, marshal::ArgAt(args, count, 0), kFunction, "encoding");
    std::vector<TRAttribute> attributes = DefaultAttributesFromJs(rt, marshal::ArgAt(args, count, 1), kFunction);

    TRMutableTypesetterRef result = TRTypesetterCreateMutable(encoding,
        attributes.empty() ? nullptr : attributes.data(), static_cast<TRUInteger>(attributes.size()));
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRMutableTypesetterRef>(rt, result, marshal::Ownership::Adopt);
}

} // namespace

void InstallTextBindings(jsi::Runtime &runtime, jsi::Object &target) {
    target.setProperty(runtime, "TRTypesetterSetAttribute", jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, "TRTypesetterSetAttribute"), 4, &BindTypesetterSetAttribute));
    target.setProperty(runtime, "TRTypesetterCreate", jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, "TRTypesetterCreate"), 4, &BindTypesetterCreate));
    target.setProperty(runtime, "TRTypesetterCreateMutable", jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, "TRTypesetterCreateMutable"), 2, &BindTypesetterCreateMutable));
}

} // namespace tehreer
