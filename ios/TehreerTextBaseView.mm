#import "TehreerTextBaseView.h"

#import "TehreerCoreGraphicsPainter.h"
#import "fabric/TehreerTextBaseComponentDescriptor.h"
#import "painter/PaintCallbacks.h"

#import <react/renderer/components/TehreerSpec/EventEmitters.h>
#import <react/renderer/components/TehreerSpec/Props.h>

#include <algorithm>
#include <cmath>
#include <memory>

using namespace facebook::react;

@class TehreerTextBaseView;

// Draws one window of a scrolling text. It sits in the scroll view, moved to the visible part on
// every scroll, so its backing store is the size of the screen however long the text is.
@interface TehreerTextCanvas : UIView
@property (nonatomic, weak) TehreerTextBaseView *owner;
@property (nonatomic) CGFloat offsetY;
@end

@interface TehreerTextBaseView () <UIScrollViewDelegate>
- (void)paintInto:(CGContextRef)context offsetY:(CGFloat)offsetY height:(CGFloat)height;
@end

@implementation TehreerTextCanvas
- (void)drawRect:(CGRect)rect
{
  CGContextRef context = UIGraphicsGetCurrentContext();
  if (context != nullptr) {
    [self.owner paintInto:context offsetY:self.offsetY height:self.bounds.size.height];
  }
}
@end

@implementation TehreerTextBaseView {
  TehreerTextBaseShadowNode::ConcreteState::Shared _state;
  // The renderer of this view; the UI thread is the only one that draws with it.
  std::unique_ptr<tehreer::painter::FramePainter> _painter;
  UIScrollView *_scrollView;
  TehreerTextCanvas *_canvas;
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

    UITapGestureRecognizer *tap = [[UITapGestureRecognizer alloc] initWithTarget:self action:@selector(handleTap:)];
    [self addGestureRecognizer:tap];
  }
  return self;
}

- (const TehreerTextBaseProps &)currentProps
{
  return static_cast<const TehreerTextBaseProps &>(*_props);
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &next = static_cast<const TehreerTextBaseProps &>(*props);
  const auto previous = std::static_pointer_cast<const TehreerTextBaseProps>(oldProps);
  [super updateProps:props oldProps:oldProps];

  [self setUpScrollingFor:next.scrollable];

  // JavaScript resolves the offset (it knows the frame and the size of the view); a new token only
  // asks the scroll view to go there.
  if (_scrollView != nil && previous && next.scrollToToken != previous->scrollToToken && std::isfinite(next.scrollToOffset)) {
    [_scrollView setContentOffset:CGPointMake(0, next.scrollToOffset) animated:NO];
  }
  // Color and selection only paint; the frame stays as it is.
  [self redraw];
}

- (void)setUpScrollingFor:(BOOL)scrollable
{
  if (scrollable == (_scrollView != nil)) {
    return;
  }
  if (scrollable && _scrollView == nil) {
    _scrollView = [[UIScrollView alloc] initWithFrame:self.bounds];
    _scrollView.delegate = self;
    _scrollView.backgroundColor = UIColor.clearColor;
    _scrollView.alwaysBounceVertical = YES;
    _scrollView.showsHorizontalScrollIndicator = NO;
    _canvas = [[TehreerTextCanvas alloc] initWithFrame:self.bounds];
    _canvas.owner = self;
    _canvas.opaque = NO;
    _canvas.backgroundColor = UIColor.clearColor;
    _canvas.contentMode = UIViewContentModeRedraw;
    [_scrollView addSubview:_canvas];
    [self addSubview:_scrollView];
  } else if (!scrollable && _scrollView != nil) {
    [_scrollView removeFromSuperview];
    _scrollView = nil;
    _canvas = nil;
  }
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  if (_scrollView != nil) {
    _scrollView.frame = self.bounds;
    [self updateCanvasFrame];
  }
}

- (void)updateCanvasFrame
{
  CGFloat offset = _scrollView.contentOffset.y;
  _canvas.offsetY = offset;
  _canvas.frame = CGRectMake(0, offset, self.bounds.size.width, self.bounds.size.height);
  [_canvas setNeedsDisplay];
}

- (void)redraw
{
  if (_scrollView != nil) {
    [_canvas setNeedsDisplay];
  } else {
    [self setNeedsDisplay];
  }
}

- (void)updateState:(const State::Shared &)state oldState:(const State::Shared &)oldState
{
  // The frame that this view showed is no longer wanted once another replaces it, and React Native
  // keeps the state that holds it after the node is gone, so the view retires it. The text stays:
  // the new frame is made from the same one.
  auto next = std::static_pointer_cast<const TehreerTextBaseShadowNode::ConcreteState>(state);
  if (_state && _state->getData().frame && (!next || next->getData().frame != _state->getData().frame)) {
    _state->getData().frame->Retire(false);
  }
  _state = std::static_pointer_cast<const TehreerTextBaseShadowNode::ConcreteState>(state);
  // The locator of the previous frame keeps that frame alive until the next windowed draw.
  _painter->Reset();
  if (_scrollView != nil) {
    const auto &frame = _state ? _state->getData().frame : nullptr;
    _scrollView.contentSize = CGSizeMake(self.bounds.size.width, frame ? frame->height() : 0);
    [self updateCanvasFrame];
  }
  [self redraw];
  if (!_state || !_eventEmitter) {
    return;
  }

  // Read from the frame itself, not from the layout: this is the handoff the component proves.
  const auto &data = _state->getData();
  std::static_pointer_cast<const TehreerTextBaseEventEmitter>(_eventEmitter)
      ->onFrameReady({.lineCount = data.lineCount(),
                      .width = static_cast<Float>(data.frameWidth()),
                      .height = static_cast<Float>(data.frameHeight()),
                      .frameId = data.frame ? static_cast<int>(data.frame->id()) : 0});
}

- (void)paintInto:(CGContextRef)context offsetY:(CGFloat)offsetY height:(CGFloat)height
{
  if (!_state || !_painter) {
    return;
  }
  const auto &box = _state->getData().frame;
  if (!box || context == nullptr) {
    return;
  }
  // A reference for the length of the draw: the frame may be retired meanwhile.
  TRComposedFrameRef frame = box->Acquire();
  if (frame == nullptr) {
    return;
  }

  const auto &props = [self currentProps];
  tehreer::painter::FramePaint paint;
  paint.textColor = static_cast<TRColor>(props.textColor);
  paint.selectionStart = props.selectionStart;
  paint.selectionEnd = props.selectionEnd;
  paint.selectionColor = static_cast<TRColor>(props.selectionColor);
  if (props.scrollable) {
    // The window of the text that is in view, in layout units; only those lines are painted.
    paint.isWindowed = true;
    paint.visible = TRRect{TRPoint{0, static_cast<float>(offsetY)}, TRSize{static_cast<float>(self.bounds.size.width), static_cast<float>(height)}};
    CGContextTranslateCTM(context, 0, -offsetY);
  }

  // The scale of the display is the render scale: one glyph pixel is one device pixel.
  CGFloat scale = self.contentScaleFactor > 0 ? self.contentScaleFactor : UIScreen.mainScreen.scale;
  tehreer::ios::CoreGraphicsPainter target(context, static_cast<float>(scale));
  _painter->Draw(frame, target, static_cast<float>(scale), paint);
  TRComposedFrameRelease(frame);
}

// Core drew the frame's lines, runs and glyphs into a layout of its own: the view only provides
// the context. The frame is shared and immutable, and the state keeps it alive while it is drawn.
- (void)drawRect:(CGRect)rect
{
  if (_scrollView != nil) {
    return;
  }
  [self paintInto:UIGraphicsGetCurrentContext() offsetY:0 height:self.bounds.size.height];
}

- (void)scrollViewDidScroll:(UIScrollView *)scrollView
{
  [self updateCanvasFrame];
  if (_eventEmitter) {
    std::static_pointer_cast<const TehreerTextBaseEventEmitter>(_eventEmitter)
        ->onTextScroll({.x = 0, .y = static_cast<Float>(scrollView.contentOffset.y)});
  }
}

- (void)handleTap:(UITapGestureRecognizer *)recognizer
{
  if (!_eventEmitter) {
    return;
  }
  CGPoint point = [recognizer locationInView:self];
  // The text starts at the top of the content, so a scrolled view adds its offset.
  CGFloat y = point.y + (_scrollView != nil ? _scrollView.contentOffset.y : 0);
  std::static_pointer_cast<const TehreerTextBaseEventEmitter>(_eventEmitter)
      ->onTextTap({.x = static_cast<Float>(point.x), .y = static_cast<Float>(y)});
}

// Lets go of the frame and the text of the state that the view holds, when the view is unmounted; a painter that is drawing it has its own reference.
- (void)retireFrame
{
  if (_state && _state->getData().frame) {
    // The node is going away: its text goes with the frame.
    _state->getData().frame->Retire(true);
  }
}

- (void)prepareForRecycle
{
  [self retireFrame];
  _state.reset();
  _painter->Reset();
  [self setUpScrollingFor:NO];
  [self setNeedsDisplay];
  [super prepareForRecycle];
}

@end

// The class name that RCTThirdPartyComponentsProvider (generated from codegenConfig) looks up.
Class<RCTComponentViewProtocol> TehreerTextBaseViewCls(void)
{
  return TehreerTextBaseView.class;
}
