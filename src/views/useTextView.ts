import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import type { ComposedFrame } from "../layout/ComposedFrame.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import { composeViewFrame } from "./FrameQueries.js";
import { DEFAULT_TEXT_SIZE } from "./shared.js";
import type { FrameSettings, RenderingProps, TextSource } from "./shared.js";
import { ViewTypesetter } from "./ViewTypesetter.js";

/** How many times a view may make its text again because a room depends on the width. */
const MAX_WIDTH_REBUILDS = 3;

/**
 * What `TLabel` and `TTextView` share: the typesetter of the text, the size that the layout gave the
 * view, and the frame that JavaScript lays out for that size. The frame is both what the queries ask
 * and what the native `TLinePaint` views draw, so it is registered under an id for their `composedFrameId`
 * prop; the registration is undone when the frame is replaced or the view goes.
 *
 * The typesetter is made in a layout effect, so it exists before anything is painted (until then the
 * view renders nothing, so the native view never lays out an empty text). It is released by the
 * cleanup of the effect that sees the next one, which runs after the commit that carries the new id,
 * and on unmount; the native view keeps a reference of its own until it goes, so unmounting frees the
 * text and its replacements, with nothing for React Native to hold.
 *
 * Replacements ask their delegate for the room with the width that the view last reported (0 before
 * the first layout). When a room depends on the width, the text is made again with the new width, at
 * most MAX_WIDTH_REBUILDS times per view, which stops a delegate whose room changes the width it is
 * asked with from looping.
 *
 * @internal
 */
export function useTextView(source: TextSource & RenderingProps, settings: FrameSettings, isScrollable: boolean): {
  typesetter: ViewTypesetter | undefined;
  onLayout: (event: LayoutChangeEvent) => void;
  /** The frame of the view at the size of its last layout, made when asked for; the view owns it. */
  getComposedFrame: () => ComposedFrame | undefined;
  /** The frame that is shown and its id for `TLinePaint`, which follow a layout one render later; `undefined` and 0 until then. */
  frame: ComposedFrame | undefined;
  composedFrameId: number;
  /** How many code units the text of the view has, or 0 while there is no text. */
  getCodeUnitCount: () => number;
} {
  const { text, attributedText, typesetter, typeface, textSize = DEFAULT_TEXT_SIZE } = source;
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [made, setMade] = useState<ViewTypesetter | undefined>();
  const current = useRef<ViewTypesetter | undefined>(undefined);
  const rebuilds = useRef(0);
  // An error that a delegate throws when the width of the view changes a room: it comes from an event, where
  // nothing could catch it, so it is thrown by the next render, where an error boundary can.
  const [failure, setFailure] = useState<{ error: unknown } | undefined>();
  // What the commit of this view has adopted: the cleanup of a layout effect that was not committed disposes its own.
  const adopted = useRef(new WeakSet<ViewTypesetter>()).current;
  const box = useRef({ width: 0, height: 0 });
  const frame = useRef<{ key: string; frame: ComposedFrame } | undefined>(undefined);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [shown, setShown] = useState<{ frame: ComposedFrame; id: number } | undefined>();
  const settingsKey = JSON.stringify(settings);
  const latest = useRef({ settings, isScrollable });
  latest.current = { settings, isScrollable };

  const releaseFrame = useCallback(() => {
    frame.current?.frame.dispose();
    frame.current = undefined;
  }, []);

  // Rooms that depend on the width get their three tries again for another text.
  useLayoutEffect(() => {
    rebuilds.current = 0;
  }, [text, attributedText, typesetter, typeface, textSize]);

  useLayoutEffect(() => {
    // A throw below must not leave a typesetter that was already disposed as the current one.
    current.current = undefined;
    // An error of a delegate belongs to the text that it came from; a new text starts clean (the view
    // that threw is normally unmounted by its error boundary, which also clears it).
    setFailure(undefined);
    const created = ViewTypesetter.create({ text, attributedText, typesetter, typeface, textSize }, layoutWidth);
    current.current = created;
    setMade(created);
    return () => {
      // An effect that React runs and undoes before it commits (StrictMode does) must not leave what it
      // made: one that never became the state of the view is released here, the others by the effect below.
      if (created !== undefined && !adopted.has(created)) {
        created.dispose();
        if (current.current === created) {
          current.current = undefined;
        }
      }
    };
  }, [text, attributedText, typesetter, typeface, textSize, layoutWidth]);

  useEffect(() => {
    if (made !== undefined) {
      adopted.add(made);
    }
    return () => {
      if (made !== undefined) {
        releaseFrame();
        made.dispose();
        if (current.current === made) {
          current.current = undefined;
        }
      }
    };
  }, [made, releaseFrame]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      box.current = { width, height };
      setSize((previous) => (previous.width === width && previous.height === height ? previous : { width, height }));
      const known = current.current;
      // The delegates are asked again only when the width really changes a room.
      if (known !== undefined && known.hasReplacements && width !== layoutWidth && rebuilds.current < MAX_WIDTH_REBUILDS) {
        try {
          if (known.roomsDifferAt(width)) {
            rebuilds.current++;
            setLayoutWidth(width);
          }
        } catch (error) {
          setFailure({ error });
        }
      }
    },
    [layoutWidth],
  );

  const getComposedFrame = useCallback(() => {
    const known = current.current;
    const { width, height } = box.current;
    // A text without code units has no frame: Core makes none of an empty range.
    if (known === undefined || width <= 0 || known.typesetter.codeUnitCount === 0) {
      return undefined;
    }
    const key = `${known.id}:${width}:${height}:${settingsKey}`;
    if (frame.current?.key !== key) {
      releaseFrame();
      frame.current = { key, frame: composeViewFrame(known.typesetter, width, height, latest.current.settings, latest.current.isScrollable) };
    }
    return frame.current.frame;
  }, [releaseFrame, settingsKey]);

  // The frame that the views draw is made after each layout, and again when the text or the settings change.
  useEffect(() => {
    const laidOut = made === undefined ? undefined : getComposedFrame();
    const id = laidOut === undefined ? 0 : getNativeBindings().registerComposedFrame(laidOut.nativeHandle);
    if (laidOut === undefined || id === 0) {
      setShown(undefined);
      return undefined;
    }
    setShown({ frame: laidOut, id });
    return () => getNativeBindings().unregisterComposedFrame(id);
  }, [made, size, settingsKey, getComposedFrame]);

  const getCodeUnitCount = useCallback(() => current.current?.typesetter.codeUnitCount ?? 0, []);

  if (failure !== undefined) {
    throw failure.error;
  }

  return { typesetter: made, onLayout, getComposedFrame, getCodeUnitCount, frame: shown?.frame, composedFrameId: shown?.id ?? 0 };
}
