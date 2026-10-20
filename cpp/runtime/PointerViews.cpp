#include "PointerViews.h"

#include <utility>
#include <vector>

namespace tehreer {

namespace jsi = facebook::jsi;

PointerViewObject::PointerViewObject(const void *address, std::string element, size_t elementSize, size_t count, std::shared_ptr<HandleObject> owner)
    : _address(address), _element(std::move(element)), _elementSize(elementSize), _count(count), _owner(std::move(owner)) {
}

jsi::Value PointerViewObject::get(jsi::Runtime &rt, const jsi::PropNameID &name) {
    std::string key = name.utf8(rt);
    if (key == "element") {
        return jsi::String::createFromUtf8(rt, _element);
    }
    if (key == "elementSize") {
        return jsi::Value(static_cast<double>(_elementSize));
    }
    if (key == "count") {
        return jsi::Value(static_cast<double>(_count));
    }
    return jsi::Value::undefined();
}

std::vector<jsi::PropNameID> PointerViewObject::getPropertyNames(jsi::Runtime &rt) {
    std::vector<jsi::PropNameID> names;
    names.push_back(jsi::PropNameID::forAscii(rt, "element"));
    names.push_back(jsi::PropNameID::forAscii(rt, "elementSize"));
    names.push_back(jsi::PropNameID::forAscii(rt, "count"));
    return names;
}

std::shared_ptr<PointerViewObject> AsPointerView(jsi::Runtime &rt, const jsi::Value &value) {
    if (!value.isObject()) {
        return nullptr;
    }

    jsi::Object object = value.getObject(rt);
    if (!object.isHostObject(rt)) {
        return nullptr;
    }

    return std::dynamic_pointer_cast<PointerViewObject>(object.getHostObject(rt));
}

} // namespace tehreer
