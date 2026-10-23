import type { ComponentProps } from "react";
import TehreerTextBase from "../specs/TehreerTextBaseNativeComponent.js";

/**
 * The Fabric component that issue #26 builds: a native view whose size is measured by Core, in C++,
 * synchronously, with no JavaScript involved. It is the base that `TLabel` (#27) grows from, and
 * not public API yet: it paints only a colored box.
 *
 * Measurement. Yoga's measure function lays `text` out with Core (`Typesetter`, `FrameResolver`
 * with a frame that fits its lines, `ComposedFrame`) in the width and height that Yoga allows, and
 * the measured size is the bounds of that frame, so it equals `frame.width` and `frame.height` of
 * the JavaScript API for the same text, typeface, size and width. Yoga rounds a measured size up to
 * the pixel grid. Give the component `maxWidth`, not `width`: a fixed width is not measured.
 *
 * The typeface is found by `typefaceTag` in `TypefaceManager` (register it first, with a tag above
 * 0, **before the component is mounted**, and keep it registered while it is shown: the lookup
 * happens when the text is measured, and a typeface registered later does not re-measure a
 * component whose props did not change). A missing or unknown tag, an empty text
 * or a type size that is not positive measures 0 by 0, and nothing is thrown.
 *
 * Replacements are not supported here: the text is a plain string, and a `computeRoom` is
 * JavaScript, which Core runs only on the thread of the runtime, never on the thread that Yoga
 * measures on (Core then gets a room of zero without any error). Attributed text in `TLabel` must
 * refuse a replacement instead of measuring it wrongly.
 *
 * @internal
 */
export const TextBase = TehreerTextBase;
export type TextBaseProps = ComponentProps<typeof TehreerTextBase>;
