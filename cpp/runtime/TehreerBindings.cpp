#include "TehreerBindings.h"

#include "../generated/Bindings.h"
#include "Errors.h"
#include "HandleObject.h"

#include <Tehreer/Tehreer.h>

#include <atomic>
#include <memory>

#ifndef NDEBUG
#include <jsi/instrumentation.h>
#endif

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

std::shared_ptr<HandleObject> RequireHandle(jsi::Runtime &runtime, const jsi::Value *args, size_t count,
                                            size_t index, const char *function, const char *parameter) {
    std::shared_ptr<HandleObject> handle = AsHandleObject(runtime, marshal::ArgAt(args, count, index));
    if (!handle) {
        marshal::Fail(runtime, function, parameter, "is not a Tehreer handle");
    }

    return handle;
}

// The release of a reference is not bound (see the ownership rules): this is the one way for
// JavaScript to give the reference back early. It is idempotent.
jsi::Value DisposeHandle(jsi::Runtime &runtime, const jsi::Value &, const jsi::Value *args, size_t count) {
    RequireHandle(runtime, args, count, 0, "disposeHandle", "handle")->Dispose();
    return jsi::Value::undefined();
}

jsi::Value IsHandleDisposed(jsi::Runtime &runtime, const jsi::Value &, const jsi::Value *args, size_t count) {
    return jsi::Value(RequireHandle(runtime, args, count, 0, "isHandleDisposed", "handle")->isDisposed());
}

// Two handles are different objects even when they hold references to the same Core object (a
// retain gives a new one), so the identity of the Core object is what is compared.
jsi::Value HandleEquals(jsi::Runtime &runtime, const jsi::Value &, const jsi::Value *args, size_t count) {
    auto first = RequireHandle(runtime, args, count, 0, "handleEquals", "handle");
    auto second = RequireHandle(runtime, args, count, 1, "handleEquals", "other");
    if (first->isDisposed()) {
        marshal::Fail(runtime, "handleEquals", "handle", "is already disposed");
    }
    if (second->isDisposed()) {
        marshal::Fail(runtime, "handleEquals", "other", "is already disposed");
    }

    return jsi::Value(first->ref() == second->ref() && std::string(first->group()) == second->group());
}

#ifndef NDEBUG

std::atomic<int> gProbeReleases{0};

void ReleaseProbe(void *) {
    gProbeReleases.fetch_add(1);
}

// A handle that owns no Core object but counts its release, so that the finalizer path can be
// observed without depending on what Core does with an object.
jsi::Value CreateProbe(jsi::Runtime &runtime, const jsi::Value &, const jsi::Value *, size_t) {
    static int token;
    auto probe = std::make_shared<HandleObject>(&token, "TRProbe", true, &ReleaseProbe);
    return jsi::Value(jsi::Object::createFromHostObject(runtime, std::move(probe)));
}

jsi::Value GetProbeReleaseCount(jsi::Runtime &, const jsi::Value &, const jsi::Value *, size_t) {
    return jsi::Value(static_cast<double>(gProbeReleases.load()));
}

// Hermes runs the finalizers of host objects during a collection; JSI offers no other way to
// ask for one.
jsi::Value CollectGarbage(jsi::Runtime &runtime, const jsi::Value &, const jsi::Value *, size_t) {
    runtime.instrumentation().collectGarbage("tehreer test");
    return jsi::Value::undefined();
}

#endif

void Define(jsi::Runtime &runtime, jsi::Object &target, const char *name, unsigned int parameters, jsi::HostFunctionType function) {
    target.setProperty(runtime, name, jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, name), parameters, std::move(function)));
}

} // namespace

void InstallBindings(jsi::Runtime &runtime) {
    jsi::Object global = runtime.global();
    if (global.hasProperty(runtime, kBindingsName)) {
        return;
    }

    jsi::Object bindings(runtime);
    generated::InstallBindings(runtime, bindings);

    Define(runtime, bindings, "getVersion", 0, GetVersion);
    Define(runtime, bindings, "smokeTest", 0, SmokeTest);
    Define(runtime, bindings, "disposeHandle", 1, DisposeHandle);
    Define(runtime, bindings, "isHandleDisposed", 1, IsHandleDisposed);
    Define(runtime, bindings, "handleEquals", 2, HandleEquals);
#ifndef NDEBUG
    Define(runtime, bindings, "testCreateProbe", 0, CreateProbe);
    Define(runtime, bindings, "testGetProbeReleaseCount", 0, GetProbeReleaseCount);
    Define(runtime, bindings, "testCollectGarbage", 0, CollectGarbage);
#endif

    jsi::Object objectConstructor = global.getPropertyAsObject(runtime, "Object");
    objectConstructor.getPropertyAsFunction(runtime, "freeze").call(runtime, bindings);

    // Read-only and non-configurable, so that app code cannot replace or delete the bindings that
    // the library holds on to. Not enumerable, to keep `global` free of an internal name.
    jsi::Object descriptor(runtime);
    descriptor.setProperty(runtime, "value", std::move(bindings));
    descriptor.setProperty(runtime, "writable", false);
    descriptor.setProperty(runtime, "configurable", false);
    descriptor.setProperty(runtime, "enumerable", false);

    objectConstructor.getPropertyAsFunction(runtime, "defineProperty")
        .call(runtime, global, jsi::String::createFromAscii(runtime, kBindingsName), descriptor);
}

} // namespace tehreer
