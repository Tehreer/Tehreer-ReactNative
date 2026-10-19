#include "Callbacks.h"

namespace tehreer {

namespace jsi = facebook::jsi;

namespace {

// The error of the Core call that is running on this thread. A handler only runs on the thread of
// its runtime, so the thread that records is the thread that rethrows, and no lock is needed.
struct PendingError {
    jsi::Runtime *runtime = nullptr;
    std::exception_ptr error;
};

thread_local PendingError gPending;

} // namespace

namespace runtime {

void RecordCallbackError(jsi::Runtime &runtime, std::exception_ptr error) noexcept {
    if (!gPending.error) {
        gPending.runtime = &runtime;
        gPending.error = std::move(error);
    }
}

} // namespace runtime

namespace marshal {

bool HasCallbackError(jsi::Runtime &rt) {
    return gPending.error != nullptr && gPending.runtime == &rt;
}

void ThrowCallbackError(jsi::Runtime &rt) {
    // The slot is cleared before the throw, so the next Core call starts clean even if the
    // exception is caught and ignored.
    std::exception_ptr error = std::move(gPending.error);
    gPending.error = nullptr;
    gPending.runtime = nullptr;

    if (error) {
        std::rethrow_exception(error);
    }

    throw jsi::JSError(rt, "A callback failed.");
}

} // namespace marshal
} // namespace tehreer
