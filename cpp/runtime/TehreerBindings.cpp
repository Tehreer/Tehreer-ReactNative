#include "TehreerBindings.h"

#include "../generated/Bindings.h"
#include "CallbackBindings.h"
#include "Errors.h"
#include "HandleObject.h"
#include "HandlerTable.h"
#include "PointerBuffers.h"
#include "SheenBidiBindings.h"
#include "StructCodecs.h"
#include "TextBindings.h"

#include <Tehreer/Tehreer.h>

#include <atomic>
#include <cstddef>
#include <cstring>
#include <memory>
#include <string>
#include <vector>

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
    // The last release of a replacement ends its handler, which the table only queues (it can be
    // called from any thread); this is the JS thread, so the handler is destroyed here.
    runtime::HandlerTable::Shared().Drain(runtime);
    return jsi::Value::undefined();
}

// Whether Core lets the object change after it is made. What a mutable object owns can be freed by
// a setter while the object lives, so a list over it must ask Core again on every read.
jsi::Value IsHandleMutable(jsi::Runtime &runtime, const jsi::Value &, const jsi::Value *args, size_t count) {
    auto handle = RequireHandle(runtime, args, count, 0, "isHandleMutable", "handle");
    if (handle->isDisposed()) {
        marshal::Fail(runtime, "isHandleMutable", "handle", "is already disposed");
    }
    return jsi::Value(handle->isMutable());
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

    return jsi::Value(first->ref() == second->ref() && std::strcmp(first->group(), second->group()) == 0);
}

#ifndef NDEBUG

// Two kinds of probe, so that a test can tell the handles it disposed from the ones it abandoned.
std::atomic<int> gProbeReleases[2];
int gProbeTokens[2];

void ReleaseProbe(void *ref) {
    gProbeReleases[static_cast<int *>(ref) - gProbeTokens].fetch_add(1);
}

size_t ProbeKind(jsi::Runtime &runtime, const jsi::Value *args, size_t count, const char *function) {
    const jsi::Value &kind = marshal::ArgAt(args, count, 0);
    if (kind.isUndefined()) {
        return 0;
    }
    if (!kind.isNumber() || (kind.getNumber() != 0 && kind.getNumber() != 1)) {
        marshal::Fail(runtime, function, "kind", "must be 0 or 1");
    }
    return static_cast<size_t>(kind.getNumber());
}

// A handle that owns no Core object but counts its release, so that the finalizer path can be
// observed without depending on what Core does with an object.
jsi::Value CreateProbe(jsi::Runtime &runtime, const jsi::Value &, const jsi::Value *args, size_t count) {
    size_t kind = ProbeKind(runtime, args, count, "testCreateProbe");
    auto probe = std::make_shared<HandleObject>(&gProbeTokens[kind], "TRProbe", true, &ReleaseProbe);
    return jsi::Value(jsi::Object::createFromHostObject(runtime, std::move(probe)));
}

jsi::Value GetProbeReleaseCount(jsi::Runtime &runtime, const jsi::Value &, const jsi::Value *args, size_t count) {
    size_t kind = ProbeKind(runtime, args, count, "testGetProbeReleaseCount");
    return jsi::Value(static_cast<double>(gProbeReleases[kind].load()));
}

// Converts a JavaScript object to the C struct of the given name and back, so that a test sees
// exactly what Core would be given and what native code would read. The memory is aligned for any
// struct, and the value in it is the one the C struct holds, not a copy of the JavaScript object.
jsi::Value RoundTripStruct(jsi::Runtime &runtime, const jsi::Value &, const jsi::Value *args, size_t count) {
    const jsi::Value &nameValue = marshal::ArgAt(args, count, 0);
    if (!nameValue.isString()) {
        marshal::Fail(runtime, "testRoundTripStruct", "name", "must be a string");
    }
    std::string name = nameValue.getString(runtime).utf8(runtime);

    const generated::StructCodec *codec = FindStructCodec(name);
    if (codec == nullptr) {
        runtime::FailRange(runtime, "testRoundTripStruct", "name", "is not a struct that JavaScript converts");
    }

    alignas(std::max_align_t) unsigned char storage[64];
    if (codec->size > sizeof(storage)) {
        marshal::Fail(runtime, "testRoundTripStruct", "name", "is bigger than the test buffer");
    }

    codec->fromJs(runtime, marshal::ArgAt(args, count, 1), "testRoundTripStruct", "value", storage);
    return codec->toJs(runtime, storage);
}

jsi::Value GetStructNames(jsi::Runtime &runtime, const jsi::Value &, const jsi::Value *, size_t) {
    std::vector<std::string> names = StructCodecNames();
    jsi::Array array(runtime, names.size());
    for (size_t index = 0; index < names.size(); index++) {
        array.setValueAtIndex(runtime, index, jsi::String::createFromUtf8(runtime, names[index]));
    }
    return jsi::Value(runtime, array);
}

// Hermes runs the finalizers of host objects during a collection; JSI offers no other way to
// ask for one.
jsi::Value CollectGarbage(jsi::Runtime &runtime, const jsi::Value &, const jsi::Value *, size_t) {
    runtime.instrumentation().collectGarbage("tehreer test");
    return jsi::Value::undefined();
}

#endif

// The accessors of %TypedArray%.prototype and DataView.prototype as the engine defines them. Reading
// `buffer` from a view through the property would run whatever app code put there; calling these
// does not, and they throw for an object that is not a real view (see ResolveBuffer).
jsi::Object CaptureViewGetters(jsi::Runtime &runtime, const jsi::Object &objectConstructor) {
    jsi::Function getPrototypeOf = objectConstructor.getPropertyAsFunction(runtime, "getPrototypeOf");
    jsi::Function getDescriptor = objectConstructor.getPropertyAsFunction(runtime, "getOwnPropertyDescriptor");
    jsi::Object global = runtime.global();

    jsi::Object typedArray = getPrototypeOf.call(runtime, global.getPropertyAsObject(runtime, "Uint8Array")).getObject(runtime);
    jsi::Object prototypes[2] = {
        typedArray.getPropertyAsObject(runtime, "prototype"),
        global.getPropertyAsObject(runtime, "DataView").getPropertyAsObject(runtime, "prototype"),
    };
    const char *kinds[2] = { "typed", "dataView" };
    const char *members[3][2] = { { "Buffer", "buffer" }, { "ByteOffset", "byteOffset" }, { "ByteLength", "byteLength" } };

    jsi::Object intrinsics(runtime);
    for (int kind = 0; kind < 2; kind++) {
        for (const auto &member : members) {
            jsi::Value descriptor = getDescriptor.call(runtime, prototypes[kind], jsi::String::createFromAscii(runtime, member[1]));
            jsi::Value getter = descriptor.getObject(runtime).getProperty(runtime, "get");
            intrinsics.setProperty(runtime, (std::string(kinds[kind]) + member[0]).c_str(), getter);
        }
    }
    return intrinsics;
}

void Define(jsi::Runtime &runtime, jsi::Object &target, const char *name, unsigned int parameters, jsi::HostFunctionType function) {
    target.setProperty(runtime, name, jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, name), parameters, std::move(function)));
}

} // namespace

void InstallBindings(jsi::Runtime &runtime) {
    jsi::Object global = runtime.global();
    if (global.hasProperty(runtime, kBindingsName)) {
        // Installing again is fine; something else owning the name is not.
        jsi::Value existing = global.getProperty(runtime, kBindingsName);
        if (existing.isObject() && existing.getObject(runtime).hasProperty(runtime, "disposeHandle")) {
            return;
        }
        throw jsi::JSError(runtime, "global.__tehreer is already defined by something other than Tehreer.");
    }

    jsi::Object bindings(runtime);
    generated::InstallBindings(runtime, bindings);
    InstallCallbackBindings(runtime, bindings);
    InstallTextBindings(runtime, bindings);
    InstallPointerBindings(runtime, bindings);
    InstallSheenBidiBindings(runtime, bindings);

    // Its destructor ends the handlers of this runtime when the engine shuts down (see HandlerTable).
    // The bindings are frozen and read-only on global, so it stays reachable until then.
    bindings.setProperty(runtime, "lifetime", jsi::Object::createFromHostObject(
        runtime, runtime::HandlerTable::Shared().Attach(runtime)));

    Define(runtime, bindings, "getVersion", 0, GetVersion);
    Define(runtime, bindings, "smokeTest", 0, SmokeTest);
    Define(runtime, bindings, "disposeHandle", 1, DisposeHandle);
    Define(runtime, bindings, "isHandleDisposed", 1, IsHandleDisposed);
    Define(runtime, bindings, "isHandleMutable", 1, IsHandleMutable);
    Define(runtime, bindings, "handleEquals", 2, HandleEquals);
#ifndef NDEBUG
    Define(runtime, bindings, "testCreateProbe", 0, CreateProbe);
    Define(runtime, bindings, "testGetProbeReleaseCount", 0, GetProbeReleaseCount);
    Define(runtime, bindings, "testCollectGarbage", 0, CollectGarbage);
    Define(runtime, bindings, "testRoundTripStruct", 2, RoundTripStruct);
    Define(runtime, bindings, "testGetStructNames", 0, GetStructNames);
    InstallCallbackTestHooks(runtime, bindings);
    InstallGlyphImageTestHooks(runtime, bindings);
    InstallPointerTestHooks(runtime, bindings);
    InstallSheenBidiTestHooks(runtime, bindings);
#endif

    jsi::Object objectConstructor = global.getPropertyAsObject(runtime, "Object");
    jsi::Function freeze = objectConstructor.getPropertyAsFunction(runtime, "freeze");
    jsi::Object intrinsics = CaptureViewGetters(runtime, objectConstructor);
    freeze.call(runtime, intrinsics);
    bindings.setProperty(runtime, "intrinsics", intrinsics);
    freeze.call(runtime, bindings);

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
