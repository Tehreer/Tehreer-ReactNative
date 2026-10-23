#pragma once

#import <CoreGraphics/CoreGraphics.h>

#include "../cpp/painter/PaintTarget.h"

namespace tehreer::ios {

/**
 * Draws what Core produces into a `CGContext` whose y axis points downward and whose unit is a
 * point, which is what UIKit gives to `drawRect:` and to a `UIGraphicsImageRenderer`. The pixels
 * of Core are made 1:1 by scaling the context by the inverse of the render scale (the display
 * scale), as `TRRenderer.h` describes: the transform of the context applies after Core's scale.
 *
 * Glyph images become `CGLayer`s that stay with the glyph image of Core: an alpha image is a mask
 * that takes the fill color, a color image keeps its premultiplied colors. They are released when
 * Core destroys the image. A shadow scope is a transparency layer with the context's shadow set,
 * so that a glyph that is filled and stroked casts one shadow.
 *
 * It lives for one draw call on one thread.
 */
class CoreGraphicsPainter final : public painter::PaintTarget {
public:
    /** `density` is the number of pixels in a point, which is also the render scale of the renderer. */
    CoreGraphicsPainter(CGContextRef context, float density);
    ~CoreGraphicsPainter() override;

    CoreGraphicsPainter(const CoreGraphicsPainter &) = delete;
    CoreGraphicsPainter &operator=(const CoreGraphicsPainter &) = delete;

    void DrawGlyphImage(TRGlyphImageRef image, TRPoint origin, TRFloat scaleX, TRFloat scaleY, TRColor color,
                        const TRRect *clip) override;
    void FillRect(TRRect rect, TRColor color) override;
    void BeginShadow(TRFloat radius, TRFloat dx, TRFloat dy, TRColor color) override;
    void EndShadow() override;

private:
    void SetFillColor(TRColor color);

    CGContextRef _context;
    float _density;
    bool _inShadow = false;
};

} // namespace tehreer::ios
