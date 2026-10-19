#pragma once

#include <jsi/jsi.h>

#include <string>

namespace tehreer::runtime {

/** Throws a `jsi::JSError` whose value is a new instance of the named global error constructor. */
[[noreturn]] void ThrowError(facebook::jsi::Runtime &rt, const char *constructor, const std::string &message);

/** Throws a `RangeError` that names the Core function and the parameter. */
[[noreturn]] void FailRange(facebook::jsi::Runtime &rt, const char *function, const char *parameter, const char *message);

} // namespace tehreer::runtime
