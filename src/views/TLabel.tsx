import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import type { ComponentProps } from "react";
import type { LayoutChangeEvent, NativeSyntheticEvent, ViewStyle, StyleProp } from "react-native";
import type { Rect } from "../geometry.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import { ComposedFrame } from "../layout/ComposedFrame.js";
import { BreakMode, TextAlignment, TruncationPlace } from "../layout/enums.js";
import { indexOfCodeUnit } from "./FrameQueries.js";
import { TextBase } from "./TextBase.js";
import { toNativeColor, useViewText } from "./useViewText.js";
import type { TextViewLayout, TextViewSource } from "./useViewText.js";

/** The properties of a `TLabel`, which are the ones of the labels of Tehreer-Android, Tehreer-Cocoa and Tehreer-Web. */
export interface TLabelProps extends TextViewSource, TextViewLayout {
  /** How the last line is truncated in case of overflow. The default is `BreakMode.Line`. */
  readonly truncationMode?: BreakMode;
  /** Where the last line is truncated. It takes effect when `isTruncationEnabled` is set. */
  readonly truncationPlace?: TruncationPlace;
  /** Whether to truncate the last line in case of overflow. The default is `false`. */
  readonly isTruncationEnabled?: boolean;
  /** The most lines to show. The default is no limit. */
  readonly maxLines?: number;
  /**
   * The style of the label. A label is as wide as its text up to `maxWidth`; give it `alignSelf:
   * "stretch"` (or a `maxWidth` with `alignSelf: "flex-start"`) to wrap. A fixed `width` is not
   * measured by Core, so lines are laid out for the width the style gives.
   */
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
  /** Called when the label is tapped, with the code unit under the finger, or `undefined` if there is no character there. */
  readonly onTap?: (index: number | undefined) => void;
  /** Called when the view has received the frame that Core composed for its size. */
  readonly onFrameReady?: (event: { lineCount: number; width: number; height: number; frameId: number }) => void;
  /** Called with the size the layout chose, in layout units. */
  readonly onLayout?: (event: LayoutChangeEvent) => void;
}

/** What a reference to a `TLabel` gives. */
export interface TLabelHandle {
  /**
   * The frame that is shown, as a wrapper the caller disposes, or `undefined` when there is none yet
   * or when the view replaced it. It is the very frame that the native view paints.
   */
  getComposedFrame(): ComposedFrame | undefined;
  /**
   * Finds the code unit under a position of the label, in layout units from its top left.
   *
   * @returns The index, or `undefined` if there is no character at the position.
   */
  indexOfCodeUnit(x: number, y: number): number | undefined;
  /** Returns the rectangles of code units, in the coordinates of the label. */
  getSelectionRects(fromIndex: number, toIndex: number): Rect[];
}

type BaseProps = ComponentProps<typeof TextBase>;

/** Hands out the frame of an id as a wrapper that the caller disposes. @internal */
export function acquireFrame(frameId: number): ComposedFrame | undefined {
  if (frameId === 0) {
    return undefined;
  }
  const handle = getNativeBindings().acquireViewFrame(frameId);
  return handle === undefined ? undefined : ComposedFrame.adopting(handle);
}

/** Runs a query on the frame of an id and disposes the wrapper. @internal */
export function withFrame<T>(frameId: number, query: (frame: ComposedFrame) => T): T | undefined {
  const frame = acquireFrame(frameId);
  if (frame === undefined) {
    return undefined;
  }
  try {
    return query(frame);
  } finally {
    frame.dispose();
  }
}

/**
 * A label that draws text with Tehreer. Core lays the text out natively, in the measure function of
 * the layout, so the label has its size on the first pass and no JavaScript is involved while it is
 * measured. The typeface, size, color, alignment, line limit and truncation are Core's settings of
 * the frame resolver, set as they are.
 *
 * Replacements of an attributed text take their room from the delegate (asked on the JavaScript
 * thread, with the width of the label) and are drawn natively from what the delegate's `draw`
 * fills; see `ViewText`.
 */
export const TLabel = forwardRef<TLabelHandle, TLabelProps>(function TLabel(props, ref) {
  const {
    textColor, textAlignment, truncationMode, truncationPlace, isTruncationEnabled, maxLines, extraLineSpacing, lineHeightMultiplier,
    style, testID, onTap, onFrameReady, onLayout: onLayoutProp,
  } = props;
  const { viewText, onLayout: onTextLayout } = useViewText(props);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    onTextLayout(event);
    onLayoutProp?.(event);
  }, [onTextLayout, onLayoutProp]);
  const [frameId, setFrameId] = useState(0);
  const frameIdRef = useRef(0);
  frameIdRef.current = frameId;

  useImperativeHandle(ref, () => ({
    getComposedFrame: () => acquireFrame(frameIdRef.current),
    indexOfCodeUnit: (x, y) => withFrame(frameIdRef.current, (frame) => indexOfCodeUnit(frame, x, y)),
    getSelectionRects: (fromIndex, toIndex) => withFrame(frameIdRef.current, (frame) => frame.getSelectionRects(fromIndex, toIndex)) ?? [],
  }), []);

  const handleFrameReady = useCallback<NonNullable<BaseProps["onFrameReady"]>>((event) => {
    setFrameId(event.nativeEvent.frameId);
    onFrameReady?.(event.nativeEvent);
  }, [onFrameReady]);

  const handleTap = useCallback((event: NativeSyntheticEvent<{ x: number; y: number }>) => {
    if (onTap !== undefined) {
      onTap(withFrame(frameIdRef.current, (frame) => indexOfCodeUnit(frame, event.nativeEvent.x, event.nativeEvent.y)));
    }
  }, [onTap]);

  return (
    <TextBase
      testID={testID}
      style={style}
      textId={viewText?.id ?? 0}
      textColor={toNativeColor(textColor, 0xff000000 | 0)}
      textAlignment={textAlignment ?? TextAlignment.Leading}
      truncationEnabled={isTruncationEnabled ?? false}
      truncationMode={truncationMode ?? BreakMode.Line}
      truncationPlace={truncationPlace ?? TruncationPlace.End}
      maxLines={Math.max(0, Math.floor(maxLines ?? 0))}
      extraLineSpacing={extraLineSpacing ?? 0}
      lineHeightMultiplier={lineHeightMultiplier ?? 1}
      onLayout={onLayout}
      onFrameReady={handleFrameReady}
      onTextTap={onTap === undefined ? undefined : handleTap}
    />
  );
});

