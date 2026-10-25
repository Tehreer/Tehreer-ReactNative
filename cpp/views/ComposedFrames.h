#pragma once

#include <Tehreer/Tehreer.h>

#include <cstddef>
#include <cstdint>

namespace tehreer::views {

/**
 * Names a composed frame to the native side of a paint view, as `Typesetters` does for a typesetter:
 * a Fabric component only receives props, so the frame that JavaScript laid out is registered here
 * and the prop carries its id. A view takes a reference of its own when it receives the id, so what
 * it draws does not depend on when JavaScript unregisters.
 *
 * The table is written by the JavaScript thread and read by the UI thread, so it has a mutex: that is
 * the only reason for it. Ids are in 1 to INT32_MAX and start over after that many registrations.
 */
class ComposedFrames final {
public:
    /** Retains the frame and returns its id, or 0 if the table could not grow. */
    static std::int32_t Register(TRComposedFrameRef frame);

    /** Releases the table's reference. An unknown id is ignored. */
    static void Unregister(std::int32_t id);

    /** A new reference of the frame of an id, which the caller releases, or `NULL`. */
    static TRComposedFrameRef Retain(std::int32_t id);

    /** How many frames are registered; for the tests. */
    static std::size_t Count();
};

} // namespace tehreer::views
