#pragma once

#include <Tehreer/Tehreer.h>

#include <cstddef>
#include <memory>
#include <vector>

namespace tehreer::views {

/** A filled rectangle of a replacement, in layout units, relative to the start of its run on the baseline. */
struct ReplacementRect {
    float x;
    float y;
    float width;
    float height;
    TRColor color;
};

/**
 * Holds a replacement for Core, as `ReplacementHolder` does in Tehreer-Android: Core asks it for the
 * room of the replacement and, when a view draws, the drawer asks it for what to draw.
 *
 * Android and Cocoa call the replacement on whatever thread Core runs on. A JavaScript delegate can
 * only run on the JavaScript thread, while Yoga measures and a view lays out on others, so the
 * holder keeps what the delegate said: its room (`computeRoom` of the delegate) and its drawing
 * (the rectangles that its `draw` filled), both made once by JavaScript. They live exactly as long
 * as the Core replacement, which owns the holder.
 *
 * The lookup table has a mutex because JavaScript creates holders while the UI thread draws.
 */
struct ReplacementHolder final {
    /** Makes a Core replacement that owns a holder, or returns `NULL`. The caller owns the reference. */
    static TRReplacementRef Create(TRReplacementKind kind, TRReplacementRoom room, std::vector<ReplacementRect> rects);

    /** The holder of a replacement made by `Create`, which must be used before the replacement dies, or null. */
    static const ReplacementHolder *Find(TRReplacementRef replacement);

    /** Whether the replacement was made by `Create`. */
    static bool IsHolder(TRReplacementRef replacement);

    /** How many holders are alive; for the tests. */
    static std::size_t Count();

    /** Immutable after `Create`, so any thread may read it. */
    TRReplacementRoom room;
    std::vector<ReplacementRect> rects;
    /** The key of the holder in the table; set once, before it is inserted. */
    const void *replacement = nullptr;
};

} // namespace tehreer::views
