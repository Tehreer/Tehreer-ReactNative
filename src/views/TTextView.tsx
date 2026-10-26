import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { GestureResponderEvent, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollViewInstance, StyleProp, ViewStyle } from "react-native";
import { PixelRatio, Platform, Pressable, ScrollView, View } from "react-native";
import TLinePaintNativeComponent from "../specs/TLinePaintNativeComponent.js";
import type { Rect } from "../geometry.js";
import { Renderer } from "../graphics/Renderer.js";
import type { ComposedFrame } from "../layout/ComposedFrame.js";
import { LineLocator } from "../layout/LineLocator.js";
import { checkScrollCodeUnit, checkScrollOffset, getCaretPosition, getCodeUnitAtOffset, getLineTop, indexOfCodeUnit } from "./FrameQueries.js";
import type { CaretPosition } from "./FrameQueries.js";
import { findLinks, linkAt } from "./Links.js";
import { insetSize, resolveContentInset, resolveFrameSettings, resolveHighlights, toColor, toNativeRenderer } from "./shared.js";
import type { ColorValue, ContentInset, ParagraphProps, RenderingProps, TextHighlight, TextSource } from "./shared.js";
import { useTextView } from "./useTextView.js";

/** How many lines one native view paints: fewer views to mount, a little more painted than is in sight. */
const LINES_PER_CHUNK = 6;
/** How many screens above and below the visible one stay mounted, for a scroll that JavaScript hears late. */
const OVERSCAN_SCREENS = 1.5;

/** The lines that one native view paints, and where it sits in the text (the box of the ink of its lines). */
interface Chunk {
  readonly firstLine: number;
  readonly lineCount: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

interface LineBoxes {
  readonly chunks: readonly Chunk[];
  /** The y of the bottom of each line, where its separator goes. */
  readonly bottoms: readonly number[];
}

const rgba = (color: number) => `rgba(${(color >>> 16) & 0xff},${(color >>> 8) & 0xff},${color & 0xff},${((color >>> 24) & 0xff) / 255})`;

/** The boxes of the lines of a frame, found with Core's line locator, grouped for the native views. */
function measureLines(frame: ComposedFrame): LineBoxes {
  const measuring = new Renderer();
  measuring.renderScale = PixelRatio.get();
  const locator = new LineLocator(frame, measuring);
  const chunks: Chunk[] = [];
  const bottoms: number[] = [];
  try {
    for (let first = 0; first < locator.lineCount; first += LINES_PER_CHUNK) {
      const count = Math.min(LINES_PER_CHUNK, locator.lineCount - first);
      let left = Infinity;
      let top = Infinity;
      let right = -Infinity;
      let bottom = -Infinity;
      for (let index = first; index < first + count; index++) {
        const box = locator.getLineBox(index);
        left = Math.min(left, box.x);
        top = Math.min(top, box.y);
        right = Math.max(right, box.x + box.width);
        bottom = Math.max(bottom, box.y + box.height);
        const line = frame.lines.get(index);
        try {
          bottoms.push(line.origin.y - line.ascent + line.height);
        } finally {
          line.dispose();
        }
      }
      chunks.push({ firstLine: first, lineCount: count, left, top, width: right - left, height: bottom - top });
    }
  } finally {
    locator.dispose();
    measuring.dispose();
  }
  return { chunks, bottoms };
}

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
   * text is not laid out again, so they can follow a finger. A range that is not whole numbers from 0
   * with `fromIndex` not after `toIndex` is a `RangeError`; one that reaches past the end of the text
   * covers nothing, since the text may change in the same render.
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
   * The space between the edges of the view and the text, as `contentInset` of `UIScrollView` and the
   * padding of the text view of Tehreer-Android. The text is laid out for the width that is left, the
   * scroll indicator is drawn at the edge of the view, outside the text, and the inset scrolls with
   * the text. Positions that the view reports (`onTap`, `onScroll`, the handle) stay relative to the
   * text, without the inset. The default is no inset.
   *
   * @throws RangeError if a side is not a finite number from 0.
   */
  readonly contentInset?: ContentInset;
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
   * @throws RangeError if the index is not a whole number from 0 and less than the number of code units
   *   of the text.
   */
  scrollToCodeUnit(index: number, smooth?: boolean): void;
  /**
   * Scrolls to a distance from the top of the text, which is limited to what the text allows, with an
   * animation if `smooth` is set.
   *
   * @throws RangeError if the offset is not a finite number.
   */
  scrollToOffset(offset: number, smooth?: boolean): void;
}

/**
 * A view of long text, drawn with Tehreer. JavaScript lays the text out once for the width of the
 * view (Core's frame resolver), finds the boxes of the lines with Core's line locator, and scrolls it
 * with a `ScrollView`; only the lines near the screen are mounted, in native `TLinePaint` views that
 * paint them, so scrolling lays nothing out. Hit testing, selection rectangles and carets ask the same
 * frame, so they follow the bidirectional order of the lines. Highlights and separators are plain
 * views behind and between the lines.
 *
 * The layout runs on the JavaScript thread, so a very long text holds it for the time Core takes.
 * Lines are mounted as JavaScript hears of the scroll, so a fast fling can outrun them for a frame
 * (the overscan is a screen and a half on each side).
 *
 * Not mirrored from the other wrappers: the highlight of a pressed link and `onPressChange` /
 * `onHoverChange` of Web, and views in the text (a replacement is drawn from rectangles).
 *
 * A change of width keeps the pixel offset of the scroll, as a scroll view does, and not the line that
 * was at the top (Tehreer-Android and Tehreer-Web keep an anchor for that; read
 * `firstVisibleCodeUnitIndex` and `scrollToCodeUnit` to keep one yourself).
 */
export const TTextView = forwardRef<TTextViewHandle, TTextViewProps>(function TTextView(props, ref) {
  const {
    separatorColor, highlightColor, highlights, isLinkInteractionEnabled = true, onLinkClick, style, testID, onTap,
    onScroll, onFrameReady, onLayout: onLayoutProp, attributedText,
  } = props;
  const renderer = toNativeRenderer(props);
  const inset = resolveContentInset(props.contentInset);
  const insetTop = inset.top;
  const insetLeft = inset.left;
  const insetBottom = inset.bottom;
  const insetRight = inset.right;
  const settings = resolveFrameSettings(props);
  const { typesetter, onLayout: onTextLayout, getComposedFrame, getCodeUnitCount, frame, composedFrameId } = useTextView(props, settings, true);
  const links = useMemo(() => findLinks(attributedText), [attributedText]);
  const scroller = useRef<ScrollViewInstance>(null);
  const offset = useRef(0);
  // The scroll position as the scroll view reports it, with the inset above the text included.
  const rawOffset = useRef(0);
  const viewport = useRef({ width: 0, height: 0 });
  const lastLayout = useRef<LayoutChangeEvent | undefined>(undefined);
  const [width, setWidth] = useState(0);
  const [range, setRange] = useState({ first: 0, last: -1 });
  // A request that comes before the first frame waits for it, because what it needs is not known yet.
  const pending = useRef<{ offset?: number; codeUnit?: number; smooth?: boolean }>({});

  const lines = useMemo(() => (frame === undefined ? undefined : measureLines(frame)), [frame]);
  const content = frame?.height ?? 0;

  const visibleRange = useCallback((top: number) => {
    const chunks = lines?.chunks ?? [];
    const margin = viewport.current.height * OVERSCAN_SCREENS;
    let first = -1;
    let last = -1;
    chunks.forEach((chunk, index) => {
      if (chunk.top + chunk.height > top - margin && chunk.top < top + viewport.current.height + margin) {
        first = first < 0 ? index : first;
        last = index;
      }
    });
    return { first: Math.max(first, 0), last };
  }, [lines]);

  const updateRange = useCallback((top: number) => {
    const next = visibleRange(top);
    setRange((previous) => (previous.first === next.first && previous.last === next.last ? previous : next));
  }, [visibleRange]);

  const send = useCallback((distance: number, smooth: boolean) => {
    const limit = Math.max(0, content - viewport.current.height + insetTop + insetBottom);
    // The text starts below the inset, so its distance is moved by it to be the offset of the scroll view.
    scroller.current?.scrollTo({ y: Math.min(Math.max(0, distance + insetTop), limit), animated: smooth });
  }, [content, insetTop, insetBottom]);

  const scrollToCodeUnit = useCallback((index: number, smooth: boolean) => {
    const top = frame === undefined ? undefined : getLineTop(frame, index);
    if (top === undefined) {
      pending.current = { codeUnit: index, smooth };
    } else {
      send(top, smooth);
    }
  }, [frame, send]);

  const scrollToOffset = useCallback((distance: number, smooth: boolean) => {
    if (frame === undefined) {
      pending.current = { offset: distance, smooth };
    } else {
      send(distance, smooth);
    }
  }, [frame, send]);

  // When the frame is made: what is in sight, the waiting scroll request, and the news for the owner.
  useEffect(() => {
    updateRange(offset.current);
    if (frame === undefined) {
      return;
    }
    const waiting = pending.current;
    pending.current = {};
    if (waiting.offset !== undefined) {
      scrollToOffset(waiting.offset, waiting.smooth ?? false);
    } else if (waiting.codeUnit !== undefined) {
      scrollToCodeUnit(waiting.codeUnit, waiting.smooth ?? false);
    }
    onFrameReady?.({ lineCount: frame.lines.length, width: frame.width, height: frame.height });
    // Reported once for each frame, not when a callback changes identity.
  }, [frame]);

  useImperativeHandle(ref, () => ({
    get composedFrame() {
      return getComposedFrame();
    },
    get firstVisibleCodeUnitIndex() {
      const known = getComposedFrame();
      return known === undefined ? undefined : getCodeUnitAtOffset(known, offset.current);
    },
    indexOfCodeUnit: (x, y) => {
      const known = getComposedFrame();
      return known === undefined ? undefined : indexOfCodeUnit(known, x, y);
    },
    getSelectionRects: (fromIndex, toIndex) => getComposedFrame()?.getSelectionRects(fromIndex, toIndex) ?? [],
    getCaretPosition: (index) => {
      const known = getComposedFrame();
      return known === undefined ? undefined : getCaretPosition(known, index);
    },
    scrollToCodeUnit: (index, smooth = false) => scrollToCodeUnit(checkScrollCodeUnit(index, getCodeUnitCount() || undefined), smooth),
    scrollToOffset: (distance, smooth = false) => scrollToOffset(checkScrollOffset(distance), smooth),
  }), [getComposedFrame, getCodeUnitCount, scrollToCodeUnit, scrollToOffset]);

  // The text is laid out for the view without its inset; the owner hears the size of the view itself.
  const layoutText = useCallback((event: LayoutChangeEvent) => {
    const layout = event.nativeEvent.layout;
    const size = insetSize(layout, { top: insetTop, left: insetLeft, bottom: insetBottom, right: insetRight });
    viewport.current = layout;
    setWidth(size.width);
    onTextLayout({ ...event, nativeEvent: { ...event.nativeEvent, layout: { ...layout, ...size } } });
  }, [onTextLayout, insetTop, insetLeft, insetBottom, insetRight]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    lastLayout.current = event;
    layoutText(event);
    onLayoutProp?.(event);
  }, [layoutText, onLayoutProp]);

  // A new inset changes the room of the text without a new layout of the view.
  useEffect(() => {
    if (lastLayout.current !== undefined) {
      layoutText(lastLayout.current);
    }
  }, [layoutText]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // The text starts at 0, below the inset; a bounce above it is still 0.
    rawOffset.current = event.nativeEvent.contentOffset.y;
    offset.current = Math.max(0, event.nativeEvent.contentOffset.y - insetTop);
    updateRange(offset.current);
    onScroll?.(offset.current);
  }, [onScroll, updateRange, insetTop]);

  const handlePress = useCallback((event: GestureResponderEvent) => {
    const { locationX, locationY, pageX, pageY } = event.nativeEvent;
    const finish = (x: number, y: number) => {
      const known = getComposedFrame();
      const index = known === undefined ? undefined : indexOfCodeUnit(known, x, y);
      onTap?.(index);
      const link = isLinkInteractionEnabled ? linkAt(links, index) : undefined;
      if (link !== undefined) {
        onLinkClick?.(link.userData, link.fromIndex, link.toIndex);
      }
    };

    const scrollView = scroller.current;
    if (Platform.OS !== "android" || scrollView === null) {
      finish(locationX, locationY);
      return;
    }
    // On Android `locationY` does not follow the scrolling, so the position in the text is worked
    // out from where the view is on the screen, how far it is scrolled and the inset.
    scrollView.measure((_x, _y, _width, _height, viewPageX, viewPageY) => {
      finish(pageX - viewPageX - insetLeft, pageY - viewPageY - insetTop + rawOffset.current);
    });
  }, [getComposedFrame, onTap, isLinkInteractionEnabled, links, onLinkClick, insetLeft, insetTop]);

  // A range that reaches past the end of the text covers nothing: the text may change in the same render.
  const highlightViews = useMemo(() => {
    const views: { key: string; x: number; y: number; width: number; height: number; color: string }[] = [];
    if (frame === undefined || highlights === undefined) {
      return views;
    }
    resolveHighlights(highlights, highlightColor).forEach((highlight, rangeIndex) => {
      const toIndex = Math.min(highlight.toIndex, frame.endIndex);
      if (highlight.fromIndex >= toIndex) {
        return;
      }
      const color = rgba(highlight.color);
      frame.getSelectionRects(highlight.fromIndex, toIndex).forEach((rect, rectIndex) => {
        // Whole pixels, so that the rects of neighbouring runs meet without a gap.
        const scale = PixelRatio.get();
        const left = Math.floor(rect.x * scale) / scale;
        const top = Math.floor(rect.y * scale) / scale;
        views.push({ key: `${rangeIndex}:${rectIndex}`, x: left, y: top, width: Math.ceil((rect.x + rect.width) * scale) / scale - left, height: Math.ceil((rect.y + rect.height) * scale) / scale - top, color });
      });
    });
    return views;
  }, [frame, highlights, highlightColor]);

  if (typesetter === undefined) {
    return null;
  }

  const separator = separatorColor === undefined ? undefined : rgba(toColor(separatorColor));
  const separators = separator === undefined || lines === undefined ? [] : lines.bottoms.map((bottom, index) => ({ index, y: Math.floor(bottom - 0.5) }));
  // Only what is in sight, as the views of the lines are.
  const first = lines?.chunks[range.first]?.firstLine ?? 0;
  const lastChunk = lines?.chunks[range.last];
  const last = lastChunk === undefined ? -1 : lastChunk.firstLine + lastChunk.lineCount - 1;

  return (
    <ScrollView ref={scroller} testID={testID} style={style} onLayout={handleLayout} onScroll={handleScroll} scrollEventThrottle={16} nestedScrollEnabled
      contentContainerStyle={{ paddingTop: insetTop, paddingLeft: insetLeft, paddingBottom: insetBottom, paddingRight: insetRight }}>
      <Pressable onPress={handlePress} style={{ width, height: content }}>
        {highlightViews.map((view) => (
          <View key={view.key} pointerEvents="none" style={{ position: "absolute", left: view.x, top: view.y, width: view.width, height: view.height, backgroundColor: view.color }} />
        ))}
        {separators.filter((item) => item.index >= first && item.index <= last).map((item) => (
          <View key={`s${item.index}`} pointerEvents="none" style={{ position: "absolute", left: 0, top: item.y, width, height: 1, backgroundColor: separator }} />
        ))}
        {lines?.chunks.slice(range.first, range.last + 1).map((chunk) => (
          <TLinePaintNativeComponent
            key={chunk.firstLine}
            pointerEvents="none"
            style={{ position: "absolute", left: chunk.left, top: chunk.top, width: chunk.width, height: chunk.height }}
            composedFrameId={composedFrameId}
            firstLine={chunk.firstLine}
            lineCount={chunk.lineCount}
            originX={chunk.left}
            originY={chunk.top}
            {...renderer}
          />
        ))}
      </Pressable>
    </ScrollView>
  );
});
