import type { ComposedFrame } from "../layout/ComposedFrame.js";
import { FrameResolver } from "../layout/FrameResolver.js";
import type { Typesetter } from "../layout/Typesetter.js";
import type { FrameSettings } from "./shared.js";

/** Where the insertion point of a code unit boundary is drawn: a vertical line from `y` down by `height`. */
export interface CaretPosition {
  readonly x: number;
  readonly y: number;
  readonly height: number;
  /** The index of the line that holds the boundary. */
  readonly lineIndex: number;
}

/**
 * Finds the code unit under a position of a frame, in the coordinates of the frame (layout units,
 * the top of the text at 0). The cluster math is Core's (`ComposedLine.getCodeUnitIndexAtDistance`),
 * which follows the visual order of a bidirectional line, so these are the same indices that
 * `getSelectionRects` covers.
 *
 * @returns The index, or `undefined` when no character is there: outside the width of the line
 *   that the y falls on, or above or below the frame, or in a frame without lines.
 * @throws RangeError if `x` or `y` is NaN. An infinite coordinate is a position outside the text.
 */
export function indexOfCodeUnit(frame: ComposedFrame, x: number, y: number): number | undefined {
  if (Number.isNaN(x) || Number.isNaN(y)) {
    throw new RangeError("The position must not be NaN.");
  }
  const lines = frame.lines;
  if (lines.length === 0 || y < 0 || y > frame.height) {
    return undefined;
  }
  const line = lines.get(frame.getLineIndexAtPosition(x, y));
  try {
    const left = line.origin.x;
    if (x < left || x > left + line.width) {
      return undefined;
    }
    // Core answers with the nearest boundary, which for a point inside a character is one of its two
    // ends, so the character is the neighbour of the boundary whose visual edges hold the point.
    // The edges follow the visual order, so this is right inside a right-to-left run too.
    const distance = x - left;
    const boundary = line.getCodeUnitIndexAtDistance(distance);
    const last = line.endIndex - 1;
    const candidates = [Math.min(boundary, last), Math.min(Math.max(boundary - 1, line.startIndex), last)];
    for (const candidate of candidates) {
      if (line.getVisualEdges(candidate, candidate + 1).some((edge) => distance >= edge.left && distance <= edge.right)) {
        return candidate;
      }
    }
    return candidates[0];
  } finally {
    line.dispose();
  }
}

/**
 * The caret of a code unit boundary, from `startIndex` to `endIndex` of the frame. In a
 * right-to-left run the boundary before a code unit is on its right side, because the distance is
 * measured along the screen (`ComposedLine.getCodeUnitDistance`).
 *
 * @returns `undefined` when the index is outside the frame.
 */
export function getCaretPosition(frame: ComposedFrame, index: number): CaretPosition | undefined {
  if (!Number.isInteger(index) || index < frame.startIndex || index > frame.endIndex) {
    return undefined;
  }
  const lineIndex = frame.getLineIndexForCodeUnit(index);
  if (lineIndex < 0) {
    return undefined;
  }
  const line = frame.lines.get(lineIndex);
  try {
    const origin = line.origin;
    return { x: origin.x + line.getCodeUnitDistance(index), y: origin.y - line.ascent, height: line.height, lineIndex };
  } finally {
    line.dispose();
  }
}

/** The top of the line that holds a code unit, which is where a scroll to it goes; `undefined` when the index is outside the frame. */
export function getLineTop(frame: ComposedFrame, index: number): number | undefined {
  return getCaretPosition(frame, index)?.y;
}

/** The first code unit of the line at a vertical offset of the frame, or `undefined` when it has no lines. */
export function getCodeUnitAtOffset(frame: ComposedFrame, offset: number): number | undefined {
  const lines = frame.lines;
  if (lines.length === 0) {
    return undefined;
  }
  const line = lines.get(frame.getLineIndexAtPosition(0, offset));
  try {
    return line.startIndex;
  } finally {
    line.dispose();
  }
}

/**
 * Checks the distance of a scroll request before it can reach a native view, where a NaN or an
 * infinite offset is a geometry error (the iOS scroll view aborts on it).
 *
 * @throws RangeError if the offset is not a finite number.
 */
export function checkScrollOffset(offset: number): number {
  if (!Number.isFinite(offset)) {
    throw new RangeError(`The scroll offset ${offset} is not a finite number.`);
  }
  return offset;
}

/**
 * Checks the code unit index of a scroll request.
 *
 * @throws RangeError if the index is not a whole number that is not negative.
 */
export function checkScrollCodeUnit(index: number): number {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError(`The code unit index ${index} is not a whole number from 0.`);
  }
  return index;
}

/**
 * Makes the frame that the native view makes for the same typesetter, size and settings (the calls
 * of `ComposeFrame` in `cpp/views/TextLayout.cpp`), so that hit testing and selection rectangles
 * ask Core about the lines that are drawn. JavaScript makes it only when a query asks for it.
 *
 * @param isScrollable A scrolling view lays out the whole text, however tall, for the width.
 */
export function composeViewFrame(typesetter: Typesetter, width: number, height: number, settings: FrameSettings, isScrollable: boolean): ComposedFrame {
  const resolver = new FrameResolver();
  try {
    // A slack far below a pixel keeps the last line that the measurement counted, which Yoga's
    // rounding of the box to the pixel grid could drop.
    const slack = 0.01;
    resolver.typesetter = typesetter;
    resolver.frameWidth = width + slack;
    resolver.frameHeight = isScrollable ? Infinity : height + slack;
    resolver.fitsHorizontally = false;
    resolver.fitsVertically = isScrollable;
    resolver.maxLines = settings.maxLines === 0 ? undefined : settings.maxLines;
    resolver.textAlignment = settings.textAlignment;
    resolver.isTruncationEnabled = settings.isTruncationEnabled;
    resolver.truncationMode = settings.truncationMode;
    resolver.truncationPlace = settings.truncationPlace;
    resolver.extraLineSpacing = settings.extraLineSpacing;
    resolver.lineHeightMultiplier = settings.lineHeightMultiplier;
    resolver.isJustificationEnabled = settings.isJustificationEnabled;
    resolver.justificationLevel = settings.justificationLevel;
    return resolver.createFrame(0, typesetter.codeUnitCount);
  } finally {
    resolver.dispose();
  }
}
