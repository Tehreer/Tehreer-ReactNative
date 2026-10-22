#include "CallbackBindings.h"

#ifndef NDEBUG

#include "../generated/GeneratedSupport.h"
#include "../generated/Handles.h"
#include "GlyphImageNativeData.h"

#include <atomic>
#include <cstddef>
#include <utility>

namespace tehreer {

namespace jsi = facebook::jsi;

namespace {

// The data a painter would attach: only a serial number, so that a test can tell whose data an
// image holds and count how many were made and destroyed (a bitmap would prove the same).
struct Probe {
    int serial;
};

std::atomic<int> gSerial{0};
std::atomic<int> gCreated{0};
std::atomic<int> gDestroyed{0};

void DestroyProbe(void *data) {
    delete static_cast<Probe *>(data);
    gDestroyed.fetch_add(1);
}

struct Context {
    // When set, the factory attaches data to the image first, as another thread would between the
    // check and the attach, so that the attach of the factory's own data loses.
    bool simulateRace;
};

void *MakeProbe(TRGlyphImageRef image, void *context) {
    if (static_cast<Context *>(context)->simulateRace) {
        auto *winner = new Probe{ gSerial.fetch_add(1) + 1 };
        gCreated.fetch_add(1);
        if (TRGlyphImageSetNativeData(image, winner, &DestroyProbe) == TRFalse) {
            DestroyProbe(winner);
        }
    }

    gCreated.fetch_add(1);
    return new Probe{ gSerial.fetch_add(1) + 1 };
}

void Define(jsi::Runtime &runtime, jsi::Object &target, const char *name, unsigned int parameters, jsi::HostFunctionType function) {
    target.setProperty(runtime, name, jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, name), parameters, std::move(function)));
}

// Attaches a probe to the image (or finds the one it has) and returns its serial number.
jsi::Value AttachNativeData(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "testAttachNativeData";
    TRGlyphImageRef image = marshal::ToHandle<TRGlyphImageRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "image", false);
    const jsi::Value &race = marshal::ArgAt(args, count, 1);
    Context context{ !race.isUndefined() && marshal::ToBoolean(rt, race, kFunction, "simulateRace") };

    void *data = runtime::GetOrAttachNativeData(image, &MakeProbe, &context, &DestroyProbe);
    return jsi::Value(static_cast<double>(static_cast<Probe *>(data)->serial));
}

// The serial number of the probe the image holds, or -1 for none.
jsi::Value GetNativeDataSerial(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    TRGlyphImageRef image = marshal::ToHandle<TRGlyphImageRef>(rt, marshal::ArgAt(args, count, 0), "testGetNativeDataSerial", "image", false);
    void *data = TRGlyphImageGetNativeData(image);
    return jsi::Value(data == nullptr ? -1.0 : static_cast<double>(static_cast<Probe *>(data)->serial));
}

jsi::Value GetNativeDataCounts(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *, size_t) {
    jsi::Object counts(rt);
    counts.setProperty(rt, "created", static_cast<double>(gCreated.load()));
    counts.setProperty(rt, "destroyed", static_cast<double>(gDestroyed.load()));
    return jsi::Value(rt, counts);
}

} // namespace

void InstallGlyphImageTestHooks(jsi::Runtime &runtime, jsi::Object &target) {
    Define(runtime, target, "testAttachNativeData", 2, AttachNativeData);
    Define(runtime, target, "testGetNativeDataSerial", 1, GetNativeDataSerial);
    Define(runtime, target, "testGetNativeDataCounts", 0, GetNativeDataCounts);
}

} // namespace tehreer

#endif
