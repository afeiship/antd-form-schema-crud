import { useCallback } from 'react';
import type { CrudActions, CrudMode, CrudRecord } from '../../types';

interface UseFormNavigationOptions<TRecord extends CrudRecord> {
  mode: CrudMode;
  formMode?: boolean;
  setMode: (mode: CrudMode) => void;
  record?: TRecord;
  actions?: CrudActions;
  onBack?: () => void;
  clearActionError: () => void;
}

/** Cancel/edit transitions plus their visibility flags. */
export function useFormNavigation<TRecord extends CrudRecord>({
  mode,
  formMode = false,
  setMode,
  record,
  actions,
  onBack,
  clearActionError,
}: UseFormNavigationOptions<TRecord>) {
  const handleCancel = useCallback(() => {
    if (!formMode && mode === 'edit') {
      setMode('view');
      clearActionError();
      return;
    }
    onBack?.();
  }, [mode, formMode, onBack, setMode, clearActionError]);

  const handleEdit = useCallback(() => {
    if (mode !== 'view' || record === undefined) return;
    setMode('edit');
    clearActionError();
  }, [mode, record, setMode, clearActionError]);

  const canCancel =
    actions?.cancel !== false &&
    (formMode ? Boolean(onBack) : mode === 'edit' || Boolean(onBack));
  const showTitleBack = Boolean(onBack) && actions?.cancel !== false;

  return { handleCancel, handleEdit, canCancel, showTitleBack };
}
