#pragma once

#include <atomic>

namespace tehreer::painter {

/**
 * Counts the platform images (Android bitmaps, Core Graphics layers) that painters made for glyph
 * images and the ones that were destroyed with them, so a test can see that none outlives its
 * glyph image. The painters of both platforms count here.
 */
struct PaintCounters {
    static std::atomic<int> &Created() {
        static std::atomic<int> value{0};
        return value;
    }

    static std::atomic<int> &Destroyed() {
        static std::atomic<int> value{0};
        return value;
    }
};

} // namespace tehreer::painter
