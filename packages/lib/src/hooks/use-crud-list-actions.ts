import { useCallback, useSyncExternalStore } from 'react';
import type { CrudRecord, CrudListActionsApi } from '../types';
import { crudActionRegistry, crudActionSnapshots } from '../actions/registry';

/** Read the actions of the mounted list registered under `scope`. */
export function useCrudListActions<TRecord extends CrudRecord = CrudRecord>(
  scope: string
): CrudListActionsApi<TRecord> {
  const subscribe = useCallback(
    (onStoreChange: () => void) => crudActionRegistry.subscribe('list', scope, onStoreChange),
    [scope]
  );
  const getSnapshot = useCallback(
    () => crudActionRegistry.getListSnapshot<TRecord>(scope),
    [scope]
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => crudActionSnapshots.list);
}
