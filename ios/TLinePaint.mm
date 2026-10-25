#import "TLinePaint.h"

#import "TehreerCoreGraphicsPainter.h"
#import "painter/PaintCallbacks.h"
#import "views/ComponentDescriptors.h"
#import "views/ComposedFrames.h"
#import "views/RendererSettings.h"

#include <algorithm>

using namespace facebook::react;
using namespace tehreer::views;

@implementation TLinePaint {
  TRComposedFrameRef _frame;
  TRRendererRef _renderer;
  RendererSettings _rendering;
  int _frameId;
  int _firstLine;
  int _lineCount;
  CGPoint _origin;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<TLinePaintComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const TLinePaintProps>();
    _props = defaultProps;
    _renderer = TRRendererCreate();

    self.opaque = NO;
    // What a stroke or a shadow draws beyond the box is clipped, as the label of Tehreer-Cocoa does.
    self.clipsToBounds = YES;
    self.contentMode = UIViewContentModeRedraw;
  }
  return self;
}

- (void)dealloc
{
  [self releaseFrame];
  TRRendererRelease(_renderer);
}

- (void)releaseFrame
{
  if (_frame != nullptr) {
    TRComposedFrameRelease(_frame);
    _frame = nullptr;
  }
  _frameId = 0;
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &next = static_cast<const TLinePaintProps &>(*props);
  [super updateProps:props oldProps:oldProps];

  if (next.composedFrameId != _frameId) {
    // A reference of its own, so that what is drawn does not depend on when JavaScript unregisters.
    [self releaseFrame];
    _frameId = next.composedFrameId;
    _frame = ComposedFrames::Retain(_frameId);
  }
  _firstLine = next.firstLine;
  _lineCount = next.lineCount;
  _origin = CGPointMake(next.originX, next.originY);
  _rendering = RendererSettings::From(next);
  [self setNeedsDisplay];
}

- (void)drawRect:(CGRect)rect
{
  CGContextRef context = UIGraphicsGetCurrentContext();
  if (_frame == nullptr || context == nullptr) {
    return;
  }

  const CGFloat scale = self.contentScaleFactor > 0 ? self.contentScaleFactor : UIScreen.mainScreen.scale;
  TRRendererSetRenderScale(_renderer, static_cast<float>(scale));
  _rendering.Apply(_renderer);
  tehreer::ios::CoreGraphicsPainter target(context, static_cast<float>(scale));

  const TRUInteger total = TRComposedFrameGetLineCount(_frame);
  const TRUInteger first = static_cast<TRUInteger>(std::max(0, _firstLine));
  const TRUInteger last = std::min<TRUInteger>(total, first + static_cast<TRUInteger>(std::max(0, _lineCount)));
  for (TRUInteger index = first; index < last; index++) {
    TRComposedLineRef line = TRComposedFrameGetLine(_frame, index);
    if (line != nullptr) {
      // The line adds its own origin to the one that it is given, which is the view's in the frame.
      tehreer::painter::DrawLine(line, _renderer, target, TRPoint{static_cast<float>(-_origin.x), static_cast<float>(-_origin.y)});
    }
  }
}

- (void)prepareForRecycle
{
  [self releaseFrame];
  [super prepareForRecycle];
}

@end

// The class name that RCTThirdPartyComponentsProvider (generated from codegenConfig) looks up.
Class<RCTComponentViewProtocol> TLinePaintCls(void)
{
  return TLinePaint.class;
}
