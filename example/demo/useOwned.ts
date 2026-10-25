import { useEffect, useState } from 'react';

/**
 * Makes an object that Core owns once the component is there and disposes it when the inputs
 * change or the component goes. A render that is already under way may still read the object, so
 * it is disposed a moment later.
 */
export function useOwned<T extends { dispose(): void }>(make: () => T | undefined, inputs: readonly unknown[]): T | undefined {
  const [owned, setOwned] = useState<T>();

  useEffect(() => {
    const made = make();
    setOwned(made);
    return () => {
      setOwned(undefined);
      setTimeout(() => made?.dispose(), 300);
    };
    // The inputs stand for `make`.
  }, inputs);

  return owned;
}
