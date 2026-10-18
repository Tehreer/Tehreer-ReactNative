#include "TehreerBindings.h"

#include <Tehreer/Tehreer.h>

#include <memory>
#include <vector>

namespace tehreer {

using namespace facebook;

namespace {

jsi::Value GetVersion(jsi::Runtime &runtime, const jsi::Value &, const jsi::Value *, size_t) {
    // TRVersionGetString is declared by Core but never defined, so the macro is the only source.
    return jsi::String::createFromAscii(runtime, TEHREER_VERSION_STRING);
}

jsi::Value SmokeTest(jsi::Runtime &, const jsi::Value &, const jsi::Value *, size_t) {
    TROpenTypeFeature feature = { 0, 1 };

    // Creating and releasing an object proves that Core and its dependencies are linked and that
    // the reference counting works from this runtime.
    TRFontFeaturesRef features = TRFontFeaturesCreate(&feature, 1);
    if (!features) {
        return jsi::Value(false);
    }

    bool isCounted = TRFontFeaturesGetCount(features) == 1;
    TRFontFeaturesRelease(features);

    return jsi::Value(isCounted);
}

class Bindings final : public jsi::HostObject {
public:
    jsi::Value get(jsi::Runtime &runtime, const jsi::PropNameID &name) override {
        std::string key = name.utf8(runtime);

        if (key == "getVersion") {
            return makeFunction(runtime, "getVersion", GetVersion);
        }
        if (key == "smokeTest") {
            return makeFunction(runtime, "smokeTest", SmokeTest);
        }

        return jsi::Value::undefined();
    }

    std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &runtime) override {
        std::vector<jsi::PropNameID> names;
        names.push_back(jsi::PropNameID::forAscii(runtime, "getVersion"));
        names.push_back(jsi::PropNameID::forAscii(runtime, "smokeTest"));

        return names;
    }

private:
    static jsi::Value makeFunction(jsi::Runtime &runtime, const char *name, jsi::HostFunctionType function) {
        return jsi::Function::createFromHostFunction(
            runtime, jsi::PropNameID::forAscii(runtime, name), 0, std::move(function));
    }
};

} // namespace

void InstallBindings(jsi::Runtime &runtime) {
    jsi::Object global = runtime.global();
    if (global.hasProperty(runtime, kBindingsName)) {
        return;
    }

    // Read-only and non-configurable, so that app code cannot replace or delete the bindings that
    // the library holds on to. Not enumerable, to keep `global` free of an internal name.
    jsi::Object descriptor(runtime);
    descriptor.setProperty(runtime, "value",
        jsi::Object::createFromHostObject(runtime, std::make_shared<Bindings>()));
    descriptor.setProperty(runtime, "writable", false);
    descriptor.setProperty(runtime, "configurable", false);
    descriptor.setProperty(runtime, "enumerable", false);

    jsi::Function defineProperty = runtime.global()
        .getPropertyAsObject(runtime, "Object")
        .getPropertyAsFunction(runtime, "defineProperty");
    defineProperty.call(runtime, global, jsi::String::createFromAscii(runtime, kBindingsName), descriptor);
}

} // namespace tehreer
