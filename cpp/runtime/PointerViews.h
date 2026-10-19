#pragma once

#include "HandleObject.h"

#include <jsi/jsi.h>

#include <cstddef>
#include <memory>
#include <string>

namespace tehreer {

/**
 * What JavaScript holds for a pointer that Core gives into the memory of one of its objects (a
 * `*Ptr()` getter): the address, the name and the size of its elements, and the wrapper of the
 * handle that owns the memory. The count is not known here; the caller asks Core for it.
 *
 * It is a host object, so JavaScript cannot make one, change one, or read the address: native code
 * that is given a view can trust it. It keeps the handle wrapper reachable but not the Core
 * object, whose reference the handle owns: the memory is only valid while that handle is not
 * disposed, and `PointerBuffers.cpp` takes a reference of its own whenever it needs more than that.
 */
class PointerViewObject final : public facebook::jsi::HostObject {
public:
    PointerViewObject(const void *address, std::string element, size_t elementSize, std::shared_ptr<HandleObject> owner);

    const void *address() const { return _address; }
    const std::string &element() const { return _element; }
    size_t elementSize() const { return _elementSize; }
    const std::shared_ptr<HandleObject> &owner() const { return _owner; }

    /** `element` and `elementSize`, for messages and tests; nothing else is readable. */
    facebook::jsi::Value get(facebook::jsi::Runtime &rt, const facebook::jsi::PropNameID &name) override;
    std::vector<facebook::jsi::PropNameID> getPropertyNames(facebook::jsi::Runtime &rt) override;

private:
    const void *_address;
    std::string _element;
    size_t _elementSize;
    std::shared_ptr<HandleObject> _owner;
};

/** The view behind a JavaScript value, or null if the value is not a view made by this library. */
std::shared_ptr<PointerViewObject> AsPointerView(facebook::jsi::Runtime &rt, const facebook::jsi::Value &value);

} // namespace tehreer
