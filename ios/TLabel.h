#import <React/RCTViewComponentView.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * The native view of the `TLabel` component, as the label of Tehreer-Cocoa: it holds the typesetter,
 * lays the text out for the size it is given, and draws the frame with a renderer and the `CGContext`
 * painter. React Native only gives it its props and its size.
 */
@interface TLabel : RCTViewComponentView
@end

NS_ASSUME_NONNULL_END
