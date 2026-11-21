import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { errorMessage } from '../api';
import type { CrudAction, CrudApi, CrudId, CrudMode, CrudSuccessEvent, CrudValues } from '../types';

interface UseCrudActionsOptions<TRecord> {
  mode: CrudMode;
  id?: CrudId;
  /** `mode="form"`: keep editing after save and leave through onBack after delete. */
  formMode?: boolean;
  /** Always points at the latest merged API. */
  apiRef: MutableRefObject<CrudApi<TRecord>>;
  setMode: (mode: CrudMode) => void;
  onBack?: () => void;
  /** Refetch the current record after an update switches back to view. */
  reload: () => void;
  onSuccess?: (event: CrudSuccessEvent) => void;
  onError?: (error: unknown, action: CrudAction) => void;
}

interface CrudActionsResult {
  actionError: { action: CrudAction; message: string } | null;
  submitLoading: boolean;
  deleteLoading: boolean;
  clearActionError: () => void;
  handleFinish: (values: CrudValues) => Promise<void>;
  handleDelete: () => Promise<void>;
}

/**
 * Owns write requests, their loading/error state, and the refresh that follows
 * a successful update. Read state stays in the component / record loader.
 */
export function useCrudActions<TRecord>({
  mode,
  id,
  formMode = false,
  apiRef,
  setMode,
  onBack,
  reload,
  onSuccess,
  onError,
}: UseCrudActionsOptions<TRecord>): CrudActionsResult {
  const [actionError, setActionError] = useState<{ action: CrudAction; message: string } | null>(
    null
  );
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pendingReload, setPendingReload] = useState(false);

  const submittingRef = useRef(false);
  const deletingRef = useRef(false);

  useEffect(() => {
    if (mode === 'create') setActionError(null);
  }, [mode]);

  useEffect(() => {
    setActionError(null);
  }, [id]);

  // Controlled mode may switch to view later; the refresh waits for that.
  useEffect(() => {
    if (!pendingReload || mode !== 'view') return;
    setPendingReload(false);
    reload();
  }, [pendingReload, mode, reload]);

  const clearActionError = useCallback(() => setActionError(null), []);

  const emitSuccess = useCallback(
    async (event: CrudSuccessEvent) => {
      try {
        await onSuccess?.(event);
      } catch (error) {
        // The write already succeeded; report callback failures separately.
        onError?.(error, event.action);
      }
    },
    [onSuccess, onError]
  );

  const handleFinish = useCallback(
    async (values: CrudValues) => {
      const action: CrudAction = mode === 'create' ? 'create' : 'update';
      if (!apiRef.current[action] || submittingRef.current || deletingRef.current) return;

      setActionError(null);
      submittingRef.current = true;
      setSubmitLoading(true);
      let result: unknown;
      try {
        if (mode === 'create') {
          result = await apiRef.current.create?.(values);
        } else {
          result = await apiRef.current.update?.({ ...values, id: id as CrudId });
        }
      } catch (error) {
        setActionError({ action, message: errorMessage(error) });
        onError?.(error, action);
        return;
      } finally {
        submittingRef.current = false;
        setSubmitLoading(false);
      }

      if (action === 'update') {
        if (formMode) {
          await emitSuccess({ action: 'update', result, values });
          reload();
        } else {
          setMode('view');
          setPendingReload(true);
          await emitSuccess({ action: 'update', result, values });
        }
      } else {
        await emitSuccess({ action: 'create', result, values });
      }
    },
    [mode, id, formMode, emitSuccess, onError, apiRef, setMode, reload]
  );

  const handleDelete = useCallback(async () => {
    if (
      !apiRef.current.destroy ||
      id === undefined ||
      id === null ||
      submittingRef.current ||
      deletingRef.current
    ) {
      return;
    }

    setActionError(null);
    deletingRef.current = true;
    setDeleteLoading(true);
    try {
      const result = await apiRef.current.destroy({ id });
      if (formMode) onBack?.();
      else setMode('create');
      await emitSuccess({ action: 'delete', result });
    } catch (error) {
      setActionError({ action: 'delete', message: errorMessage(error, '删除失败，请重试。') });
      onError?.(error, 'delete');
    } finally {
      deletingRef.current = false;
      setDeleteLoading(false);
    }
  }, [id, formMode, onBack, emitSuccess, onError, apiRef, setMode]);

  return {
    actionError,
    submitLoading,
    deleteLoading,
    clearActionError,
    handleFinish,
    handleDelete,
  };
}
