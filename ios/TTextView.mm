#import "TTextView.h"

#import "LineView.h"
#import "painter/PaintCallbacks.h"
#import "views/ComponentDescriptors.h"
#import "views/RendererSettings.h"
#import "views/TextLayout.h"
#import "views/Typesetters.h"

#include <algorithm>
#include <atomic>
#include <cmath>
#include <memory>
#include <vector>

using namespace facebook::react;
using namespace tehreer::views;

namespace {

void CollectLine(void *userData, TRUInteger lineIndex, TRBoolean *)
{
  static_cast<std::vector<TRUInteger> *>(userData)->push_back(lineIndex);
}

void CollectRect(void *userData, TRRect rect, TRBoolean *)
{
  static_cast<std::vector<TRRect> *>(userData)->push_back(rect);
}

} // namespace

@interface TTextView () <UIScrollViewDelegate>
@end

@implementation TTextView {
  UIScrollView *_scrollView;
  TRTypesetterRef _typesetter;
  int _typesetterId;
  FrameSettings _settings;
  RendererSettings _rendering;
  TRColor _separatorColor;
  std::vector<int> _highlights;

  // What the layout made, for the width of the view. A layout that is still running is told apart
  // from an older one by its generation.
  TRComposedFrameRef _frame;
  TRLineLocatorRef _locator;
  CGFloat _frameWidth;
  // Read by the layout queue to skip a layout that was replaced while it waited, so atomic (the only
  // field that two threads share). The block holds the counter and not the view, so the last release of
  // the view is always on the main thread, where UIKit may be touched.
  std::shared_ptr<std::atomic<NSUInteger>> _generation;

  NSMutableDictionary<NSNumber *, LineView *> *_attached;
  NSMutableArray<LineView *> *_pool;
  std::vector<tehreer::ios::LineHighlight> _highlightRects;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<TTextViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const TTextViewProps>();
    _props = defaultProps;

    _scrollView = [[UIScrollView alloc] initWithFrame:self.bounds];
    _scrollView.delegate = self;
    _scrollView.showsHorizontalScrollIndicator = NO;
    _scrollView.alwaysBounceVertical = YES;
    // The text starts at the top of the view, not below the status bar: no inset is added, or the view
    // would start at a negative offset and tell JavaScript so.
    _scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
    [self addSubview:_scrollView];
    self.clipsToBounds = YES;

    _generation = std::make_shared<std::atomic<NSUInteger>>(0);
    _attached = [NSMutableDictionary new];
    _pool = [NSMutableArray new];
    [self addGestureRecognizer:[[UITapGestureRecognizer alloc] initWithTarget:self action:@selector(handleTap:)]];
  }
  return self;
}

- (void)dealloc
{
  [self releaseAll];
}

// Lets go of everything that this view owns: the lines, the frame, the locator and the typesetter.
- (void)releaseAll
{
  (*_generation)++;
  [self releaseLayout];
  if (_typesetter != nullptr) {
    TRTypesetterRelease(_typesetter);
    _typesetter = nullptr;
  }
  _typesetterId = 0;
}

- (void)releaseLayout
{
  for (LineView *lineView in _attached.allValues) {
    lineView.line = nullptr;
    [lineView removeFromSuperview];
    [_pool addObject:lineView];
  }
  [_attached removeAllObjects];
  if (_locator != nullptr) {
    TRLineLocatorRelease(_locator);
    _locator = nullptr;
  }
  if (_frame != nullptr) {
    TRComposedFrameRelease(_frame);
    _frame = nullptr;
  }
  _highlightRects.clear();
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &next = static_cast<const TTextViewProps &>(*props);
  const auto previous = std::static_pointer_cast<const TTextViewProps>(oldProps);
  [super updateProps:props oldProps:oldProps];

  const FrameSettings settings = FrameSettings::From(next.frameSettings.data(), next.frameSettings.size());
  const bool needsLayout = next.typesetterId != _typesetterId || next.frameSettings != (previous ? previous->frameSettings : std::vector<Float>());
  if (next.typesetterId != _typesetterId) {
    [self releaseAll];
    _typesetterId = next.typesetterId;
    _typesetter = Typesetters::Retain(_typesetterId);
  }
  _settings = settings;
  const bool renderingChanged = !previous || next.rendererInts != previous->rendererInts || next.rendererFloats != previous->rendererFloats;
  _rendering = RendererSettings::From(next.rendererInts.data(), next.rendererInts.size(), next.rendererFloats.data(), next.rendererFloats.size());
  _separatorColor = static_cast<TRColor>(next.separatorColor);
  _highlights = next.highlights;

  if (needsLayout) {
    [self startLayout];
  } else {
    [self updateHighlights];
    [self layoutLines];
  }
  if (renderingChanged) {
    for (LineView *lineView in _attached.allValues) {
      [lineView setRendering:_rendering];
    }
  }

  // JavaScript has made the offset a finite number inside the text; a new token asks to go there.
  if (previous && next.scrollToToken != previous->scrollToToken && std::isfinite(next.scrollToOffset)) {
    [_scrollView setContentOffset:CGPointMake(0, next.scrollToOffset) animated:next.scrollToAnimated];
  }
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  _scrollView.frame = self.bounds;
  if (std::abs(self.bounds.size.width - _frameWidth) > 0.001) {
    [self startLayout];
  } else {
    [self layoutLines];
  }
}

// Lays the whole text out for the width of the view on a queue of its own, as `TextLayoutTasks` does
// in Tehreer-Android, and shows it when it is done if nothing else was asked meanwhile.
- (void)startLayout
{
  const CGFloat width = self.bounds.size.width;
  if (_typesetter == nullptr || width <= 0) {
    // Nothing to lay out, and nothing shown that would have to go (this runs for every change of the
    // layout metrics, also while the width is still 0).
    if (_frame != nullptr || _generation->load() != 0) {
      (*_generation)++;
      [self releaseLayout];
    }
    return;
  }
  (*_generation)++;

  const NSUInteger generation = _generation->load();
  const std::shared_ptr<std::atomic<NSUInteger>> counter = _generation;
  TRTypesetterRef typesetter = TRTypesetterRetain(_typesetter);
  const FrameSettings settings = _settings;
  const float scale = UIScreen.mainScreen.scale;
  __weak TTextView *weakSelf = self;
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    // A layout that was replaced while it waited in the queue is not made.
    if (counter->load() != generation) {
      TRTypesetterRelease(typesetter);
      return;
    }
    TRComposedFrameRef frame = ComposeFrame(typesetter, width, 0, settings, true, false);
    TRLineLocatorRef locator = nullptr;
    if (frame != nullptr) {
      // The ink boxes are measured by a renderer of its own: a renderer is used by one thread at a time.
      TRRendererRef renderer = TRRendererCreate();
      TRRendererSetRenderScale(renderer, scale);
      locator = TRLineLocatorCreate(frame, renderer);
      TRRendererRelease(renderer);
    }
    TRTypesetterRelease(typesetter);

    dispatch_async(dispatch_get_main_queue(), ^{
      TTextView *strongSelf = weakSelf;
      if (strongSelf == nil || strongSelf->_generation->load() != generation) {
        if (locator != nullptr) {
          TRLineLocatorRelease(locator);
        }
        if (frame != nullptr) {
          TRComposedFrameRelease(frame);
        }
        return;
      }
      [strongSelf showFrame:frame locator:locator width:width];
    });
  });
}

- (void)showFrame:(TRComposedFrameRef)frame locator:(TRLineLocatorRef)locator width:(CGFloat)width
{
  [self releaseLayout];
  _frame = frame;
  _locator = locator;
  _frameWidth = width;
  _scrollView.contentSize = CGSizeMake(width, frame != nullptr ? TRComposedFrameGetHeight(frame) : 0);
  [self updateHighlights];
  [self layoutLines];

  if (frame != nullptr && _eventEmitter) {
    std::static_pointer_cast<const TTextViewEventEmitter>(_eventEmitter)
        ->onFrameReady({.lineCount = static_cast<int>(TRComposedFrameGetLineCount(frame)),
                        .width = TRComposedFrameGetWidth(frame),
                        .height = TRComposedFrameGetHeight(frame)});
  }
}

// The rectangles of every highlight, in the coordinates of the text, which the line views clip to their lines.
- (void)updateHighlights
{
  _highlightRects.clear();
  if (_frame != nullptr) {
    for (size_t i = 0; i + 2 < _highlights.size(); i += 3) {
      std::vector<TRRect> rects;
      const TRUInteger from = static_cast<TRUInteger>(std::max(0, _highlights[i]));
      const TRUInteger to = static_cast<TRUInteger>(std::max(0, _highlights[i + 1]));
      if (to > from) {
        TRComposedFrameEnumerateSelection(_frame, from, to - from, CollectRect, &rects);
      }
      for (const TRRect &rect : rects) {
        _highlightRects.push_back({rect, static_cast<TRColor>(_highlights[i + 2])});
      }
    }
  }
  for (LineView *lineView in _attached.allValues) {
    [lineView setHighlights:_highlightRects];
    lineView.separatorColor = _separatorColor;
    [lineView setRendering:_rendering];
  }
}

// Keeps a view for each line that meets the visible rectangle, a screen above and below included.
- (void)layoutLines
{
  if (_frame == nullptr || _locator == nullptr) {
    return;
  }

  const CGFloat height = self.bounds.size.height;
  const CGRect visible = CGRectMake(0, std::max<CGFloat>(0, _scrollView.contentOffset.y - height / 2), _frameWidth, height * 2);
  std::vector<TRUInteger> indices;
  TRLineLocatorEnumerateLines(_locator, TRRect{TRPoint{0, static_cast<float>(visible.origin.y)}, TRSize{static_cast<float>(visible.size.width), static_cast<float>(visible.size.height)}},
                              CollectLine, &indices);

  NSMutableSet<NSNumber *> *wanted = [NSMutableSet new];
  for (TRUInteger index : indices) {
    [wanted addObject:@(index)];
  }
  for (NSNumber *key in _attached.allKeys) {
    if (![wanted containsObject:key]) {
      LineView *lineView = _attached[key];
      lineView.line = nullptr;
      [lineView removeFromSuperview];
      [_pool addObject:lineView];
      [_attached removeObjectForKey:key];
    }
  }

  for (TRUInteger index : indices) {
    if (_attached[@(index)] != nil) {
      continue;
    }
    TRRect box;
    TRComposedLineRef line = TRComposedFrameGetLine(_frame, index);
    if (line == nullptr || !TRLineLocatorGetLineBox(_locator, index, &box)) {
      continue;
    }
    LineView *lineView = _pool.lastObject ?: [[LineView alloc] initWithFrame:CGRectZero];
    [_pool removeLastObject];
    lineView.layoutWidth = _frameWidth;
    lineView.separatorColor = _separatorColor;
    [lineView setRendering:_rendering];
    lineView.frame = CGRectMake(box.origin.x, box.origin.y, box.size.width, box.size.height);
    [lineView setHighlights:_highlightRects];
    lineView.line = line;
    [_scrollView addSubview:lineView];
    _attached[@(index)] = lineView;
  }
}

- (void)scrollViewDidScroll:(UIScrollView *)scrollView
{
  [self layoutLines];
  if (_eventEmitter) {
    std::static_pointer_cast<const TTextViewEventEmitter>(_eventEmitter)->onTextScroll({.x = 0, .y = static_cast<Float>(std::max<CGFloat>(0, scrollView.contentOffset.y))});
  }
}

- (void)handleTap:(UITapGestureRecognizer *)recognizer
{
  if (_eventEmitter) {
    // In the coordinates of the text, so the scroll offset is in the point already.
    const CGPoint point = [recognizer locationInView:_scrollView];
    std::static_pointer_cast<const TTextViewEventEmitter>(_eventEmitter)->onTextTap({.x = static_cast<Float>(point.x), .y = static_cast<Float>(point.y)});
  }
}

- (void)prepareForRecycle
{
  [self releaseAll];
  _scrollView.contentOffset = CGPointZero;
  _scrollView.contentSize = CGSizeZero;
  _frameWidth = 0;
  [super prepareForRecycle];
}

@end

// The class name that RCTThirdPartyComponentsProvider (generated from codegenConfig) looks up.
Class<RCTComponentViewProtocol> TTextViewCls(void)
{
  return TTextView.class;
}
