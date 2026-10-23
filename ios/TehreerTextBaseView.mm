#import "TehreerTextBaseView.h"

#import "TehreerCoreGraphicsPainter.h"
#import "fabric/TehreerTextBaseComponentDescriptor.h"
#import "painter/PaintCallbacks.h"

#import <react/renderer/components/TehreerSpec/EventEmitters.h>
#import <react/renderer/components/TehreerSpec/Props.h>

#include <memory>

using namespace facebook::react;

@implementation TehreerTextBaseView {
  TehreerTextBaseShadowNode::ConcreteState::Shared _state;
  // The renderer of this view; the UI thread is the only one that draws with it.
  std::unique_ptr<tehreer::painter::FramePainter> _painter;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<TehreerTextBaseComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const TehreerTextBaseProps>();
    _props = defaultProps;

    _painter = std::make_unique<tehreer::painter::FramePainter>();

    // The text is drawn by drawRect: onto a clear background, and again when the box changes size.
    self.opaque = NO;
    self.contentMode = UIViewContentModeRedraw;
  }
  return self;
}

- (void)updateState:(const State::Shared &)state oldState:(const State::Shared &)oldState
{
  _state = std::static_pointer_cast<const TehreerTextBaseShadowNode::ConcreteState>(state);
  [self setNeedsDisplay];
  if (!_state || !_eventEmitter) {
    return;
  }

  // Read from the frame itself, not from the layout: this is the handoff the component proves.
  const auto &data = _state->getData();
  std::static_pointer_cast<const TehreerTextBaseEventEmitter>(_eventEmitter)
      ->onFrameReady({.lineCount = data.lineCount(),
                      .width = static_cast<Float>(data.frameWidth()),
                      .height = static_cast<Float>(data.frameHeight())});
}

// Core drew the frame's lines, runs and glyphs into a layout of its own: the view only provides
// the context. The frame is shared and immutable, and the state keeps it alive while it is drawn.
- (void)drawRect:(CGRect)rect
{
  if (!_state || !_painter) {
    return;
  }
  const auto &frame = _state->getData().frame;
  CGContextRef context = UIGraphicsGetCurrentContext();
  if (!frame || context == nullptr) {
    return;
  }

  // The scale of the display is the render scale: one glyph pixel is one device pixel.
  CGFloat scale = self.contentScaleFactor > 0 ? self.contentScaleFactor : UIScreen.mainScreen.scale;
  tehreer::ios::CoreGraphicsPainter target(context, static_cast<float>(scale));
  _painter->Draw(frame->get(), target, static_cast<float>(scale));
}

- (void)prepareForRecycle
{
  _state.reset();
  [self setNeedsDisplay];
  [super prepareForRecycle];
}

@end

// The class name that RCTThirdPartyComponentsProvider (generated from codegenConfig) looks up.
Class<RCTComponentViewProtocol> TehreerTextBaseViewCls(void)
{
  return TehreerTextBaseView.class;
}
