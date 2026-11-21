import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Key, MutableRefObject } from 'react';
import { errorMessage } from '../api';
import type {
  CrudApi,
  CrudAction,
  CrudListParams,
  CrudRecord,
  CrudSuccessEvent,
} from '../types';
import {
  assertListResult,
  getRecordId,
  getRecordKey,
  stableStringify,
} from '../utils/list';
import { useLatest } from './use-latest';

interface UseCrudListOptions<TRecord extends CrudRecord> {
  enabled: boolean;
  resource?: string;
  /** Always points at the latest merged API. */
  apiRef: MutableRefObject<CrudApi<TRecord>>;
  params?: Record<string, any>;
  pageSize: number;
  rowKey: keyof TRecord | ((record: TRecord) => Key);
  onSuccess?: (event: CrudSuccessEvent) => void;
  onError?: (error: unknown, action: CrudAction) => void;
}

interface CrudListResultState<TRecord> {
  page: number;
  pageSize: number;
  rows: TRecord[];
  total: number;
  loading: boolean;
  loadError: unknown;
  actionError: { action: CrudAction; message: string } | null;
  deletingKey: Key | null;
  reload: () => void;
  handlePageChange: (page: number, pageSize: number) => void;
  handleDelete: (record: TRecord) => Promise<void>;
  clearActionError: () => void;
}

/**
 * Owns list pagination, requests and stale-response dropping. Filter identity is
 * reduced to a stable key so inline params objects do not trigger extra fetches.
 */
export function useCrudList<TRecord extends CrudRecord>({
  enabled,
  resource,
  apiRef,
  params,
  pageSize,
  rowKey,
  onSuccess,
  onError,
}: UseCrudListOptions<TRecord>): CrudListResultState<TRecord> {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);
  const [rows, setRows] = useState<TRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<{ action: CrudAction; message: string } | null>(
    null
  );
  const [deletingKey, setDeletingKey] = useState<Key | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  const requestIdRef = useRef(0);
  const deletingRef = useRef(false);
  const paramsRef = useLatest(params);
  const onErrorRef = useLatest(onError);
  const onSuccessRef = useLatest(onSuccess);
  const paramsKey = useMemo(() => stableStringify(params ?? {}), [params]);
  const previousParamsKeyRef = useRef(paramsKey);
  const previousPageSizeRef = useRef(pageSize);

  useEffect(() => {
    if (previousPageSizeRef.current === pageSize) return;
    previousPageSizeRef.current = pageSize;
    setSize(pageSize);
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const index = apiRef.current.index;
    if (!index) {
      setLoading(false);
      return;
    }

    if (previousParamsKeyRef.current !== paramsKey) {
      previousParamsKeyRef.current = paramsKey;
      if (page !== 1) {
        setPage(1);
        return;
      }
    }

    let active = true;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);
    setActionError(null);

    const payload: CrudListParams = {
      ...(paramsRef.current ?? {}),
      page,
      size,
    };

    Promise.resolve()
      .then(() => index(payload))
      .then((data) => {
        if (!active || requestId !== requestIdRef.current) return;
        const result = assertListResult<TRecord>(data, resource);
        setRows(result.rows);
        setTotal(result.total);
        setLoading(false);
      })
      .catch((error) => {
        if (!active || requestId !== requestIdRef.current) return;
        setLoadError(error);
        setLoading(false);
        onErrorRef.current?.(error, 'load');
      });

    return () => {
      active = false;
    };
  }, [enabled, page, size, paramsKey, reloadVersion, apiRef, resource, paramsRef, onErrorRef]);

  const reload = useCallback(() => {
    setReloadVersion((value) => value + 1);
  }, []);

  const handlePageChange = useCallback(
    (nextPage: number, nextPageSize: number) => {
      if (nextPageSize !== size) {
        setSize(nextPageSize);
        setPage(1);
        return;
      }
      setPage(nextPage);
    },
    [size]
  );

  const emitSuccess = useCallback(
    async (event: CrudSuccessEvent) => {
      try {
        await onSuccessRef.current?.(event);
      } catch (error) {
        onErrorRef.current?.(error, event.action);
      }
    },
    [onSuccessRef, onErrorRef]
  );

  const handleDelete = useCallback(
    async (record: TRecord) => {
      const destroy = apiRef.current.destroy;
      const id = getRecordId(record);
      if (!destroy || id === undefined || deletingRef.current) return;

      deletingRef.current = true;
      setDeletingKey(getRecordKey(record, rowKey));
      setActionError(null);

      let result: unknown;
      try {
        result = await destroy({ id });
      } catch (error) {
        setActionError({ action: 'delete', message: errorMessage(error, '删除失败，请重试。') });
        onErrorRef.current?.(error, 'delete');
        return;
      } finally {
        deletingRef.current = false;
        setDeletingKey(null);
      }

      await emitSuccess({ action: 'delete', result });
      if (rows.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        reload();
      }
    },
    [apiRef, rowKey, rows.length, page, reload, emitSuccess, onErrorRef]
  );

  const clearActionError = useCallback(() => setActionError(null), []);

  return {
    page,
    pageSize: size,
    rows,
    total,
    loading,
    loadError,
    actionError,
    deletingKey,
    reload,
    handlePageChange,
    handleDelete,
    clearActionError,
  };
}
