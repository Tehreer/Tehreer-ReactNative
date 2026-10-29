import { forwardRef, useEffect, useImperativeHandle } from "react";
import type { GestureResponderEvent, LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";
import TLinePaintNativeComponent from "../specs/TLinePaintNativeComponent.js";
import type { Rect } from "../geometry.js";
import type { ComposedFrame } from "../layout/ComposedFrame.js";
import type { BreakMode, TruncationPlace } from "../layout/enums.js";
import { indexOfCodeUnit } from "./FrameQueries.js";
import { resolveFrameSettings, toNativeRenderer } from "./shared.js";
import type { ParagraphProps, RenderingProps, TextSource } from "./shared.js";
import { useTextView } from "./useTextView.js";

/** The properties of a `TLabel`, which are the ones of the labels of Tehreer-Android, Tehreer-Cocoa and Tehreer-Web. */
export interface TLabelProps extends TextSource, RenderingProps, ParagraphProps {
  /** How the last line is truncated in case of overflow. The default is `BreakMode.Line`. */
  readonly truncationMode?: BreakMode;
  /** Where the last line is truncated. It takes effect when `isTruncationEnabled` is set. */
  readonly truncationPlace?: TruncationPlace;
  /** Whether to truncate the last line in case of overflow. The default is `false`. */
  readonly isTruncationEnabled?: boolean;
  /** The most lines to show. The default is no limit. */
  readonly maxLines?: number;
  /**
   * The style of the label. It is as wide as its text up to `maxWidth`; give it `alignSelf:
   * "stretch"` (or a `maxWidth` with `alignSelf: "flex-start"`) to wrap.
   */
  readonly style?: StyleProp<ViewStyle>;
  /** The identifier that tests use to find the view. */
  readonly testID?: string;
  /** Called when the label is tapped, with the code unit under the finger, or `undefined` if there is no character there. */
  readonly onTap?: (index: number | undefined) => void;
  /** Called with the size that the layout chose, in layout units. */
  readonly onLayout?: (event: LayoutChangeEvent) => void;
  /** Called when the text has been laid out for the size of the label, with the size of its frame. */
  readonly onFrameReady?: (event: { lineCount: number; width: number; height: number }) => void;
}

/** What a reference to a `TLabel` gives. */
export interface TLabelHandle {
  /**
   * The frame that is shown, or `undefined` when the label has no size yet. It is made with the
   * typesetter and the size of the label, and released when the label lays out again.
   */
  readonly composedFrame: ComposedFrame | undefined;
  /**
   * Finds the code unit under a position of the label, in layout units from its top left.
   *
   * @returns The index, or `undefined` if there is no character at the position.
   * @throws RangeError if `x` or `y` is NaN.
   */
  indexOfCodeUnit(x: number, y: number): number | undefined;
  /** Returns the rectangles of code units, in the coordinates of the label. */
  getSelectionRects(fromIndex: number, toIndex: number): Rect[];
}

/**
 * A label that draws text with Tehreer. The size comes from Core in the measure function of the
 * layout (C++, on the thread that commits), so the label has its size on the first pass. Then
 * JavaScript lays the text out for that size, and a native view draws the frame: nothing else of the
 * label is native. What the stroke or the shadow draws beyond the box of the label is clipped at its
 * bounds (there is no padding to draw it in), so leave room with the style. The typeface, size,
 * color, alignment, line limit and truncation are Core's settings of the frame resolver, set as they are.
 *
 * Not mirrored from the other wrappers: `verticalAlignment` (Web), `highlights` and `highlightColor`
 * (a label has no line views to paint them in, and Tehreer-Android and Tehreer-Cocoa have none
 * either), `onPressChange` and `onHoverChange`.
 */
export const TLabel = forwardRef<TLabelHandle, TLabelProps>(function TLabel(props, ref) {
  const { style, testID, onTap, onFrameReady, onLayout: onLayoutProp } = props;
  const renderer = toNativeRenderer(props);
  const settings = resolveFrameSettings(props);
  const { typesetter, onLayout: onTextLayout, getComposedFrame, frame, composedFrameId } = useTextView(props, settings, false);

  useImperativeHandle(ref, () => ({
    get composedFrame() {
      return getComposedFrame();
    },
    indexOfCodeUnit: (x, y) => {
      const known = getComposedFrame();
      return known === undefined ? undefined : indexOfCodeUnit(known, x, y);
    },
    getSelectionRects: (fromIndex, toIndex) => getComposedFrame()?.getSelectionRects(fromIndex, toIndex) ?? [],
  }), [getComposedFrame]);

  const lineCount = frame?.lines.length ?? 0;
  const width = frame?.width;
  const height = frame?.height;
  useEffect(() => {
    if (width !== undefined && height !== undefined) {
      onFrameReady?.({ lineCount, width, height });
    }
    // Reported when the frame is made again, not when the callback changes identity.
  }, [composedFrameId]);

  const handleLayout = (event: LayoutChangeEvent) => {
    onTextLayout(event);
    onLayoutProp?.(event);
  };

  const handleRelease = (event: GestureResponderEvent) => {
    const known = getComposedFrame();
    onTap?.(known === undefined ? undefined : indexOfCodeUnit(known, event.nativeEvent.locationX, event.nativeEvent.locationY));
  };

  // Nothing is mounted until the typesetter exists, so that no empty text is laid out and reported.
  if (typesetter === undefined) {
    return null;
  }

  return (
    <TLinePaintNativeComponent
      testID={testID}
      style={style}
      typesetterId={typesetter.id}
      {...settings}
      composedFrameId={composedFrameId}
      firstLine={0}
      lineCount={lineCount}
      originX={0}
      originY={0}
      {...renderer}
      onLayout={handleLayout}
      onStartShouldSetResponder={onTap === undefined ? undefined : () => true}
      onResponderRelease={onTap === undefined ? undefined : handleRelease}
    />
  );
});
