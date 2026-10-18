// A stand-in for the declarations of <jsi/jsi.h> that the generated bindings use, with the same
// names and signatures as React Native's. It exists so that the generated C++ can be compiled
// (-fsyntax-only) by a plain C++17 compiler before React Native's headers are part of the build;
// nothing links against it and nothing here runs. Replace it with the real header once the
// native build can supply it.
#pragma once

#include <cstddef>
#include <functional>
#include <string>
#include <utility>

namespace facebook {
namespace jsi {

class Runtime;
class Value;
class Object;
class Array;
class String;
class PropNameID;

class JSError {
public:
    JSError(Runtime &runtime, std::string message);
};

class PropNameID {
public:
    static PropNameID forAscii(Runtime &runtime, const char *ascii);
};

class String {
public:
    static String createFromAscii(Runtime &runtime, const char *ascii);
};

class Object {
public:
    explicit Object(Runtime &runtime);

    template <typename T> void setProperty(Runtime &runtime, const char *name, T &&value) const;
    Value getProperty(Runtime &runtime, const char *name) const;
    Array asArray(Runtime &runtime) const &;
};

class Array : public Object {
public:
    Array(Runtime &runtime, size_t length);

    size_t size(Runtime &runtime) const;
    Value getValueAtIndex(Runtime &runtime, size_t index) const;
    template <typename T> void setValueAtIndex(Runtime &runtime, size_t index, T &&value) const;
};

using HostFunctionType = std::function<Value(Runtime &runtime, const Value &thisValue, const Value *arguments, size_t count)>;

class Function : public Object {
public:
    static Function createFromHostFunction(Runtime &runtime, const PropNameID &name, unsigned int paramCount, HostFunctionType function);
};

class Value {
public:
    Value() noexcept;
    Value(double number) noexcept;
    Value(bool boolean) noexcept;
    Value(Runtime &runtime, const Object &object);
    Value(Runtime &runtime, const String &string);
    Value(Object &&object) noexcept;
    Value(String &&string) noexcept;
    Value(Value &&other) noexcept;

    static Value undefined() noexcept;
    static Value null() noexcept;

    bool isUndefined() const noexcept;
    bool isNull() const noexcept;
    bool isBool() const noexcept;
    bool isNumber() const noexcept;
    bool isObject() const noexcept;
    double asNumber() const;
    Object asObject(Runtime &runtime) const &;
};

class Runtime {
public:
    virtual ~Runtime();
};

} // namespace jsi
} // namespace facebook
