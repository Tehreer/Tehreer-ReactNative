import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import type { LayoutChangeEvent, NativeSyntheticEvent, StyleProp, ViewStyle } from "react-native";
import type { Rect } from "../geometry.js";
import type { ComposedFrame } from "../layout/ComposedFrame.js";
import { TextAlignment } from "../layout/enums.js";
import { checkScrollCodeUnit, checkScrollOffset, getCaretPosition, getCodeUnitAtOffset, getLineTop, indexOfCodeUnit } from "./FrameQueries.js";
import type { CaretPosition } from "./FrameQueries.js";
import { acquireFrame, withFrame } from "./TLabel.js";
import { TextBase } from "./TextBase.js";
import { toNativeColor, useViewText } from "./useViewText.js";
import type { ColorValue, TextViewLayout, TextViewSource } from "./useViewText.js";

/** A range of code units to cover with a color, behind the text, such as a selection. */
export interface TextSelection {
  readonly fromIndex: number;
  readonly toIndex: number;
}

/** The properties of a `TTextView`, which are the ones of the text views of Tehreer-Android, Tehreer-Cocoa and Tehreer-Web. */
export interface TTextViewProps extends TextViewSource, TextViewLayout {
  /** Whether to justify the lines of the text. The default is `false`. */
  readonly isJustificationEnabled?: boolean;
  /** How much of the extra space of a line is spread, from 0 to 1. The default is 1. */
  readonly justificationLevel?: number;
  /**
   * The range to cover with `selectionColor`. It only repaints: the text is not laid out again, so
   * it can follow a finger. `undefined` clears it.
   */
  readonly selection?: TextSelection;
  /** The color of the selection. The default is a translucent blue. */
  readonly selectionColor?: ColorValue;
  /**
   * The style of the view. The view scrolls what does not fit its height, so give it a height or
   * `flex: 1`; its width is the width the style gives, and the text is laid out for it.
   */
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
  /** Called when the text is tapped, with the code unit under the finger, or `undefined` if there is no character there. */
  readonly onTap?: (index: number | undefined) => void;
  /** Called while the text scrolls, with the distance of the top of the view from the top of the text. */
  readonly onScroll?: (offset: number) => void;
  /** Called when the view has received the frame that Core composed for its width. */
  readonly onFrameReady?: (event: { lineCount: number; width: number; height: number; frameId: number }) => void;
  /** Called with the size the layout chose, in layout units. */
  readonly onLayout?: (event: LayoutChangeEvent) => void;
}

/** What a reference to a `TTextView` gives. */
export interface TTextViewHandle {
  /** The frame laid out for the whole text, as a wrapper the caller disposes; `undefined` when there is none yet. */
  getComposedFrame(): ComposedFrame | undefined;
  /** The index of the first code unit that is visible, or `undefined` when there is no text. */
  readonly firstVisibleCodeUnitIndex: number | undefined;
  /**
   * Finds the code unit under a position of the text, in layout units from its top left, where the
   * top of the text is the top of its first line, whatever is scrolled.
   *
   * @returns The index, or `undefined` if there is no character at the position.
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
   * Scrolls the line of a code unit to the top of the view. Before the first frame the request waits for it.
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
 * A view of long text, drawn with Tehreer. Core lays the whole text out once for the width of the
 * view, natively; the view scrolls by moving a window over that frame and paints only the lines in
 * view (Core's line locator finds them), so scrolling lays nothing out and a change of width is the
 * only thing that does. Hit testing, selection rectangles and carets ask Core about that same
 * frame, so they follow the bidirectional order of the lines.
 */
export const TTextView = forwardRef<TTextViewHandle, TTextViewProps>(function TTextView(props, ref) {
  const {
    textColor, textAlignment, extraLineSpacing, lineHeightMultiplier, isJustificationEnabled, justificationLevel, selection,
    selectionColor, style, testID, onTap, onScroll, onFrameReady, onLayout: onLayoutProp,
  } = props;
  const { viewText, onLayout: onTextLayout } = useViewText(props);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    onTextLayout(event);
    onLayoutProp?.(event);
  }, [onTextLayout, onLayoutProp]);
  const [frameId, setFrameId] = useState(0);
  const frameIdRef = useRef(0);
  frameIdRef.current = frameId;
  const offsetRef = useRef(0);
  const [request, setRequest] = useState({ offset: 0, token: 0 });

  // What the scroll logic needs, all resolved here: the native view just goes where it is told.
  const metrics = useRef({ content: 0, viewport: 0, pending: undefined as number | undefined, pendingCodeUnit: undefined as number | undefined });
  const send = useCallback((offset: number) => {
    const limit = Math.max(0, metrics.current.content - metrics.current.viewport);
    setRequest((previous) => ({ offset: Math.min(Math.max(0, offset), limit), token: previous.token + 1 }));
  }, []);
  const scrollTo = useCallback((requested: number) => {
    const offset = checkScrollOffset(requested);
    // A request that comes before the first frame waits for it, because the limit is not known yet.
    if (metrics.current.content <= 0) {
      metrics.current.pending = offset;
    } else {
      send(offset);
    }
  }, [send]);

  useImperativeHandle(ref, () => ({
    getComposedFrame: () => acquireFrame(frameIdRef.current),
    get firstVisibleCodeUnitIndex() {
      return withFrame(frameIdRef.current, (frame) => getCodeUnitAtOffset(frame, offsetRef.current));
    },
    indexOfCodeUnit: (x, y) => withFrame(frameIdRef.current, (frame) => indexOfCodeUnit(frame, x, y)),
    getSelectionRects: (fromIndex, toIndex) => withFrame(frameIdRef.current, (frame) => frame.getSelectionRects(fromIndex, toIndex)) ?? [],
    getCaretPosition: (index) => withFrame(frameIdRef.current, (frame) => getCaretPosition(frame, index)),
    scrollToCodeUnit: (requested) => {
      const index = checkScrollCodeUnit(requested);
      // Like an offset, a request that comes before the first frame waits for it.
      if (frameIdRef.current === 0) {
        metrics.current.pendingCodeUnit = index;
        return;
      }
      const top = withFrame(frameIdRef.current, (frame) => getLineTop(frame, index));
      if (top !== undefined) {
        scrollTo(top);
      }
    },
    scrollToOffset: scrollTo,
  }), [scrollTo]);

  const handleFrameReady = useCallback((event: NativeSyntheticEvent<{ lineCount: number; width: number; height: number; frameId: number }>) => {
    metrics.current.content = event.nativeEvent.height;
    setFrameId(event.nativeEvent.frameId);
    if (metrics.current.pending !== undefined && metrics.current.content > 0) {
      const pending = metrics.current.pending;
      metrics.current.pending = undefined;
      send(pending);
    }
    const waiting = metrics.current.pendingCodeUnit;
    if (waiting !== undefined && event.nativeEvent.frameId !== 0) {
      metrics.current.pendingCodeUnit = undefined;
      const top = withFrame(event.nativeEvent.frameId, (frame) => getLineTop(frame, waiting));
      if (top !== undefined) {
        send(top);
      }
    }
    onFrameReady?.(event.nativeEvent);
  }, [onFrameReady, send]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    metrics.current.viewport = event.nativeEvent.layout.height;
    onLayout(event);
  }, [onLayout]);

  const handleTap = useCallback((event: NativeSyntheticEvent<{ x: number; y: number }>) => {
    if (onTap !== undefined) {
      onTap(withFrame(frameIdRef.current, (frame) => indexOfCodeUnit(frame, event.nativeEvent.x, event.nativeEvent.y)));
    }
  }, [onTap]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<{ y: number }>) => {
    offsetRef.current = event.nativeEvent.y;
    onScroll?.(event.nativeEvent.y);
  }, [onScroll]);

  // Nothing is mounted until the text exists, so that the native view never composes (and reports)
  // an empty frame before its real one.
  if (viewText === undefined) {
    return null;
  }

  return (
    <TextBase
      testID={testID}
      style={style}
      scrollable
      textId={viewText.id}
      textColor={toNativeColor(textColor, 0xff000000 | 0)}
      textAlignment={textAlignment ?? TextAlignment.Leading}
      extraLineSpacing={extraLineSpacing ?? 0}
      lineHeightMultiplier={lineHeightMultiplier ?? 1}
      justificationEnabled={isJustificationEnabled ?? false}
      justificationLevel={justificationLevel ?? 1}
      selectionStart={selection === undefined ? -1 : selection.fromIndex}
      selectionEnd={selection === undefined ? -1 : selection.toIndex}
      selectionColor={toNativeColor(selectionColor, 0x553390ff)}
      scrollToOffset={request.offset}
      scrollToToken={request.token}
      onLayout={handleLayout}
      onFrameReady={handleFrameReady}
      onTextTap={onTap === undefined ? undefined : handleTap}
      onTextScroll={handleScroll}
    />
  );
});
