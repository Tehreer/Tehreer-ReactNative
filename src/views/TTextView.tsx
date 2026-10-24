import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { LayoutChangeEvent, NativeSyntheticEvent, StyleProp, ViewStyle } from "react-native";
import TTextViewNativeComponent from "../specs/TTextViewNativeComponent.js";
import type { Rect } from "../geometry.js";
import type { ComposedFrame } from "../layout/ComposedFrame.js";
import { checkScrollCodeUnit, checkScrollOffset, getCaretPosition, getCodeUnitAtOffset, getLineTop, indexOfCodeUnit } from "./FrameQueries.js";
import type { CaretPosition } from "./FrameQueries.js";
import { findLinks, linkAt } from "./Links.js";
import { resolveFrameSettings, toColor, toNativeColor, toNativeHighlights, toNativeSettings } from "./shared.js";
import type { ColorValue, ParagraphProps, RenderingProps, TextHighlight, TextSource } from "./shared.js";
import { useTextView } from "./useTextView.js";

/** The properties of a `TTextView`, which are the ones of the text views of Tehreer-Android, Tehreer-Cocoa and Tehreer-Web. */
export interface TTextViewProps extends TextSource, RenderingProps, ParagraphProps {
  /** Whether to justify the lines of the text. The default is `false`. */
  readonly isJustificationEnabled?: boolean;
  /** How much of the extra space of a line is spread, from 0 to 1. The default is 1. */
  readonly justificationLevel?: number;
  /** The color of a line drawn below each line of text. There is none by default. */
  readonly separatorColor?: ColorValue;
  /** The color of the highlights that have none of their own. The default is a translucent blue. */
  readonly highlightColor?: ColorValue;
  /**
   * Ranges to cover with a color, behind the text, such as a selected verse. They only repaint: the
   * text is not laid out again, so they can follow a finger.
   */
  readonly highlights?: readonly TextHighlight[];
  /** Whether the runs of the attributed text that have a `userData` are links. The default is `true`. */
  readonly isLinkInteractionEnabled?: boolean;
  /**
   * Called when a link is tapped. A link is a run of the attributed text whose `userData` is not zero.
   *
   * @param userData The `userData` of the run.
   * @param fromIndex The first code unit of the run.
   * @param toIndex The index after the last code unit of the run.
   */
  readonly onLinkClick?: (userData: number, fromIndex: number, toIndex: number) => void;
  /**
   * The style of the view. The view scrolls what does not fit its height, so give it a height or
   * `flex: 1`; its width is the width the style gives, and the text is laid out for it.
   */
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
  /** Called when the text is tapped, with the code unit under the finger, or `undefined` if there is no character there. */
  readonly onTap?: (index: number | undefined) => void;
  /** Called while the text scrolls, with the distance of its top from the top of the text. */
  readonly onScroll?: (scrollTop: number) => void;
  /** Called with the size that the layout chose, in layout units. */
  readonly onLayout?: (event: LayoutChangeEvent) => void;
  /** Called when the native view has laid its text out, with the size of its frame. */
  readonly onFrameReady?: (event: { lineCount: number; width: number; height: number }) => void;
}

/** What a reference to a `TTextView` gives. */
export interface TTextViewHandle {
  /** The frame laid out for the whole text, or `undefined` when the view has no size yet; see `TLabelHandle`. */
  readonly composedFrame: ComposedFrame | undefined;
  /** The index of the first code unit that is visible, or `undefined` when there is no text. */
  readonly firstVisibleCodeUnitIndex: number | undefined;
  /**
   * Finds the code unit under a position of the text, in layout units from its top left, where the
   * top of the text is the top of its first line, whatever is scrolled.
   *
   * @returns The index, or `undefined` if there is no character at the position.
   * @throws RangeError if `x` or `y` is NaN.
   */
  indexOfCodeUnit(x: number, y: number): number | undefined;
  /** Returns the rectangles of code units, in the coordinates of the text. */
  getSelectionRects(fromIndex: number, toIndex: number): Rect[];
  /**
   * Where the insertion point of a code unit boundary is (`startIndex` to `endIndex` of the text),
   * from Core's caret math, so it is right inside right-to-left runs too.
   */
  getCaretPosition(index: number): CaretPosition | undefined;
  /**
   * Scrolls the line of a code unit to the top of the view.
   *
   * @throws RangeError if the index is not a whole number from 0.
   */
  scrollToCodeUnit(index: number): void;
  /**
   * Scrolls to a distance from the top of the text, which is limited to what the text allows.
   *
   * @throws RangeError if the offset is not a finite number.
   */
  scrollToOffset(offset: number): void;
}

/**
 * A view of long text, drawn with Tehreer. The text is laid out once for the width of the view,
 * natively, and the view keeps a view for each line that is in sight (found with Core's line
 * locator), so scrolling lays nothing out. Hit testing, selection rectangles and carets ask Core
 * about a frame that JavaScript makes with the same inputs, so they follow the bidirectional order of
 * the lines.
 *
 * Not mirrored from the other wrappers: `typesetter`, the stroke and shadow settings, the
 * highlight of a pressed link, and views in the text.
 */
export const TTextView = forwardRef<TTextViewHandle, TTextViewProps>(function TTextView(props, ref) {
  const {
    textColor, separatorColor, highlightColor, highlights, isLinkInteractionEnabled = true, onLinkClick, style, testID, onTap,
    onScroll, onFrameReady, onLayout: onLayoutProp, attributedText,
  } = props;
  const settings = resolveFrameSettings(props);
  const { typesetter, onLayout: onTextLayout, getComposedFrame } = useTextView(props, settings, true);
  const links = useMemo(() => findLinks(attributedText), [attributedText]);
  const offset = useRef(0);
  const viewport = useRef(0);
  // What the scroll request needs, all resolved here: the native view goes where it is told.
  const content = useRef(0);
  const pending = useRef<{ offset?: number; codeUnit?: number }>({});
  const [request, setRequest] = useState({ offset: 0, token: 0 });

  const send = useCallback((distance: number) => {
    const limit = Math.max(0, content.current - viewport.current);
    setRequest((previous) => ({ offset: Math.min(Math.max(0, distance), limit), token: previous.token + 1 }));
  }, []);

  // A request that comes before the first frame waits for it, because what it needs is not known yet.
  const scrollToCodeUnit = useCallback((index: number) => {
    const frame = content.current > 0 ? getComposedFrame() : undefined;
    const top = frame === undefined ? undefined : getLineTop(frame, index);
    if (top === undefined) {
      pending.current = { codeUnit: index };
    } else {
      send(top);
    }
  }, [getComposedFrame, send]);

  const scrollToOffset = useCallback((distance: number) => {
    if (content.current > 0) {
      send(distance);
    } else {
      pending.current = { offset: distance };
    }
  }, [send]);

  useImperativeHandle(ref, () => ({
    get composedFrame() {
      return getComposedFrame();
    },
    get firstVisibleCodeUnitIndex() {
      const frame = getComposedFrame();
      return frame === undefined ? undefined : getCodeUnitAtOffset(frame, offset.current);
    },
    indexOfCodeUnit: (x, y) => {
      const frame = getComposedFrame();
      return frame === undefined ? undefined : indexOfCodeUnit(frame, x, y);
    },
    getSelectionRects: (fromIndex, toIndex) => getComposedFrame()?.getSelectionRects(fromIndex, toIndex) ?? [],
    getCaretPosition: (index) => {
      const frame = getComposedFrame();
      return frame === undefined ? undefined : getCaretPosition(frame, index);
    },
    scrollToCodeUnit: (index) => scrollToCodeUnit(checkScrollCodeUnit(index)),
    scrollToOffset: (distance) => scrollToOffset(checkScrollOffset(distance)),
  }), [getComposedFrame, scrollToCodeUnit, scrollToOffset]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    viewport.current = event.nativeEvent.layout.height;
    onTextLayout(event);
    onLayoutProp?.(event);
  }, [onTextLayout, onLayoutProp]);

  const handleFrameReady = useCallback((event: NativeSyntheticEvent<{ lineCount: number; width: number; height: number }>) => {
    content.current = event.nativeEvent.height;
    const waiting = pending.current;
    pending.current = {};
    if (waiting.offset !== undefined) {
      scrollToOffset(waiting.offset);
    } else if (waiting.codeUnit !== undefined) {
      scrollToCodeUnit(waiting.codeUnit);
    }
    onFrameReady?.(event.nativeEvent);
  }, [onFrameReady, scrollToOffset, scrollToCodeUnit]);

  const handleTap = useCallback((event: NativeSyntheticEvent<{ x: number; y: number }>) => {
    const frame = getComposedFrame();
    const index = frame === undefined ? undefined : indexOfCodeUnit(frame, event.nativeEvent.x, event.nativeEvent.y);
    onTap?.(index);
    const link = isLinkInteractionEnabled ? linkAt(links, index) : undefined;
    if (link !== undefined) {
      onLinkClick?.(link.userData, link.fromIndex, link.toIndex);
    }
  }, [getComposedFrame, onTap, isLinkInteractionEnabled, links, onLinkClick]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<{ y: number }>) => {
    offset.current = event.nativeEvent.y;
    onScroll?.(event.nativeEvent.y);
  }, [onScroll]);

  if (typesetter === undefined) {
    return null;
  }

  return (
    <TTextViewNativeComponent
      testID={testID}
      style={style}
      typesetterId={typesetter.id}
      frameSettings={toNativeSettings(settings)}
      textColor={toNativeColor(textColor, 0xff000000)}
      separatorColor={separatorColor === undefined ? 0 : toColor(separatorColor) | 0}
      highlights={toNativeHighlights(highlights, highlightColor)}
      scrollToOffset={request.offset}
      scrollToToken={request.token}
      onLayout={handleLayout}
      onFrameReady={handleFrameReady}
      onTextTap={onTap === undefined && onLinkClick === undefined ? undefined : handleTap}
      onTextScroll={handleScroll}
    />
  );
});
