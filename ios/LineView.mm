#import "LineView.h"

#import "TehreerCoreGraphicsPainter.h"
#import "painter/PaintCallbacks.h"

#include <algorithm>
#include <cmath>

static UIColor *ColorOf(TRColor color)
{
  return [UIColor colorWithRed:((color >> 16) & 0xFF) / 255.0
                         green:((color >> 8) & 0xFF) / 255.0
                          blue:(color & 0xFF) / 255.0
                         alpha:((color >> 24) & 0xFF) / 255.0];
}

@implementation LineView {
  TRComposedLineRef _line;
  TRRendererRef _renderer;
  std::vector<tehreer::ios::LineHighlight> _highlights;
  tehreer::views::RendererSettings _rendering;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _renderer = TRRendererCreate();
    self.opaque = NO;
    self.backgroundColor = UIColor.clearColor;
    self.contentMode = UIViewContentModeRedraw;
    self.userInteractionEnabled = NO;
  }
  return self;
}

- (void)dealloc
{
  [self setLine:nullptr];
  TRRendererRelease(_renderer);
}

- (TRComposedLineRef)line
{
  return _line;
}

- (void)setLine:(TRComposedLineRef)line
{
  if (line != nullptr) {
    TRComposedLineRetain(line);
  }
  if (_line != nullptr) {
    TRComposedLineRelease(_line);
  }
  _line = line;
  [self setNeedsDisplay];
}

- (TRRendererRef)renderer
{
  return _renderer;
}

- (void)setRendering:(const tehreer::views::RendererSettings &)settings
{
  _rendering = settings;
  [self setNeedsDisplay];
}

- (void)setHighlights:(std::vector<tehreer::ios::LineHighlight>)highlights
{
  _highlights = std::move(highlights);
  [self setNeedsDisplay];
}

- (void)drawRect:(CGRect)rect
{
  CGContextRef context = UIGraphicsGetCurrentContext();
  if (context == nullptr || _line == nullptr) {
    return;
  }

  const CGPoint box = self.frame.origin;
  const CGFloat lineTop = TRComposedLineGetOrigin(_line).y - TRComposedLineGetAscent(_line);
  const CGFloat lineBottom = lineTop + TRComposedLineGetHeight(_line);

  // The highlights come first, clipped to the band of the line: a rectangle can be taller than the
  // line, and the neighbouring lines draw their own part.
  for (const tehreer::ios::LineHighlight &highlight : _highlights) {
    const CGFloat top = std::max<CGFloat>(highlight.rect.origin.y, lineTop);
    const CGFloat bottom = std::min<CGFloat>(highlight.rect.origin.y + highlight.rect.size.height, lineBottom);
    if (bottom > top) {
      CGContextSetFillColorWithColor(context, ColorOf(highlight.color).CGColor);
      CGContextFillRect(context, CGRectMake(highlight.rect.origin.x - box.x, top - box.y, highlight.rect.size.width, bottom - top));
    }
  }

  if (_separatorColor != 0) {
    const CGFloat separatorLeft = std::floor(0.0 - box.x);
    const CGFloat separatorRight = std::ceil(separatorLeft + _layoutWidth);
    const CGFloat separatorY = std::floor(lineBottom - box.y - 0.5);
    CGContextSetStrokeColorWithColor(context, ColorOf(_separatorColor).CGColor);
    CGContextSetLineWidth(context, 1.0);
    CGContextMoveToPoint(context, separatorLeft, separatorY);
    CGContextAddLineToPoint(context, separatorRight, separatorY);
    CGContextStrokePath(context);
  }

  // The line adds its own origin to the one that it is given, which is that of its container.
  const CGFloat scale = self.contentScaleFactor > 0 ? self.contentScaleFactor : UIScreen.mainScreen.scale;
  TRRendererSetRenderScale(_renderer, static_cast<float>(scale));
  _rendering.Apply(_renderer);
  tehreer::ios::CoreGraphicsPainter target(context, static_cast<float>(scale));
  tehreer::painter::DrawLine(_line, _renderer, target, TRPoint{static_cast<float>(-box.x), static_cast<float>(-box.y)});
}

@end
