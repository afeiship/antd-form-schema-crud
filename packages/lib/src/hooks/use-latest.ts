import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';

/** Keep the newest value reachable from effects without re-running them. */
export function useLatest<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}
