import type { ComposedFrame } from "../layout/ComposedFrame.js";

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
 */
export function indexOfCodeUnit(frame: ComposedFrame, x: number, y: number): number | undefined {
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
    // The boundary after the last code unit belongs to the line but is no character.
    return Math.min(line.getCodeUnitIndexAtDistance(x - left), line.endIndex - 1);
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
