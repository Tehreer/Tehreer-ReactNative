#include "TehreerCoreGraphicsPainter.h"

#include "../cpp/painter/PaintCounters.h"
#include "../cpp/runtime/GlyphImageNativeData.h"

namespace tehreer::ios {
namespace {

using painter::PaintCounters;

/** What a glyph image of Core keeps for the painter. */
struct GlyphLayer {
    CGLayerRef layer;
};

CGColorSpaceRef RgbSpace() {
    static CGColorSpaceRef space = CGColorSpaceCreateWithName(kCGColorSpaceSRGB);
    return space;
}

CGColorSpaceRef MaskSpace() {
    static CGColorSpaceRef space = CGColorSpaceCreateDeviceGray();
    return space;
}

// Runs when Core destroys the image, on whichever thread releases the last reference.
void DestroyGlyphLayer(void *data) {
    auto *glyphLayer = static_cast<GlyphLayer *>(data);
    CGLayerRelease(glyphLayer->layer);
    delete glyphLayer;
    PaintCounters::Destroyed().fetch_add(1);
}

void *MakeGlyphLayer(TRGlyphImageRef image, void *) {
    std::size_t width = TRGlyphImageGetWidth(image);
    std::size_t height = TRGlyphImageGetHeight(image);
    const TRUInt8 *pixels = TRGlyphImageGetPixelsPtr(image);
    if (width == 0 || height == 0 || pixels == nullptr) {
        return nullptr;
    }

    bool isAlpha = TRGlyphImageGetFormat(image) == TRGlyphImageFormatAlpha;
    std::size_t bytesPerPixel = isAlpha ? 1 : 4;

    // The pixels stay with the image, which outlives the layer's creation: they are read while it is made.
    CGDataProviderRef provider = CGDataProviderCreateWithData(nullptr, pixels, width * height * bytesPerPixel, nullptr);
    if (provider == nullptr) {
        return nullptr;
    }

    CGRect rect = CGRectMake(0, 0, static_cast<CGFloat>(width), static_cast<CGFloat>(height));
    CGImageRef content = nullptr;
    CGContextRef host = nullptr;

    if (isAlpha) {
        static const CGFloat decode[2] = {1.0, 0.0};
        content = CGImageMaskCreate(width, height, 8, 8, width, provider, decode, false);
        host = CGBitmapContextCreate(nullptr, 1, 1, 8, 1, MaskSpace(), kCGImageAlphaOnly);
    } else {
        // Core's order is alpha first, with the colors premultiplied by it.
        CGBitmapInfo info = kCGBitmapByteOrder32Big | kCGImageAlphaPremultipliedFirst;
        content = CGImageCreate(width, height, 8, 32, width * 4, RgbSpace(), info, provider, nullptr, false, kCGRenderingIntentDefault);
        host = CGBitmapContextCreate(nullptr, 1, 1, 8, 4, RgbSpace(), kCGImageAlphaPremultipliedFirst);
    }
    CGDataProviderRelease(provider);

    CGLayerRef layer = (content != nullptr && host != nullptr) ? CGLayerCreateWithContext(host, rect.size, nullptr) : nullptr;
    if (layer != nullptr) {
        // The layer is drawn into a context whose y axis points down, so it holds the image flipped.
        CGContextRef layerContext = CGLayerGetContext(layer);
        CGContextTranslateCTM(layerContext, 0, rect.size.height);
        CGContextScaleCTM(layerContext, 1, -1);
        CGContextDrawImage(layerContext, rect, content);
    }

    if (content != nullptr) {
        CGImageRelease(content);
    }
    if (host != nullptr) {
        CGContextRelease(host);
    }
    if (layer == nullptr) {
        return nullptr;
    }

    PaintCounters::Created().fetch_add(1);
    return new GlyphLayer{layer};
}

CGFloat Channel(TRColor color, int shift) {
    return static_cast<CGFloat>((color >> shift) & 0xFF) / 255.0;
}

} // namespace

CoreGraphicsPainter::CoreGraphicsPainter(CGContextRef context, float density) : _context(context), _density(density > 0 ? density : 1) {
    CGContextSaveGState(_context);
    // Core draws in pixels, already multiplied by the render scale.
    CGContextScaleCTM(_context, 1.0 / _density, 1.0 / _density);
    CGContextSetFillColorSpace(_context, RgbSpace());
}

CoreGraphicsPainter::~CoreGraphicsPainter() {
    if (_inShadow) {
        CGContextEndTransparencyLayer(_context);
        CGContextRestoreGState(_context);
    }
    CGContextRestoreGState(_context);
}

void CoreGraphicsPainter::SetFillColor(TRColor color) {
    CGFloat components[4] = {Channel(color, 16), Channel(color, 8), Channel(color, 0), Channel(color, 24)};
    CGContextSetFillColor(_context, components);
}

void CoreGraphicsPainter::DrawGlyphImage(TRGlyphImageRef image, TRPoint origin, TRFloat scaleX, TRFloat scaleY, TRColor color,
                                         const TRRect *clip) {
    if (image == nullptr) {
        return;
    }

    auto *data = static_cast<GlyphLayer *>(runtime::GetOrAttachNativeData(image, &MakeGlyphLayer, nullptr, &DestroyGlyphLayer));
    if (data == nullptr) {
        return;
    }

    if (clip != nullptr) {
        CGContextSaveGState(_context);
        CGContextClipToRect(_context, CGRectMake(clip->origin.x, clip->origin.y, clip->size.width, clip->size.height));
    }

    SetFillColor(color);
    CGSize size = CGLayerGetSize(data->layer);
    CGContextDrawLayerInRect(_context, CGRectMake(origin.x, origin.y, size.width * scaleX, size.height * scaleY), data->layer);

    if (clip != nullptr) {
        CGContextRestoreGState(_context);
    }
}

void CoreGraphicsPainter::FillRect(TRRect rect, TRColor color) {
    SetFillColor(color);
    CGContextFillRect(_context, CGRectMake(rect.origin.x, rect.origin.y, rect.size.width, rect.size.height));
}

void CoreGraphicsPainter::BeginShadow(TRFloat radius, TRFloat dx, TRFloat dy, TRColor color) {
    if (_inShadow) {
        return;
    }

    CGFloat components[4] = {Channel(color, 16), Channel(color, 8), Channel(color, 0), Channel(color, 24)};
    CGColorRef shadowColor = CGColorCreate(RgbSpace(), components);
    if (shadowColor == nullptr) {
        return;
    }

    CGContextSaveGState(_context);
    // The shadow is set in the default space of the context (points), which the scale above does
    // not reach, while Core's distances are pixels.
    CGContextSetShadowWithColor(_context, CGSizeMake(dx / _density, dy / _density), radius / _density, shadowColor);
    CGContextBeginTransparencyLayer(_context, nullptr);
    CGColorRelease(shadowColor);
    _inShadow = true;
}

void CoreGraphicsPainter::EndShadow() {
    if (!_inShadow) {
        return;
    }

    _inShadow = false;
    CGContextEndTransparencyLayer(_context);
    CGContextRestoreGState(_context);
}

} // namespace tehreer::ios
