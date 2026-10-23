#include "TextBindings.h"

#include "../generated/GeneratedSupport.h"
#include "../generated/Handles.h"
#include "StructCodecs.h"

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

} // namespace

void InstallTextBindings(jsi::Runtime &runtime, jsi::Object &target) {
    target.setProperty(runtime, "TRTextSetAttribute", jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, "TRTextSetAttribute"), 4, &BindTextSetAttribute));
}

} // namespace tehreer
