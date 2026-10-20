#pragma once

#include "../generated/GeneratedSupport.h"
#include "HandlerTable.h"

#include <exception>
#include <utility>

namespace tehreer::runtime {

/**
 * Remembers `error` for the Core call that is running, unless an earlier one is remembered: the
 * first error is the one that is thrown. Only the thread of the runtime may call it.
 */
void RecordCallbackError(facebook::jsi::Runtime &runtime, std::exception_ptr error) noexcept;

/**
 * The function that a trampoline is made of. It finds the handler of `userData` and runs
 * `body(runtime, handler)` on it, as a trampoline must:
 *
 * - no exception leaves it, because a C++ exception must never unwind through the frames of Core
 *   (they are C); an exception of `body` is recorded instead, and the binding that called Core
 *   throws it when Core returns (`marshal::RethrowCallbackError`);
 * - once an error is recorded `body` does not run again during that Core call, so a handler is
 *   never called after one has failed;
 * - it does nothing when there is no handler: the owner is gone, the runtime was torn down, or
 *   Core called from a thread other than the one of the runtime, where JSI must not be used.
 *
 * Returns true only when `body` ran to the end. On false the trampoline fills in what Core must
 * see (a zero result, `*stop = TRTrue`).
 *
 * A trampoline should be `noexcept` itself, so a mistake here terminates instead of unwinding.
 */
template <class Body>
bool InvokeHandler(void *userData, Body &&body) noexcept {
    try {
        HandlerTable::Target target = HandlerTable::Shared().Find(KeyFromUserData(userData));
        if (!target || marshal::HasCallbackError(*target.runtime)) {
            return false;
        }

        try {
            std::forward<Body>(body)(*target.runtime, *target.handler);
            return true;
        } catch (...) {
            RecordCallbackError(*target.runtime, std::current_exception());
            return false;
        }
    } catch (...) {
        return false;
    }
}

} // namespace tehreer::runtime
