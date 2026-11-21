import { useCallback, useSyncExternalStore } from 'react';
import type { CrudFormActionsApi } from '../types';
import { crudActionRegistry, crudActionSnapshots } from '../actions/registry';

/** Read the actions of the mounted form registered under `scope`. */
export function useCrudFormActions(scope: string): CrudFormActionsApi {
  const subscribe = useCallback(
    (onStoreChange: () => void) => crudActionRegistry.subscribe('form', scope, onStoreChange),
    [scope]
  );
  const getSnapshot = useCallback(() => crudActionRegistry.getFormSnapshot(scope), [scope]);

  return useSyncExternalStore(subscribe, getSnapshot, () => crudActionSnapshots.form);
}
