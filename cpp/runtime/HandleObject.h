#pragma once

#include <jsi/jsi.h>

#include <memory>

namespace tehreer {

/**
 * What JavaScript holds for an object of Core: exactly one reference, which is released once, by
 * `Dispose()` or, if that was never called, when the engine collects this object.
 *
 * Nothing may depend on the collection. The destructor can run on any thread and while the
 * runtime is shutting down, so it calls the release function and nothing else: no JS, no locks.
 */
class HandleObject final : public facebook::jsi::HostObject {
public:
    /** Must be the `Release` of Core for the reference type the handle was made from. */
    using ReleaseFunction = void (*)(void *ref);

    /** Takes over one reference, which must not be `NULL`. */
    HandleObject(void *ref, const char *group, bool isMutable, ReleaseFunction release);
    ~HandleObject() override;

    HandleObject(const HandleObject &) = delete;
    HandleObject &operator=(const HandleObject &) = delete;

    /** The reference, or `NULL` once it is disposed. */
    void *ref() const { return _ref; }
    bool isDisposed() const { return _ref == nullptr; }

    /** The name shared by the reference types of one object, such as `TRText` for both text types. */
    const char *group() const { return _group; }
    /** Whether the type the handle was made from allows changing the object. */
    bool isMutable() const { return _isMutable; }

    /** Releases the reference. Does nothing the second time. */
    void Dispose();

private:
    void *_ref;
    const char *_group;
    bool _isMutable;
    ReleaseFunction _release;
};

/** The handle behind a JavaScript value, or null if the value is not a handle made by this library. */
std::shared_ptr<HandleObject> AsHandleObject(facebook::jsi::Runtime &rt, const facebook::jsi::Value &value);

} // namespace tehreer
