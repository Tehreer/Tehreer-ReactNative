#include "Errors.h"

#include "../generated/GeneratedSupport.h"

namespace tehreer {

namespace jsi = facebook::jsi;

namespace {

std::string Describe(const char *function, const char *parameter, const char *message) {
    std::string text(function);
    text += ": '";
    text += parameter;
    text += "' ";
    text += message;
    return text;
}

} // namespace

namespace runtime {

void ThrowError(jsi::Runtime &rt, const char *constructor, const std::string &message) {
    // A JSError made from a string is always a plain Error, so the constructor is called here to
    // let callers tell a RangeError from the rest.
    jsi::Value error = rt.global()
        .getPropertyAsFunction(rt, constructor)
        .callAsConstructor(rt, jsi::String::createFromUtf8(rt, message));
    throw jsi::JSError(rt, std::move(error));
}

void FailRange(jsi::Runtime &rt, const char *function, const char *parameter, const char *message) {
    ThrowError(rt, "RangeError", Describe(function, parameter, message));
}

} // namespace runtime

namespace marshal {

void Fail(jsi::Runtime &rt, const char *function, const char *parameter, const char *message) {
    runtime::ThrowError(rt, "Error", Describe(function, parameter, message));
}

} // namespace marshal
} // namespace tehreer
