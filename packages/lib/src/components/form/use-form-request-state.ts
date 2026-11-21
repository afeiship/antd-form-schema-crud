import { useCallback, useMemo, useState } from 'react';
import { checkRequirement, resolveApi } from '../../api';
import { useCrudActions } from '../../hooks/use-crud-actions';
import { useLatest } from '../../hooks/use-latest';
import { useRecordLoader } from '../../hooks/use-record-loader';
import type {
  CrudAction,
  CrudApi,
  CrudId,
  CrudMode,
  CrudRecord,
  CrudSuccessEvent,
} from '../../types';

interface UseFormRequestStateOptions<TRecord extends CrudRecord> {
  mode: CrudMode;
  formMode?: boolean;
  resource?: string;
  id?: CrudId;
  api?: CrudApi<TRecord>;
  setMode: (mode: CrudMode) => void;
  onBack?: () => void;
  onSuccess?: (event: CrudSuccessEvent) => void;
  onError?: (error: unknown, action: CrudAction) => void;
}

/** API resolution, requirement checks, reads and writes for the form card. */
export function useFormRequestState<TRecord extends CrudRecord>({
  mode,
  formMode = false,
  resource,
  id,
  api,
  setMode,
  onBack,
  onSuccess,
  onError,
}: UseFormRequestStateOptions<TRecord>) {
  const resolvedApi = useMemo(() => resolveApi<TRecord>(api, resource), [api, resource]);
  const requirement = checkRequirement(mode, resolvedApi, resource, id);
  const blocked = requirement.missing.length > 0;
  const needsLoad = mode !== 'create';

  const [reloadVersion, setReloadVersion] = useState(0);
  const resolvedApiRef = useLatest(resolvedApi);
  const reload = useCallback(() => setReloadVersion((value) => value + 1), []);

  const {
    actionError,
    submitLoading,
    deleteLoading,
    clearActionError,
    handleFinish,
    handleDelete,
  } = useCrudActions({
    mode,
    id,
    formMode,
    apiRef: resolvedApiRef,
    setMode,
    onBack,
    reload,
    onSuccess,
    onError,
  });

  const { record, recordVersion, loadState, loadError } = useRecordLoader<TRecord>({
    enabled: needsLoad,
    blocked,
    id,
    resource,
    reloadVersion,
    apiRef: resolvedApiRef,
    onError,
  });

  const loading = loadState === 'loading';
  const showForm = mode === 'create' ? !blocked : loadState === 'ready';
  const available = showForm && !loading && !loadError;

  return {
    mode,
    resolvedApi,
    requirement,
    blocked,
    reloadVersion,
    reload,
    actionError,
    submitLoading,
    deleteLoading,
    clearActionError,
    handleFinish,
    handleDelete,
    record,
    recordVersion,
    loading,
    showForm,
    available,
    loadError,
  };
}
