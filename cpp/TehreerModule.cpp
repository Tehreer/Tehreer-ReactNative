#include "TehreerModule.h"

#include "runtime/TehreerBindings.h"

namespace facebook::react {

TehreerModule::TehreerModule(std::shared_ptr<CallInvoker> jsInvoker)
    : NativeTehreerCxxSpec(std::move(jsInvoker)) {
}

bool TehreerModule::install(jsi::Runtime &runtime) {
    tehreer::InstallBindings(runtime);
    return true;
}

} // namespace facebook::react
