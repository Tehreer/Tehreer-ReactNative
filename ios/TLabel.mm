#import "TLabel.h"

#import "TehreerCoreGraphicsPainter.h"
#import "painter/PaintCallbacks.h"
#import "views/ComponentDescriptors.h"
#import "views/RendererSettings.h"
#import "views/TextLayout.h"
#import "views/Typesetters.h"

using namespace facebook::react;
using namespace tehreer::views;

@implementation TLabel {
  TRTypesetterRef _typesetter;
  TRComposedFrameRef _frame;
  TRRendererRef _renderer;
  FrameSettings _settings;
  RendererSettings _rendering;
  int _typesetterId;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<TLabelComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const TLabelProps>();
    _props = defaultProps;
    _renderer = TRRendererCreate();

    self.opaque = NO;
    self.clipsToBounds = YES;
    self.contentMode = UIViewContentModeRedraw;
    [self addGestureRecognizer:[[UITapGestureRecognizer alloc] initWithTarget:self action:@selector(handleTap:)]];
  }
  return self;
}

- (void)dealloc
{
  [self releaseText];
  TRRendererRelease(_renderer);
}

// Lets go of the typesetter and the frame, which is all that this view owns.
- (void)releaseText
{
  [self releaseFrame];
  if (_typesetter != nullptr) {
    TRTypesetterRelease(_typesetter);
    _typesetter = nullptr;
  }
  _typesetterId = 0;
}

- (void)releaseFrame
{
  if (_frame != nullptr) {
    TRComposedFrameRelease(_frame);
    _frame = nullptr;
  }
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &next = static_cast<const TLabelProps &>(*props);
  [super updateProps:props oldProps:oldProps];

  if (next.typesetterId != _typesetterId) {
    // A reference of its own, so that what is drawn does not depend on when JavaScript unregisters.
    [self releaseText];
    _typesetterId = next.typesetterId;
    _typesetter = Typesetters::Retain(_typesetterId);
  }
  _settings = FrameSettings::From(next.frameSettings.data(), next.frameSettings.size());
  _rendering = RendererSettings::From(next.rendererInts.data(), next.rendererInts.size(), next.rendererFloats.data(), next.rendererFloats.size());
  [self releaseFrame];
  [self setNeedsDisplay];
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  [self releaseFrame];
  [self setNeedsDisplay];
}

// Lays the text out for the size of the view, once for each change of the text, the settings or the size.
- (void)ensureFrame
{
  if (_frame != nullptr || _typesetter == nullptr || self.bounds.size.width <= 0) {
    return;
  }
  _frame = ComposeFrame(_typesetter, self.bounds.size.width, self.bounds.size.height, _settings, false, false);

  if (_frame != nullptr && _eventEmitter) {
    std::static_pointer_cast<const TLabelEventEmitter>(_eventEmitter)
        ->onFrameReady({.lineCount = static_cast<int>(TRComposedFrameGetLineCount(_frame)),
                        .width = TRComposedFrameGetWidth(_frame),
                        .height = TRComposedFrameGetHeight(_frame)});
  }
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  [self ensureFrame];
}

- (void)drawRect:(CGRect)rect
{
  [self ensureFrame];
  CGContextRef context = UIGraphicsGetCurrentContext();
  if (_frame == nullptr || context == nullptr) {
    return;
  }

  // The scale of the display is the render scale: one glyph pixel is one device pixel.
  const CGFloat scale = self.contentScaleFactor > 0 ? self.contentScaleFactor : UIScreen.mainScreen.scale;
  TRRendererSetRenderScale(_renderer, static_cast<float>(scale));
  _rendering.Apply(_renderer);
  tehreer::ios::CoreGraphicsPainter target(context, static_cast<float>(scale));
  tehreer::painter::DrawFrame(_frame, _renderer, target, TRPoint{0, 0});
}

- (void)handleTap:(UITapGestureRecognizer *)recognizer
{
  if (_eventEmitter) {
    const CGPoint point = [recognizer locationInView:self];
    std::static_pointer_cast<const TLabelEventEmitter>(_eventEmitter)->onTextTap({.x = static_cast<Float>(point.x), .y = static_cast<Float>(point.y)});
  }
}

- (void)prepareForRecycle
{
  [self releaseText];
  [super prepareForRecycle];
}

@end

// The class name that RCTThirdPartyComponentsProvider (generated from codegenConfig) looks up.
Class<RCTComponentViewProtocol> TLabelCls(void)
{
  return TLabel.class;
}
