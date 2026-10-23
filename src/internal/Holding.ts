import { getNativeBindings } from "./NativeBindings.js";
import type { Handle } from "./NativeFunctions.js";

/**
 * Runs a Core call with references of its own to the objects it uses. A call that can reach
 * JavaScript (the `computeRoom` of a replacement) could dispose the wrapper it was made through, and
 * Core would then use an object that was freed; the references taken here are given back after the
 * call, so the wrapper's disposal only takes effect once Core is done.
 *
 * @param handles What the call uses. Each is retained, and `body` gets the retained handles in order.
 * @internal
 */
export function holding<const Handles extends readonly Handle<string>[], Result>(
  handles: Handles,
  body: (held: { -readonly [Index in keyof Handles]: Handles[Index] }) => Result,
): Result {
  const b = getNativeBindings();
  const held: Handle<string>[] = [];
  try {
    for (const handle of handles) {
      held.push(b.retainHandle(handle));
    }
    return body(held as unknown as { -readonly [Index in keyof Handles]: Handles[Index] });
  } finally {
    for (const handle of held) {
      b.disposeHandle(handle);
    }
  }
}
