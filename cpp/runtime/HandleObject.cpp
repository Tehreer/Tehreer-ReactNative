#include "HandleObject.h"

namespace tehreer {

HandleObject::HandleObject(void *ref, const char *group, bool isMutable, ReleaseFunction release)
    : _ref(ref), _group(group), _isMutable(isMutable), _release(release) {
}

HandleObject::~HandleObject() {
    Dispose();
}

void HandleObject::Dispose() {
    // The field is cleared first so that the reference can never be released twice.
    void *ref = _ref;
    _ref = nullptr;

    if (ref != nullptr) {
        _release(ref);
    }
}

std::shared_ptr<HandleObject> AsHandleObject(facebook::jsi::Runtime &rt, const facebook::jsi::Value &value) {
    if (!value.isObject()) {
        return nullptr;
    }

    facebook::jsi::Object object = value.getObject(rt);
    if (!object.isHostObject(rt)) {
        return nullptr;
    }

    // Other libraries install host objects too, so the type is checked instead of assumed.
    return std::dynamic_pointer_cast<HandleObject>(object.getHostObject(rt));
}

} // namespace tehreer
