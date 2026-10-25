#import <React/RCTViewComponentView.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * The native view of the `TLinePaint` component: it draws some lines of a registered frame with the
 * `CGContext` painter, and does nothing else. JavaScript lays the text out, scrolls it, handles
 * taps and decides which lines are mounted (see `src/views/`).
 */
@interface TLinePaint : RCTViewComponentView
@end

NS_ASSUME_NONNULL_END
