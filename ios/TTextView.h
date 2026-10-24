#import <React/RCTViewComponentView.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * The native view of the `TTextView` component, as the text view of Tehreer-Cocoa: a scroll view that
 * holds the typesetter, lays the whole text out once for its width (off the main thread), and keeps a
 * `LineView` for each line that is in sight, found with the line locator.
 */
@interface TTextView : RCTViewComponentView
@end

NS_ASSUME_NONNULL_END
