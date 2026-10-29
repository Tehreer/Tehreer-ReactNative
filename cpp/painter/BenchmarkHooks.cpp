#include "BenchmarkBindings.h"

#ifdef TEHREER_BENCHMARKS

#include "../generated/GeneratedSupport.h"
#include "../generated/Handles.h"
#include "../runtime/Errors.h"
#include "OffscreenSurface.h"
#include "PaintCallbacks.h"

#include <chrono>
#include <cstdio>
#include <utility>
#include <vector>

#if defined(__APPLE__)
#include <mach/mach.h>
#include <malloc/malloc.h>
#elif defined(__ANDROID__)
#include <malloc.h>
#include <unistd.h>
#endif

namespace tehreer {

namespace jsi = facebook::jsi;

namespace {

void Define(jsi::Runtime &runtime, jsi::Object &target, const char *name, unsigned int parameters, jsi::HostFunctionType function) {
    target.setProperty(runtime, name, jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, name), parameters, std::move(function)));
}

// benchDrawFrame(frame, renderer, { width, height, warmup, iterations }) -> number[]
// Makes one canvas of the platform (as the views' painter draws on), draws the frame `warmup + iterations`
// times into it with the painter of the views and returns the milliseconds of each of the last
// `iterations` draws. Only the draw call is timed: not the canvas, not the read back. The draws are
// not cleared in between, which costs the same as a clear would.
jsi::Value DrawFrame(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "benchDrawFrame";
    marshal::BeginCall();

    TRComposedFrameRef frame = marshal::ToHandle<TRComposedFrameRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "frame", false);
    TRRendererRef renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 1), kFunction, "renderer", false);
    jsi::Object options = marshal::ToObject(rt, marshal::ArgAt(args, count, 2), kFunction, "options");

    float width = marshal::ToNumber<TRFloat>(rt, options.getProperty(rt, "width"), kFunction, "width");
    float height = marshal::ToNumber<TRFloat>(rt, options.getProperty(rt, "height"), kFunction, "height");
    int warmup = marshal::ToNumber<int>(rt, options.getProperty(rt, "warmup"), kFunction, "warmup");
    int iterations = marshal::ToNumber<int>(rt, options.getProperty(rt, "iterations"), kFunction, "iterations");
    float density = TRRendererGetRenderScale(renderer);
    if (!(width > 0) || !(height > 0) || !(density > 0) || warmup < 0 || iterations < 1) {
        runtime::FailRange(rt, kFunction, "options", "the canvas and the counts must be positive");
    }

    std::vector<double> times;
    times.reserve(static_cast<size_t>(iterations));
    painter::OffscreenPixels pixels;
    bool made = painter::RenderOffscreen(width, height, density, 0xFFFFFFFFu, [&](painter::PaintTarget &platform) {
        for (int i = 0; i < warmup + iterations; i++) {
            auto start = std::chrono::steady_clock::now();
            painter::DrawFrame(frame, renderer, platform, TRPoint{0, 0});
            auto end = std::chrono::steady_clock::now();
            if (i >= warmup) {
                times.push_back(std::chrono::duration<double, std::milli>(end - start).count());
            }
        }
    }, pixels);
    if (!made) {
        runtime::ThrowError(rt, "Error", "benchDrawFrame: the platform could not make the canvas");
    }

    jsi::Array result(rt, times.size());
    for (size_t i = 0; i < times.size(); i++) {
        result.setValueAtIndex(rt, i, jsi::Value(times[i]));
    }
    return jsi::Value(rt, result);
}

// benchMemory() -> { heapKB, residentKB }
// heapKB: bytes that the C allocator has handed out and not got back (Apple: malloc_zone_statistics
// of every zone; Android: mallinfo, which is what android.os.Debug.getNativeHeapAllocatedSize reads).
// residentKB: resident set of the process (Apple: TASK_VM_INFO resident_size; Android: statm).
jsi::Value ReadMemory(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *, size_t) {
    double heap = 0;
    double resident = 0;
#if defined(__APPLE__)
    malloc_statistics_t statistics = {};
    malloc_zone_statistics(nullptr, &statistics);
    heap = static_cast<double>(statistics.size_in_use);
    task_vm_info_data_t info = {};
    mach_msg_type_number_t infoCount = TASK_VM_INFO_COUNT;
    if (task_info(mach_task_self(), TASK_VM_INFO, reinterpret_cast<task_info_t>(&info), &infoCount) == KERN_SUCCESS) {
        resident = static_cast<double>(info.resident_size);
    }
#elif defined(__ANDROID__)
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    struct mallinfo info = mallinfo();
#pragma clang diagnostic pop
    heap = static_cast<double>(info.uordblks) + static_cast<double>(info.hblkhd);
    if (FILE *file = std::fopen("/proc/self/statm", "r")) {
        long size = 0;
        long pages = 0;
        if (std::fscanf(file, "%ld %ld", &size, &pages) == 2) {
            resident = static_cast<double>(pages) * static_cast<double>(sysconf(_SC_PAGESIZE));
        }
        std::fclose(file);
    }
#endif
    jsi::Object result(rt);
    result.setProperty(rt, "heapKB", heap / 1024.0);
    result.setProperty(rt, "residentKB", resident / 1024.0);
    return jsi::Value(rt, result);
}

} // namespace

void InstallBenchmarkHooks(jsi::Runtime &runtime, jsi::Object &target) {
    Define(runtime, target, "benchDrawFrame", 3, DrawFrame);
    Define(runtime, target, "benchMemory", 0, ReadMemory);
}

} // namespace tehreer

#endif
