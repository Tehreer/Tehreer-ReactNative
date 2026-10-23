#pragma once

#include "PaintTarget.h"

#include <cstdint>
#include <functional>
#include <vector>

namespace tehreer::painter {

/** The pixels that `RenderOffscreen` produced: RGBA, 8 bits each, premultiplied, row by row from the top. */
struct OffscreenPixels {
    int width = 0;
    int height = 0;
    std::vector<std::uint8_t> rgba;
};

/**
 * Makes a canvas of the platform (an `android.graphics.Canvas` over a `Bitmap`, a `UIKit` image
 * context), clears it to `background`, lets `draw` paint into a target over it and reads the
 * pixels back. It is the same painter the views use, on a canvas that a test can read; it is
 * implemented by the platform (`android/src/main/cpp`, `ios/`).
 *
 * @param width The width in layout units; the pixel width is the width times `density`, rounded.
 * @param density The number of pixels in a layout unit (the render scale of the renderer).
 * @param background A `TRColor`. An opaque one keeps the result opaque, so that the premultiplied
 *      pixels equal the straight ones.
 * @return false if the platform could not make the canvas.
 */
bool RenderOffscreen(float width, float height, float density, std::uint32_t background,
                     const std::function<void(PaintTarget &)> &draw, OffscreenPixels &result);

} // namespace tehreer::painter
