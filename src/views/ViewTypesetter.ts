import type { Color } from "../Color.js";
import type { DrawingContext } from "../drawing/DrawingContext.js";
import type { ReplacementRoom } from "../drawing/ReplacementDelegate.js";
import type { Rect } from "../geometry.js";
import type { Typeface } from "../graphics/Typeface.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import { Replacement } from "../layout/Replacement.js";
import { Typesetter } from "../layout/Typesetter.js";
import type { ReplacementKind } from "../layout/enums.js";
import type { TextAttributes } from "../layout/TextAttributes.js";
import { TText } from "../layout/TText.js";
import type { TextSource } from "./shared.js";

/**
 * A DrawingContext that keeps what a delegate fills, as data: a view paints it natively, where
 * JavaScript cannot run. Glyph images are native objects with no data form, so a delegate that
 * draws one is refused with a clear error instead of drawing nothing.
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

const sameRoom = (a: ReplacementRoom, b: ReplacementRoom) => a.ascent === b.ascent && a.descent === b.descent && a.extent === b.extent;

/**
 * The typesetter of a view, which the native side reads by an id (Fabric props are numbers, while
 * Tehreer-Android and Tehreer-Cocoa give their views a `Typesetter`). It is made as Tehreer-Web
 * makes it, from the text, the typeface and the size.
 *
 * A replacement of the text becomes a `ReplacementHolder` first (see `cpp/views`): the typesetter is
 * used by the thread that measures and by the view, where JavaScript cannot be called, so its room
 * (`computeRoom` of the delegate, for the layout width given) and its drawing (the rectangles that
 * `draw` fills) are asked here, once, and Core is given data. Not mirrored from the other wrappers,
 * where Core calls the replacement on any thread: a live view in the room (`ViewSpan`,
 * `ViewAttachment`) and drawing anything but rectangles.
 *
 * @internal
 */
export class ViewTypesetter {
  /** For the `typesetterId` prop. */
  readonly id: number;
  /** For the frames that JavaScript makes of its own (hit testing, selection rectangles). */
  readonly typesetter: Typesetter;
  private readonly _ranges: readonly ReplacedRange[];
  /** Whether the typesetter was made here, and so is disposed here; one that the caller gave is theirs. */
  private readonly _ownsTypesetter: boolean;
  private _isDisposed = false;

  private constructor(id: number, typesetter: Typesetter, ranges: readonly ReplacedRange[], ownsTypesetter: boolean) {
    this.id = id;
    this.typesetter = typesetter;
    this._ranges = ranges;
    this._ownsTypesetter = ownsTypesetter;
  }

  /**
   * @param layoutWidth What the delegates of the replacements get as the layout width.
   * @returns `undefined` when there is nothing to show: a plain text without a typeface, as in the
   *   other wrappers (an attributed text has to give every range a typeface, or the call throws).
   * @throws Error if Core refuses the typesetter, or a delegate throws (its error is rethrown).
   */
  static create(source: TextSource & { readonly typeface?: Typeface; readonly textSize: number }, layoutWidth: number): ViewTypesetter | undefined {
    if (source.typesetter !== undefined) {
      const id = getNativeBindings().registerTypesetter(source.typesetter.nativeHandle);
      if (id === 0) {
        throw new Error("Could not register the typesetter of a view.");
      }
      return new ViewTypesetter(id, source.typesetter, [], false);
    }
    if (source.attributedText === undefined && source.typeface === undefined) {
      return undefined;
    }
    const original = source.attributedText ?? new TText(source.text ?? "");
    const ownsOriginal = source.attributedText === undefined;
    const replaced: ReplacedRange[] = [];
    let editable: ReturnType<TText["mutableCopy"]> | undefined;
    let copy: TText | undefined;
    let typesetter: Typesetter | undefined;
    try {
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
        copy = original;
      } else {
        // The original is never changed: a copy gets the holders.
        editable = original.mutableCopy();
        for (const range of replaced) {
          const holder = makeHolder(range.source, range.room);
          try {
            editable.setAttributes(range.fromIndex, range.toIndex, { replacement: holder });
          } finally {
            // Core retains it as an attribute; the text keeps it alive from here.
            holder.dispose();
          }
        }
        copy = editable;
      }

      const defaults: TextAttributes = source.typeface === undefined ? { typeSize: source.textSize } : { typeface: source.typeface, typeSize: source.textSize };
      typesetter = new Typesetter(copy, defaults);
      const id = getNativeBindings().registerTypesetter(typesetter.nativeHandle);
      if (id === 0) {
        throw new Error("Could not register the typesetter of a view.");
      }
      const made = new ViewTypesetter(id, typesetter, replaced.splice(0), true);
      typesetter = undefined;
      return made;
    } catch (error) {
      typesetter?.dispose();
      for (const range of replaced) {
        range.source.dispose();
      }
      throw error;
    } finally {
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

  /** Asks the delegates again, for another layout width. The view makes the text again only if a room changed. */
  roomsDifferAt(layoutWidth: number): boolean {
    return this._ranges.some((range) => !sameRoom(range.room, range.source.computeRoom(layoutWidth)));
  }

  /**
   * Drops the table's reference and the typesetter of JavaScript. A view keeps the reference it took
   * when it received the id, and lets it go with the view. Idempotent.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    getNativeBindings().unregisterTypesetter(this.id);
    if (this._ownsTypesetter) {
      this.typesetter.dispose();
    }
    for (const range of this._ranges) {
      range.source.dispose();
    }
  }
}

/** The holder for a delegate's replacement: same kind, the room, and the recorded drawing. */
function makeHolder(source: Replacement, room: ReplacementRoom): Replacement {
  const context = new RecordingContext();
  // In layout units, the render scale of a layout being 1; the painter scales when it paints. The
  // origin is the start of the replacement on its baseline, which the painter adds.
  source.draw(context, { x: 0, y: 0, ascent: room.ascent, descent: room.descent, width: room.extent });
  const kind: ReplacementKind = source.kind;
  const handle = getNativeBindings().createReplacementHolder(kind, room.ascent, room.descent, room.extent, context.rects);
  if (handle === undefined) {
    throw new Error("Could not create a replacement holder.");
  }
  return Replacement.adopting(handle);
}
