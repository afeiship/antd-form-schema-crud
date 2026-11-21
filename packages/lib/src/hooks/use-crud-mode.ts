import { useCallback, useEffect, useState } from 'react';
import type { CrudId, CrudMode } from '../types';

interface UseCrudModeOptions {
  mode?: CrudMode;
  id?: CrudId;
  onModeChange?: (mode: CrudMode) => void;
}

function inferredMode(id?: CrudId): CrudMode {
  return id === undefined || id === null ? 'create' : 'view';
}

/**
 * Controlled when `mode` is provided; otherwise create/view is derived from id
 * and view -> edit transitions stay internal.
 */
export function useCrudMode({ mode, id, onModeChange }: UseCrudModeOptions) {
  const controlled = mode !== undefined;
  const [innerMode, setInnerMode] = useState<CrudMode>(mode ?? inferredMode(id));

  useEffect(() => {
    if (controlled) return;
    setInnerMode(inferredMode(id));
  }, [controlled, id]);

  const setMode = useCallback(
    (next: CrudMode) => {
      if (controlled) {
        onModeChange?.(next);
        return;
      }
      setInnerMode(next);
    },
    [controlled, onModeChange]
  );

  return { mode: mode ?? innerMode, setMode };
}
