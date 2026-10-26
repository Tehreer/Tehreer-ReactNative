import { useEffect, useState } from 'react';

export interface Loaded<T> {
  readonly value: T | undefined;
  readonly error: Error | undefined;
}

export function useLoaded<T>(key: string, load: () => Promise<T>): Loaded<T> {
  const [state, setState] = useState<{ key: string; value?: T; error?: Error }>({ key });

  useEffect(() => {
    let isCurrent = true;
    load().then(
      (value) => isCurrent && setState({ key, value }),
      (error: unknown) => isCurrent && setState({ key, error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      isCurrent = false;
    };
    // The key stands for the loader.
  }, [key]);

  const isStale = state.key !== key;
  return { value: isStale ? undefined : state.value, error: isStale ? undefined : state.error };
}
