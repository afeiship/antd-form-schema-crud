import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { CrudListQueryConfig } from '../types';
import {
  normalizeQueryValues,
  readCrudQueryUrl,
  type CrudQueryUrlAdapter,
} from '../utils/query';
import { stableStringify } from '../utils/list';
import { useLatest } from './use-latest';

export interface CrudListQueryState<TValues extends Record<string, any>> {
  values: Partial<TValues>;
  setValues: (
    patch:
      | Partial<TValues>
      | ((current: Partial<TValues>) => Partial<TValues>),
    options?: { resetPage?: boolean }
  ) => void;
  reset: (values?: Partial<TValues>) => void;
}

interface UseCrudListQueryOptions<TValues extends Record<string, any>> {
  query?: CrudListQueryConfig<TValues>;
  urlAdapter?: CrudQueryUrlAdapter;
  pageKey: string;
  sizeKey: string;
  paramsResetPageRef?: MutableRefObject<boolean>;
}

/**
 * Owns the query values. It resolves defaults synchronously on mount so the
 * first slot render and the first list request see the same values.
 */
export function useCrudListQuery<TValues extends Record<string, any>>({
  query,
  urlAdapter,
  pageKey,
  sizeKey,
  paramsResetPageRef,
}: UseCrudListQueryOptions<TValues>): CrudListQueryState<TValues> {
  const [defaults] = useState<{
    values: Record<string, any>;
    keys: string[];
  }>(() => {
    const source = urlAdapter?.source ?? { searchParams: null, location: null };
    try {
      const raw =
        typeof query?.defaultValues === 'function'
          ? query.defaultValues(source)
          : query?.defaultValues;
      return {
        values: normalizeQueryValues(raw),
        keys:
          raw && typeof raw === 'object' && !Array.isArray(raw)
            ? Object.keys(raw)
            : [],
      };
    } catch (error) {
      console.error('[SchemaCrudList] defaultValues 求值失败，已按空对象处理。', error);
      return { values: {}, keys: [] };
    }
  });
  const baseline = defaults.values;

  const [initialValues] = useState<Record<string, any>>(() => {
    const urlValues = query
      ? readCrudQueryUrl(
          urlAdapter?.source.searchParams,
          query,
          baseline,
          pageKey,
          sizeKey,
          defaults.keys
        )
      : {};
    return normalizeQueryValues({ ...baseline, ...urlValues });
  });

  const baselineRef = useRef(baseline);
  const valuesRef = useRef(initialValues);
  const [values, setValuesState] = useState<Partial<TValues>>(
    initialValues as Partial<TValues>
  );
  const configRef = useLatest(query);
  const urlAdapterRef = useLatest(urlAdapter);
  const initialSyncRef = useRef(false);
  const knownKeys = useRef(
    Array.from(
      new Set([...defaults.keys, ...Object.keys(baseline), ...Object.keys(initialValues)])
    )
  );

  const commit = useCallback(
    (next: Record<string, any>, resetPage: boolean) => {
      const normalized = normalizeQueryValues(next);
      if (stableStringify(normalized) === stableStringify(valuesRef.current)) return;

      valuesRef.current = normalized;
      knownKeys.current = Array.from(
        new Set([...knownKeys.current, ...Object.keys(normalized)])
      );
      setValuesState(normalized as Partial<TValues>);

      const config = configRef.current;
      const urlSync =
        config?.url !== false && Boolean(urlAdapterRef.current?.onChange);
      if (paramsResetPageRef) paramsResetPageRef.current = urlSync ? false : resetPage;
      if (config && config.url !== false) {
        urlAdapterRef.current?.onChange?.(normalized, {
          resetPage,
          knownKeys: knownKeys.current,
        });
      }
    },
    [configRef, paramsResetPageRef, urlAdapterRef]
  );

  const setValues = useCallback<CrudListQueryState<TValues>['setValues']>(
    (patch, options) => {
      const current = valuesRef.current as Partial<TValues>;
      const partial =
        typeof patch === 'function' ? patch(current) : patch;
      commit(
        { ...current, ...(partial ?? {}) },
        options?.resetPage ?? true
      );
    },
    [commit]
  );

  const reset = useCallback<CrudListQueryState<TValues>['reset']>(
    (nextValues) => {
      commit(
        nextValues === undefined
          ? baselineRef.current
          : normalizeQueryValues(nextValues),
        true
      );
    },
    [commit]
  );

  useEffect(() => {
    if (initialSyncRef.current) return;
    initialSyncRef.current = true;

    const config = configRef.current;
    if (!config || config.url === false) return;
    urlAdapterRef.current?.onInitial?.(valuesRef.current);
  }, [configRef, urlAdapterRef]);

  return { values, setValues, reset };
}
