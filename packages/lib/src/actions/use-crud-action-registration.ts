import { useEffect, useMemo } from 'react';
import { useLatest } from '../hooks/use-latest';
import type {
  CrudFormActionsApi,
  CrudListActionsApi,
  CrudRecord,
} from '../types';
import { crudActionRegistry } from './registry';

/** Publish list actions until the component unmounts. */
export function useRegisterCrudListActions<TRecord extends CrudRecord = CrudRecord>(
  scope: string | undefined,
  actions: Omit<CrudListActionsApi<TRecord>, 'ready'>
) {
  const latest = useLatest(actions);
  const stable = useMemo<CrudListActionsApi<TRecord>>(
    () => ({
      ready: true,
      reload: () => latest.current.reload(),
      create: () => latest.current.create(),
      edit: (record) => latest.current.edit(record),
      remove: (record) => latest.current.remove(record),
    }),
    [latest]
  );

  useEffect(() => crudActionRegistry.register('list', scope, stable), [scope, stable]);
}

/** Publish form actions until the component unmounts. */
export function useRegisterCrudFormActions(
  scope: string | undefined,
  actions: Omit<CrudFormActionsApi, 'ready'>
) {
  const latest = useLatest(actions);
  const stable = useMemo<CrudFormActionsApi>(
    () => ({
      ready: true,
      submit: () => latest.current.submit(),
      reload: () => latest.current.reload(),
      edit: () => latest.current.edit(),
      cancel: () => latest.current.cancel(),
      remove: () => latest.current.remove(),
    }),
    [latest]
  );

  useEffect(() => crudActionRegistry.register('form', scope, stable), [scope, stable]);
}
