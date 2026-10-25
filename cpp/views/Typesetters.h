#pragma once

#include <Tehreer/Tehreer.h>

#include <cstddef>
#include <cstdint>

namespace tehreer::views {

/**
 * Names a typesetter to the native side of a view. The views of Tehreer-Android and Tehreer-Cocoa
 * are given a `Typesetter` object; a Fabric component only receives props, which are numbers, so the
 * typesetter that JavaScript made is registered here and the prop carries its id. A view takes a
 * reference of its own when it receives the id and never asks again, so what it draws does not depend
 * on when JavaScript unregisters (it does so after the commit that replaced the id).
 *
 * The table is read by the shadow thread (measurement) and the UI thread and written by the
 * JavaScript thread, so it has a mutex: that is the only reason for it. Ids are in 1 to INT32_MAX
 * (the prop is an `Int32`) and start over after that many registrations.
 */
class Typesetters final {
public:
    /** Retains the typesetter and returns its id, or 0 if the table could not grow. */
    static std::int32_t Register(TRTypesetterRef typesetter);

    /** Releases the table's reference. An unknown id is ignored. */
    static void Unregister(std::int32_t id);

    /** A new reference of the typesetter of an id, which the caller releases, or `NULL`. */
    static TRTypesetterRef Retain(std::int32_t id);

    /** How many typesetters are registered; for the tests. */
    static std::size_t Count();
};

} // namespace tehreer::views
