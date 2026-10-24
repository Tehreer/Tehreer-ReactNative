import type { ComponentProps } from "react";
import TehreerTextBase from "../specs/TehreerTextBaseNativeComponent.js";

/**
 * The Fabric component that issue #26 builds: a native view whose size is measured by Core, in C++,
 * synchronously, with no JavaScript involved. `TLabel` (#27) and `TTextView` (#28) are this
 * component with props set; it is not public API. The text is a plain string (`text`,
 * `typefaceTag`, `typeSize`) or attributed text registered by `registerViewText` (`textId`).
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
 * Replacements: a `computeRoom` is JavaScript, which Core runs only on the thread of the runtime,
 * never on the thread that Yoga measures on (Core would get a room of zero without any error). So
 * the native side refuses text that holds one (`registerViewText` returns 0; a `ViewText` box can
 * only be made from static replacements); `ViewText` makes the replacements static first (#29).
 *
 * @internal
 */
export const TextBase = TehreerTextBase;
export type TextBaseProps = ComponentProps<typeof TehreerTextBase>;
