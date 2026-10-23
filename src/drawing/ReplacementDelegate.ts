/** The room that a replacement takes in a line, in the user space. */
export interface ReplacementRoom {
  /** The distance from the baseline to the top. */
  readonly ascent: number;
  /** The distance from the baseline to the bottom. */
  readonly descent: number;
  /** The extent along the line. */
  readonly extent: number;
}

/** Where a replacement is drawn. Every distance is in pixels, which is the render scale applied. */
export interface ReplacementBounds {
  /** The start of the replacement on its baseline. */
  readonly x: number;
  readonly y: number;
  readonly ascent: number;
  readonly descent: number;
  readonly width: number;
}

/** What gives a replacement its size, and draws it. */
export interface ReplacementDelegate {
  /**
   * Computes the room of the replacement, as an object of the numbers `ascent`, `descent` and `extent`,
   * none NaN or negative: anything else makes the call that asked throw a `TypeError` (not an object
   * of numbers) or a `RangeError` (a number that is not valid).
   *
   * It is called with a layout width of 0 while the text is
   * shaped, and with the width of the frame while the frame is laid out. A block replacement
   * usually takes the whole layout width as its extent.
   *
   * It runs inside the call of the library that shapes or lays out text, which throws whatever it
   * throws once Core has returned. It may dispose the objects that the call is using: the call holds references of its own, so the disposal takes effect when it returns. It runs on
   * the JavaScript thread only: Core asking for the room from another thread gets zero.
   */
  computeRoom(layoutWidth: number): ReplacementRoom;

  /**
   * Draws the replacement. Nothing is drawn if it is not there. It is stored with the delegate but
   * not called yet: drawing comes with the drawing context of a later issue, which gives `context`
   * its type.
   */
  draw?(context: unknown, bounds: ReplacementBounds): void;
}
