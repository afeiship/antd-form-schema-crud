import { useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { CrudApi, CrudId, CrudRecord } from '../types';
import { useLatest } from './use-latest';

export type LoadState = 'idle' | 'loading' | 'ready' | 'error';

interface UseRecordLoaderOptions<TRecord extends CrudRecord> {
  /** create mode does not load anything. */
  enabled: boolean;
  /** true when the mode/API setup is invalid, so no request should fire. */
  blocked: boolean;
  id?: CrudId;
  resource?: string;
  /** Bumped to retry the same id. */
  reloadVersion: number;
  /** Always points at the latest merged API. */
  apiRef: MutableRefObject<CrudApi<TRecord>>;
  onError?: (error: unknown, action: 'load') => void;
  /** Called before each request, e.g. to reset form readiness. */
  onLoadStart?: () => void;
}

interface RecordLoaderResult<TRecord> {
  record: TRecord | undefined;
  /** Bumps after every successful load so the form can remount from the new record. */
  recordVersion: number;
  loadState: LoadState;
  loadError: unknown;
}

/**
 * Loads the record for edit / view. Stale responses (unmount or a newer request)
 * are dropped through the `active` flag; `nx.$api` calls are not cancelable,
 * so no AbortController here.
 */
export function useRecordLoader<TRecord extends CrudRecord>({
  enabled,
  blocked,
  id,
  resource,
  reloadVersion,
  apiRef,
  onError,
  onLoadStart,
}: UseRecordLoaderOptions<TRecord>): RecordLoaderResult<TRecord> {
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [record, setRecord] = useState<TRecord | undefined>(undefined);
  const [recordVersion, setRecordVersion] = useState(0);
  const [loadError, setLoadError] = useState<unknown>(null);
  const onErrorRef = useLatest(onError);
  const onLoadStartRef = useLatest(onLoadStart);

  useEffect(() => {
    if (!enabled) {
      setLoadState('ready');
      setRecord(undefined);
      setLoadError(null);
      return;
    }

    const show = blocked ? undefined : apiRef.current.show;
    if (!show) {
      setLoadState('idle');
      setRecord(undefined);
      return;
    }

    setLoadState('loading');
    setLoadError(null);
    setRecord(undefined);
    onLoadStartRef.current?.();

    let active = true;
    Promise.resolve()
      .then(() => show({ id: id as CrudId }))
      .then((data) => {
        if (!active) return;
        setRecord(data);
        setRecordVersion((value) => value + 1);
        setLoadState('ready');
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error);
        setLoadState('error');
        onErrorRef.current?.(error, 'load');
      });

    return () => {
      active = false;
    };
  }, [enabled, blocked, id, resource, reloadVersion, apiRef, onErrorRef, onLoadStartRef]);

  return { record, recordVersion, loadState, loadError };
}
