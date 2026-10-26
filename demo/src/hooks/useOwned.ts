import { useEffect, useState } from 'react';

/**
 * Makes an object that Core owns once the component is there and disposes it when the inputs
 * change or the component goes. The old object is disposed by the cleanup of an effect that
 * depends on it, which React runs only after it has committed the render that shows the
 * replacement, so no view is left reading a disposed object. (Views and frames that still hold it
 * keep their own reference in Core.)
 */
export function useOwned<T extends { dispose(): void }>(make: () => T | undefined, inputs: readonly unknown[]): T | undefined {
  const [owned, setOwned] = useState<T>();

  useEffect(() => {
    setOwned(make());
    // The inputs stand for `make`.
  }, inputs);

  useEffect(() => () => owned?.dispose(), [owned]);

  return owned;
}
