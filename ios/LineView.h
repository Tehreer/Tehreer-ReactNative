#import <UIKit/UIKit.h>

#include <Tehreer/Tehreer.h>

#include <vector>

/** A rectangle of a highlight, in the coordinates of the text. */
struct LineHighlight {
  TRRect rect;
  TRColor color;
};

/**
 * Draws one line of a text, as `LineView` of Tehreer-Cocoa does: the view is as big as the box of the
 * line (its ink included) and sits at that place in its container, so it draws the separator, the
 * highlights that fall on the line, and the line itself, relative to its own frame.
 */
@interface LineView : UIView
/** The line, retained; `NULL` for a view in the pool. */
@property (nonatomic) TRComposedLineRef line;
/** The renderer of this view; the text view makes one for each line view, as Tehreer-Android does. */
@property (nonatomic, readonly) TRRendererRef renderer;
@property (nonatomic) CGFloat layoutWidth;
/** `0xAARRGGBB`; 0 for no separator. */
@property (nonatomic) TRColor separatorColor;
@property (nonatomic) TRColor textColor;
- (void)setHighlights:(std::vector<LineHighlight>)highlights;
@end
