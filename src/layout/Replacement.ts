import type { ReplacementDelegate, ReplacementRoom } from "../drawing/ReplacementDelegate.js";
import { adopt } from "../internal/Adopt.js";
import { holding } from "../internal/Holding.js";
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
   * @throws RangeError if the width is NaN, or the delegate gives a number that is NaN, negative or too
   *   big for a 32-bit float.
   * @throws TypeError if the delegate gives something that is not an object of three numbers.
   */
  computeRoom(layoutWidth: number): ReplacementRoom {
    return holding([this.nativeHandle], ([handle]) => getNativeBindings().TRReplacementComputeRoom(handle, layoutWidth));
  }
}

// The largest finite `TRFloat` (FLT_MAX): the native side refuses a bigger double.
const MAX_FLOAT = 3.4028234663852886e38;

/**
 * The contract for what `computeRoom` returns: a value that is not an object with the numbers
 * `ascent`, `descent` and `extent` is a `TypeError`, and a number that is NaN, negative or more than
 * a 32-bit float holds is a `RangeError`. It is checked here, so the error is the same whether Core
 * or the application asks, and a copy is returned so that getters of the result never run natively.
 */
function checkRoom(result: unknown): ReplacementRoom {
  if (typeof result !== "object" || result === null) {
    throw new TypeError("computeRoom must return an object with ascent, descent and extent.");
  }
  const room = result as Record<string, unknown>;
  const checked: Record<string, number> = {};
  for (const name of ["ascent", "descent", "extent"]) {
    const value = room[name];
    if (typeof value !== "number") {
      throw new TypeError(`computeRoom: ${name} must be a number.`);
    }
    if (!(value >= 0) || value > MAX_FLOAT) {
      throw new RangeError(`computeRoom: ${name} (${value}) must be a number from 0 to what a 32-bit float holds.`);
    }
    checked[name] = value;
  }
  return checked as unknown as ReplacementRoom;
}

function makeHandler(delegate: ReplacementDelegate): ReplacementHandler {
  if (typeof delegate !== "object" || delegate === null || typeof delegate.computeRoom !== "function") {
    throw new TypeError("delegate must be an object with a computeRoom function.");
  }
  if (delegate.draw !== undefined && typeof delegate.draw !== "function") {
    throw new TypeError("delegate.draw must be a function.");
  }

  // Each function is read once, so a getter or a change of the delegate later does not matter, and is
  // called as the delegate, so a class can keep its state in `this`. The handler refers to the
  // delegate and never to the wrapper that is made from it.
  const computeRoom = delegate.computeRoom;
  const draw = delegate.draw;
  const handler: { -readonly [K in keyof ReplacementHandler]: ReplacementHandler[K] } = {
    computeRoom: (layoutWidth) => checkRoom(computeRoom.call(delegate, layoutWidth)),
  };
  if (draw !== undefined) {
    handler.draw = (context, bounds) => draw.call(delegate, context, bounds);
  }
  return handler;
}
