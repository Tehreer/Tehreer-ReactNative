import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Makes an object that Core owns once the component is there and disposes it when the inputs
 * change or the component goes.
 *
 * - An object that is shown is disposed by the cleanup of an effect that depends on it, which React
 *   runs only after it has committed the render that shows the replacement, so no view is left
 *   reading a disposed object. (Views and frames that still hold it keep their own reference in Core.)
 * - An object that was made but never shown (StrictMode runs an effect twice, or the inputs change
 *   again before the render with the object is committed) is disposed by the cleanup of the effect
 *   that made it. A layout effect marks the shown object as adopted before any passive cleanup runs,
 *   so that cleanup leaves it to the one above.
 * - A `make` that throws leaves the state as it was: the error comes out of the effect to the
 *   nearest error boundary, and the object that was shown is disposed when that boundary unmounts it.
 */
export function useOwned<T extends { dispose(): void }>(make: () => T | undefined, inputs: readonly unknown[]): T | undefined {
  const [owned, setOwned] = useState<T>();
  const adopted = useRef(new WeakSet<T>()).current;

  useEffect(() => {
    const made = make();
    setOwned(made);
    return () => {
      if (made !== undefined && !adopted.has(made)) {
        made.dispose();
      }
    };
    // The inputs stand for `make`.
  }, inputs);

  useLayoutEffect(() => {
    if (owned !== undefined) {
      adopted.add(owned);
    }
  }, [owned]);

  useEffect(() => () => owned?.dispose(), [owned]);

  return owned;
}
