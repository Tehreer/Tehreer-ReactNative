#pragma once

#if __has_include(<ReactCodegen/TehreerSpecJSI.h>)
#include <ReactCodegen/TehreerSpecJSI.h>
#else
#include <TehreerSpecJSI.h>
#endif

// The Android autolinking includes only this header for the library, so the component descriptor is
// reachable through it (see views/ComponentDescriptors.h).
#include "views/ComponentDescriptors.h"

#include <memory>

// The autolinking of Android instantiates this class as `TehreerModule` inside this namespace, so
// the class cannot live in a namespace of its own.
namespace facebook::react {

/** The C++ TurboModule of the library. It installs the host object with all bindings. */
class TehreerModule : public NativeTehreerCxxSpec<TehreerModule> {
public:
    /** The name that `TurboModuleRegistry` asks for. Must match `src/specs/NativeTehreer.ts`. */
    static constexpr const char *kModuleName = "NativeTehreer";

    explicit TehreerModule(std::shared_ptr<CallInvoker> jsInvoker);

    bool install(jsi::Runtime &runtime);
};

} // namespace facebook::react
