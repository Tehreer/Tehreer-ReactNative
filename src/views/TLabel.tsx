import { forwardRef, useCallback, useImperativeHandle } from "react";
import type { LayoutChangeEvent, NativeSyntheticEvent, StyleProp, ViewStyle } from "react-native";
import TLabelNativeComponent from "../specs/TLabelNativeComponent.js";
import type { Rect } from "../geometry.js";
import type { ComposedFrame } from "../layout/ComposedFrame.js";
import type { BreakMode, TruncationPlace } from "../layout/enums.js";
import { indexOfCodeUnit } from "./FrameQueries.js";
import { resolveFrameSettings, toNativeRenderer, toNativeSettings } from "./shared.js";
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
  readonly testID?: string;
  /** Called when the label is tapped, with the code unit under the finger, or `undefined` if there is no character there. */
  readonly onTap?: (index: number | undefined) => void;
  /** Called with the size that the layout chose, in layout units. */
  readonly onLayout?: (event: LayoutChangeEvent) => void;
  /** Called when the native label has laid its text out, with the size of its frame. */
  readonly onFrameReady?: (event: { lineCount: number; width: number; height: number }) => void;
}

/** What a reference to a `TLabel` gives. */
export interface TLabelHandle {
  /**
   * The frame that is shown, or `undefined` when the label has no size yet. JavaScript makes it with
   * the typesetter and the size of the label when it is asked for, as the native label does, and
   * releases it when the label lays out again.
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
 * A label that draws text with Tehreer. What the stroke or the shadow draws beyond the box of the
 * label is clipped at its bounds (there is no padding to draw it in), so leave room with the style. Core lays the text out natively in the measure function of
 * the layout, so the label has its size on the first pass and no JavaScript is involved while it is
 * measured. The typeface, size, color, alignment, line limit and truncation are Core's settings of
 * the frame resolver, set as they are.
 *
 * Not mirrored from the other wrappers: `verticalAlignment` (Web), `highlights` and `highlightColor`
 * (a label has no line views to paint them in, and Tehreer-Android and Tehreer-Cocoa have none
 * either), `onPressChange` and `onHoverChange`.
 */
export const TLabel = forwardRef<TLabelHandle, TLabelProps>(function TLabel(props, ref) {
  const { style, testID, onTap, onFrameReady, onLayout: onLayoutProp } = props;
  const renderer = toNativeRenderer(props);
  const settings = resolveFrameSettings({ ...props, maxLines: props.maxLines });
  const { typesetter, onLayout: onTextLayout, getComposedFrame } = useTextView(props, settings, false);

  useImperativeHandle(ref, () => ({
    get composedFrame() {
      return getComposedFrame();
    },
    indexOfCodeUnit: (x, y) => {
      const frame = getComposedFrame();
      return frame === undefined ? undefined : indexOfCodeUnit(frame, x, y);
    },
    getSelectionRects: (fromIndex, toIndex) => getComposedFrame()?.getSelectionRects(fromIndex, toIndex) ?? [],
  }), [getComposedFrame]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    onTextLayout(event);
    onLayoutProp?.(event);
  }, [onTextLayout, onLayoutProp]);

  const handleTap = useCallback((event: NativeSyntheticEvent<{ x: number; y: number }>) => {
    const frame = getComposedFrame();
    onTap?.(frame === undefined ? undefined : indexOfCodeUnit(frame, event.nativeEvent.x, event.nativeEvent.y));
  }, [onTap, getComposedFrame]);

  const handleFrameReady = useCallback((event: NativeSyntheticEvent<{ lineCount: number; width: number; height: number }>) => {
    onFrameReady?.(event.nativeEvent);
  }, [onFrameReady]);

  // Nothing is mounted until the typesetter exists, so that the native view never lays out an empty
  // text and reports it.
  if (typesetter === undefined) {
    return null;
  }

  return (
    <TLabelNativeComponent
      testID={testID}
      style={style}
      typesetterId={typesetter.id}
      frameSettings={toNativeSettings(settings)}
      rendererInts={renderer.ints}
      rendererFloats={renderer.floats}
      onLayout={handleLayout}
      onFrameReady={onFrameReady === undefined ? undefined : handleFrameReady}
      onTextTap={onTap === undefined ? undefined : handleTap}
    />
  );
});
