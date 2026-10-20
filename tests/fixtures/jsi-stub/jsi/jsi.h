// A stand-in for the declarations of <jsi/jsi.h> that the generated bindings use, with the same
// names and signatures as React Native's. It exists so that the generated C++ can be compiled
// (-fsyntax-only) by a plain C++17 compiler before React Native's headers are part of the build;
// the generated glue is only checked, never linked. tests/handlerTable.test.ts is the one that
// links and runs against it (the handler table and the callback error slot, which use a handful of
// types): `Object` therefore tells a hook when it ends, so a test can see where and when a value of
// the runtime is destroyed, and `HostObject` exists. The hook and the constructors that the harness
// needs are defined by the harness; the real header replaces all of this in the native build.
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

/** Called by the destructor of an `Object` that was made by `Object(Runtime &)` and not moved from. */
void ObjectEnded(unsigned long id) noexcept;

class HostObject {
public:
    virtual ~HostObject() = default;
};

class Object {
public:
    explicit Object(Runtime &runtime);
    Object(Object &&other) noexcept : _id(other._id) { other._id = 0; }
    Object &operator=(Object &&other) noexcept {
        if (this != &other) {
            End();
            _id = other._id;
            other._id = 0;
        }
        return *this;
    }
    Object(const Object &) = delete;
    Object &operator=(const Object &) = delete;
    ~Object() { End(); }

    /** Which object this is, 0 for one that was moved from. For the harness. */
    unsigned long id() const { return _id; }

    template <typename T> void setProperty(Runtime &runtime, const char *name, T &&value) const;
    Value getProperty(Runtime &runtime, const char *name) const;
    Array asArray(Runtime &runtime) const &;

private:
    void End() noexcept {
        if (_id != 0) {
            ObjectEnded(_id);
            _id = 0;
        }
    }

    unsigned long _id = 0;
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
