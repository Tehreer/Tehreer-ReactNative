#pragma once

#include <Tehreer/Tehreer.h>

#include <cstddef>
#include <memory>
#include <vector>

namespace tehreer::fabric {

/** A filled rectangle of a replacement, in layout units, relative to the start of the replacement on its baseline. */
struct ReplacementRect {
    float x;
    float y;
    float width;
    float height;
    TRColor color;
};

/** What a native painter draws for a replacement. Immutable. */
struct ReplacementPaint {
    std::vector<ReplacementRect> rects;
};

/**
 * Replacements whose room and drawing are plain data, which is what lets a view measure and paint
 * them on any thread: a JavaScript `computeRoom` can only run on the thread of the runtime, and
 * Yoga measures on another. The data is made once, on the JavaScript thread, from the delegate
 * (`src/views/ViewText.ts`), and lives exactly as long as the Core replacement: Core's `finalize`
 * drops it, so nothing is left behind when the last text, typesetter or run that holds the
 * replacement lets go. Safe on any thread.
 */
class StaticReplacements final {
public:
    /**
     * Makes a Core replacement with a fixed room.
     *
     * @return An owned reference, or `NULL` on failure (nothing is kept then).
     */
    static TRReplacementRef Create(TRReplacementKind kind, TRReplacementRoom room, std::shared_ptr<const ReplacementPaint> paint);

    /** The paint of a replacement made here, or null (also for one made by JavaScript). */
    static std::shared_ptr<const ReplacementPaint> FindPaint(TRReplacementRef replacement);

    /** Whether the replacement was made by `Create` and is alive. */
    static bool IsStatic(TRReplacementRef replacement);

    /** How many static replacements are alive; for the tests. */
    static std::size_t LiveCount();
};

} // namespace tehreer::fabric
