import { useCallback, useEffect, useState } from 'react';
import type { CrudValues } from '../types';
import deepEqual from 'fast-deep-equal';

/**
 * Tracks whether edit-mode form values differ from the loaded baseline.
 * Disabled in create mode, where the save button should always be available.
 */
export function useDirtyState(enabled: boolean, baseline: CrudValues) {
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDirty(false);
  }, [enabled, baseline]);

  const check = useCallback(
    (values: CrudValues) => {
      if (!enabled) {
        setDirty(false);
        return;
      }
      setDirty(!deepEqual(values, baseline));
    },
    [enabled, baseline]
  );

  const reset = useCallback(() => setDirty(false), []);

  return { dirty, check, reset };
}
