import type { ReplacementDelegate, ReplacementRoom } from "../drawing/ReplacementDelegate.js";
import { adopt } from "../internal/Adopt.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { ReplacementHandler } from "../internal/NativeBindings.js";
import type { Handle } from "../internal/NativeFunctions.js";
import { NativeObject } from "../internal/NativeObject.js";
import { checkConstant } from "./Checks.js";
import { ReplacementKind } from "./enums.js";

/**
 * Content that replaces a range of text, such as an image or a view. Core only uses its room to lay
 * out the line, and the delegate draws it.
 *
 * What Core calls lives in the native handler table until Core destroys the replacement, which is
 * when the last reference to it goes, whoever holds it: a text attribute, a typesetter and its
 * glyph runs keep the delegate alive after this wrapper is disposed. The wrapper itself keeps
 * nothing, so wrapper and delegate form no cycle.
 */
export class Replacement extends NativeObject<"TRReplacement"> {
  /**
   * @param delegate Gives the size of the replacement, and draws it.
   * @param kind How the replacement is placed in the text.
   * @throws TypeError if the delegate has no `computeRoom` function, or `draw` is not one.
   * @throws RangeError if the kind is not a `ReplacementKind`.
   * @throws Error if Core cannot create the replacement.
   */
  constructor(delegate: ReplacementDelegate, kind?: ReplacementKind);
  /** @internal */
  constructor(token: typeof adopt, handle: Handle<"TRReplacement">);
  constructor(source: ReplacementDelegate | typeof adopt, kindOrHandle: ReplacementKind | Handle<"TRReplacement"> = ReplacementKind.Inline) {
    if (source === adopt) {
      super(kindOrHandle as Handle<"TRReplacement">);
      return;
    }

    // Everything is checked first, so that a bad argument leaves no handler in the table.
    const handler = makeHandler(source);
    const kind = kindOrHandle as ReplacementKind;
    checkConstant("kind", kind, ReplacementKind);

    const created = getNativeBindings().TRReplacementCreate(handler, kind);
    if (created === undefined) {
      throw new Error("Could not create a replacement.");
    }
    super(created);
  }

  /** How the replacement is placed in the text. */
  get kind(): ReplacementKind {
    return getNativeBindings().TRReplacementGetKind(this.nativeHandle) as ReplacementKind;
  }

  /**
   * Computes the room of the replacement for a layout width, which asks the delegate. An error that
   * the delegate throws is thrown from here.
   *
   * @throws RangeError if the width is NaN, or the delegate gives a room that is not valid.
   */
  computeRoom(layoutWidth: number): ReplacementRoom {
    return getNativeBindings().TRReplacementComputeRoom(this.nativeHandle, layoutWidth);
  }
}

function makeHandler(delegate: ReplacementDelegate): ReplacementHandler {
  if (typeof delegate !== "object" || delegate === null || typeof delegate.computeRoom !== "function") {
    throw new TypeError("delegate must be an object with a computeRoom function.");
  }
  const draw = delegate.draw;
  if (draw !== undefined && typeof draw !== "function") {
    throw new TypeError("delegate.draw must be a function.");
  }

  // The delegate is called as itself, so a class can keep its state in `this`. The handler refers to
  // the delegate and never to the wrapper that is made from it.
  const handler: { -readonly [K in keyof ReplacementHandler]: ReplacementHandler[K] } = {
    computeRoom: (layoutWidth) => delegate.computeRoom(layoutWidth),
  };
  if (draw !== undefined) {
    // Read once, so a getter cannot pass the check and hand back a non-function later.
    handler.draw = (context, bounds) => draw.call(delegate, context, bounds);
  }
  return handler;
}
