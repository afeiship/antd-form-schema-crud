import { useCallback, useEffect, useState } from 'react';
import type { CrudFormMode, CrudId, CrudMode } from '../types';

interface UseCrudModeOptions {
  mode?: CrudFormMode;
  id?: CrudId;
  onModeChange?: (mode: CrudMode) => void;
}

function isBlankId(id?: CrudId) {
  return id === undefined || id === null;
}

/** `form` uses one page for create and edit, so an id means editing. */
function formMode(id?: CrudId): CrudMode {
  return isBlankId(id) ? 'create' : 'edit';
}

/** No explicit mode keeps the create -> view -> edit flow. */
function defaultMode(id?: CrudId): CrudMode {
  return isBlankId(id) ? 'create' : 'view';
}

function initialMode(mode: CrudFormMode | undefined, id?: CrudId): CrudMode {
  if (mode === 'form') return formMode(id);
  return mode ?? defaultMode(id);
}

/**
 * Controlled when `mode` is provided; otherwise create/view is derived from id
 * and view -> edit transitions stay internal. `mode="form"` derives create/edit
 * from id and never enters view.
 */
export function useCrudMode({ mode, id, onModeChange }: UseCrudModeOptions) {
  const form = mode === 'form';
  const controlled = mode !== undefined && !form;
  const [innerMode, setInnerMode] = useState<CrudMode>(() => initialMode(mode, id));

  useEffect(() => {
    if (form) {
      setInnerMode(formMode(id));
      return;
    }
    if (controlled) return;
    setInnerMode(defaultMode(id));
  }, [form, controlled, id]);

  const setMode = useCallback(
    (next: CrudMode) => {
      if (form) return;
      if (controlled) {
        onModeChange?.(next);
        return;
      }
      setInnerMode(next);
    },
    [form, controlled, onModeChange]
  );

  const resolvedMode = form ? formMode(id) : (mode ?? innerMode);

  return { mode: resolvedMode, setMode, isForm: form };
}
