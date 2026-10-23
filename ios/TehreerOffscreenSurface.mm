#import <UIKit/UIKit.h>

#include "../cpp/painter/OffscreenSurface.h"

#include "TehreerCoreGraphicsPainter.h"

#include <cmath>

namespace tehreer::painter {

// The context is the one UIKit gives to drawRect: (flipped, in points, at the display scale), so
// the painter runs here exactly as it does in the view.
bool RenderOffscreen(float width, float height, float density, std::uint32_t background,
                     const std::function<void(PaintTarget &)> &draw, OffscreenPixels &result) {
    int pixelWidth = static_cast<int>(std::lround(width * density));
    int pixelHeight = static_cast<int>(std::lround(height * density));
    if (pixelWidth <= 0 || pixelHeight <= 0) {
        return false;
    }

    UIGraphicsImageRendererFormat *format = [UIGraphicsImageRendererFormat preferredFormat];
    format.scale = density;
    format.opaque = (background >> 24) == 0xFF;
    format.preferredRange = UIGraphicsImageRendererFormatRangeStandard;

    CGSize size = CGSizeMake(pixelWidth / density, pixelHeight / density);
    UIGraphicsImageRenderer *renderer = [[UIGraphicsImageRenderer alloc] initWithSize:size format:format];
    UIImage *image = [renderer imageWithActions:^(UIGraphicsImageRendererContext *rendererContext) {
        CGContextRef context = rendererContext.CGContext;
        CGFloat components[4] = {((background >> 16) & 0xFF) / 255.0, ((background >> 8) & 0xFF) / 255.0,
                                 (background & 0xFF) / 255.0, (background >> 24) / 255.0};
        CGColorSpaceRef space = CGColorSpaceCreateWithName(kCGColorSpaceSRGB);
        CGContextSetFillColorSpace(context, space);
        CGContextSetFillColor(context, components);
        CGContextFillRect(context, CGRectMake(0, 0, size.width, size.height));
        CGColorSpaceRelease(space);

        ios::CoreGraphicsPainter target(context, density);
        draw(target);
    }];

    CGImageRef cgImage = image.CGImage;
    if (cgImage == nullptr || static_cast<int>(CGImageGetWidth(cgImage)) != pixelWidth || static_cast<int>(CGImageGetHeight(cgImage)) != pixelHeight) {
        return false;
    }

    // Read back in a known layout: straight rows from the top, premultiplied RGBA.
    result.width = pixelWidth;
    result.height = pixelHeight;
    result.rgba.assign(static_cast<std::size_t>(pixelWidth) * pixelHeight * 4, 0);
    CGColorSpaceRef space = CGColorSpaceCreateWithName(kCGColorSpaceSRGB);
    CGContextRef readback = CGBitmapContextCreate(result.rgba.data(), pixelWidth, pixelHeight, 8, static_cast<std::size_t>(pixelWidth) * 4,
                                                  space, kCGImageAlphaPremultipliedLast | kCGBitmapByteOrder32Big);
    CGColorSpaceRelease(space);
    if (readback == nullptr) {
        return false;
    }
    CGContextDrawImage(readback, CGRectMake(0, 0, pixelWidth, pixelHeight), cgImage);
    CGContextRelease(readback);
    return true;
}

} // namespace tehreer::painter
