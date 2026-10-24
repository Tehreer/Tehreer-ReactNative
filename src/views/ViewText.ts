import type { Color } from "../Color.js";
import type { DrawingContext } from "../drawing/DrawingContext.js";
import type { ReplacementRoom } from "../drawing/ReplacementDelegate.js";
import type { Rect } from "../geometry.js";
import type { Typeface } from "../graphics/Typeface.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import { Replacement } from "../layout/Replacement.js";
import type { ReplacementKind } from "../layout/enums.js";
import { TText } from "../layout/TText.js";

/** Where the text of a view comes from. */
export interface ViewTextSource {
  /** Plain text. Ignored when `attributedText` is set. */
  readonly text?: string;
  /** Text with attributes. `typeface` and `textSize` are used where it sets none. */
  readonly attributedText?: TText;
  readonly typeface?: Typeface;
  readonly textSize: number;
}

/**
 * A DrawingContext that keeps what a delegate fills, as data: the views paint it natively on the UI
 * thread, where JavaScript cannot run. Glyph images are native objects with no data form, so a
 * delegate that draws one is refused with a clear error instead of drawing nothing.
 */
class RecordingContext implements DrawingContext {
  readonly rects: number[] = [];

  drawGlyphImage(): void {
    throw new Error("A replacement in a view can fill rectangles only: drawGlyphImage is not supported.");
  }

  fillRect(rect: Rect, color: Color): void {
    this.rects.push(rect.x, rect.y, rect.width, rect.height, color >>> 0);
  }
}

interface ReplacedRange {
  readonly fromIndex: number;
  readonly toIndex: number;
  /** The author's replacement, kept to ask its delegate again for another layout width. */
  readonly source: Replacement;
  readonly room: ReplacementRoom;
}

function sameRoom(a: ReplacementRoom, b: ReplacementRoom): boolean {
  return a.ascent === b.ascent && a.descent === b.descent && a.extent === b.extent;
}

/**
 * The text of a view as the native shadow node reads it: an immutable copy registered under an id,
 * which the `textId` prop carries. The shadow node measures on the thread that commits, where Core
 * cannot call JavaScript, so every `Replacement` of the text is replaced by a static one first: its
 * room (`computeRoom` of the delegate, for the layout width given) and its drawing (`draw` of the
 * delegate, recorded as filled rectangles) are asked here, once, on the JavaScript thread, and Core
 * is given plain data. The native state lives exactly as long as the Core replacement, and the
 * registry releases the text on {@link dispose}.
 *
 * @internal
 */
export class ViewText {
  /** The id for the `textId` prop. */
  readonly id: number;
  private readonly _ranges: readonly ReplacedRange[];
  private _isDisposed = false;

  private constructor(id: number, ranges: readonly ReplacedRange[]) {
    this.id = id;
    this._ranges = ranges;
  }

  /**
   * @param layoutWidth What the delegates of the replacements get as the layout width.
   * @throws Error if Core or the registry refuses the text, or a delegate throws (its error is rethrown).
   */
  static create(source: ViewTextSource, layoutWidth: number): ViewText {
    const bindings = getNativeBindings();
    const original = source.attributedText ?? new TText(source.text ?? "");
    const ownsOriginal = source.attributedText === undefined;
    const replaced: ReplacedRange[] = [];
    let editable: ReturnType<TText["mutableCopy"]> | undefined;
    let finalText: TText | undefined;
    try {
      // Replacements are found first, from the original, which is read but never changed.
      for (let index = 0; index < original.length; ) {
        const run = original.getAttributeRun(index);
        if (run === undefined || run.length <= 0) {
          break;
        }
        const replacement = run.attributes.replacement;
        if (replacement !== undefined) {
          replaced.push({ fromIndex: index, toIndex: index + run.length, source: replacement, room: replacement.computeRoom(layoutWidth) });
        }
        index += run.length;
      }

      if (replaced.length === 0) {
        finalText = original.copy();
      } else {
        editable = original.mutableCopy();
        for (const range of replaced) {
          const staticReplacement = makeStatic(range.source, range.room);
          try {
            editable.setAttributes(range.fromIndex, range.toIndex, { replacement: staticReplacement });
          } finally {
            // Core retains it as an attribute; the text keeps it alive from here.
            staticReplacement.dispose();
          }
        }
        finalText = editable.copy();
      }

      const id = bindings.registerViewText(finalText.nativeHandle, source.typeface?.nativeHandle, source.textSize);
      if (id === 0) {
        throw new Error("The text holds a replacement that a view cannot measure: only replacements that the library made static are allowed.");
      }
      const kept = replaced.splice(0);
      return new ViewText(id, kept);
    } catch (error) {
      for (const range of replaced) {
        range.source.dispose();
      }
      throw error;
    } finally {
      finalText?.dispose();
      editable?.dispose();
      if (ownsOriginal) {
        original.dispose();
      }
    }
  }

  /** Whether the text has replacements, whose rooms can depend on the width of the view. */
  get hasReplacements(): boolean {
    return this._ranges.length > 0;
  }

  /**
   * Asks the delegates again, for another layout width. A view calls it when it learns its width
   * and makes the text again only when a room really changed.
   */
  roomsDifferAt(layoutWidth: number): boolean {
    return this._ranges.some((range) => !sameRoom(range.room, range.source.computeRoom(layoutWidth)));
  }

  /** Drops the registry's share and the delegates' wrappers. Idempotent. */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    getNativeBindings().unregisterViewText(this.id);
    for (const range of this._ranges) {
      range.source.dispose();
    }
  }
}

/** The static replacement for a delegate's replacement: same kind, the room, and the recorded drawing. */
function makeStatic(source: Replacement, room: ReplacementRoom): Replacement {
  const context = new RecordingContext();
  // In layout units: the render scale of a view's layout is 1, and the painter scales at paint time.
  // The origin is the start of the replacement on its baseline, which the painter adds.
  source.draw(context, { x: 0, y: 0, ascent: room.ascent, descent: room.descent, width: room.extent });
  const kind: ReplacementKind = source.kind;
  const handle = getNativeBindings().createStaticReplacement(kind, room.ascent, room.descent, room.extent, context.rects);
  if (handle === undefined) {
    throw new Error("Could not create a static replacement.");
  }
  return Replacement.adopting(handle);
}
