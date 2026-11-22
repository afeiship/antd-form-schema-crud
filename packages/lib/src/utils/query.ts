import type {
  CrudListQueryConfig,
  CrudListQuerySourceContext,
  CrudListQueryUrlKeys,
} from '../types';

export interface CrudQueryUrlAdapter {
  source: CrudListQuerySourceContext;
  /** Writes initial defaults back to the URL without changing pagination. */
  onInitial?: (values: Record<string, any>) => void;
  /** Writes the complete query state to the URL. */
  onChange?: (
    values: Record<string, any>,
    options: { resetPage: boolean; knownKeys: readonly string[] }
  ) => void;
}

export interface CrudQueryPageUrlOptions {
  pageKey: string;
  sizeKey: string;
  pageSize: number;
  defaultPage: number;
  defaultPageSize: number;
  keepDefaultParams: boolean;
}

interface QueryKeyEntry {
  queryKey: string;
  urlKey: string;
}

function isEmptyValue(value: unknown) {
  return value === undefined || value === null;
}

/** Drop undefined / null while preserving empty strings and arrays. */
export function normalizeQueryValues(
  values: Record<string, any> | undefined
): Record<string, any> {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return {};
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => !isEmptyValue(value))
  );
}

function resolveQueryKeyEntries(
  urlKeys: CrudListQueryUrlKeys | undefined,
  knownKeys: readonly string[],
  pageKey: string,
  sizeKey: string
): QueryKeyEntry[] {
  const entries: QueryKeyEntry[] = [];
  if (Array.isArray(urlKeys)) {
    urlKeys.forEach((key) => entries.push({ queryKey: key, urlKey: key }));
  } else if (urlKeys) {
    Object.entries(urlKeys).forEach(([queryKey, urlKey]) => {
      entries.push({ queryKey, urlKey });
    });
  } else {
    knownKeys.forEach((key) => entries.push({ queryKey: key, urlKey: key }));
  }

  const reserved = new Set([pageKey, sizeKey]);
  return entries.filter(
    (entry) =>
      !reserved.has(entry.queryKey) &&
      !reserved.has(entry.urlKey) &&
      Boolean(entry.queryKey) &&
      Boolean(entry.urlKey)
  );
}

function coerceUrlValue(value: string, sample: unknown): unknown {
  if (typeof sample === 'number') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (typeof sample === 'boolean') {
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
  }
  return value;
}

function readUrlValue(
  searchParams: URLSearchParams,
  urlKey: string,
  sample: unknown
): unknown {
  const values = searchParams.getAll(urlKey);
  if (values.length === 0) return undefined;

  if (values.length === 1) {
    const value = coerceUrlValue(values[0], Array.isArray(sample) ? sample[0] : sample);
    return Array.isArray(sample) ? [value] : value;
  }

  return values.map((value) =>
    coerceUrlValue(value, Array.isArray(sample) ? sample[0] : sample)
  );
}

/** Read URL query values, filtered by urlKeys when provided. */
export function readCrudQueryUrl<TValues extends Record<string, any>>(
  searchParams: URLSearchParams | null | undefined,
  config: CrudListQueryConfig<TValues>,
  defaults: Record<string, any>,
  pageKey: string,
  sizeKey: string,
  extraKnownKeys: readonly string[] = []
): Record<string, any> {
  if (!searchParams || config.url === false) return {};

  const knownKeys = Array.from(
    new Set([...Object.keys(defaults), ...extraKnownKeys])
  );
  const entries = resolveQueryKeyEntries(config.urlKeys, knownKeys, pageKey, sizeKey);
  const result: Record<string, any> = {};

  entries.forEach(({ queryKey, urlKey }) => {
    const value = readUrlValue(searchParams, urlKey, defaults[queryKey]);
    if (value !== undefined) result[queryKey] = value;
  });

  return result;
}

/** Write URL values into an existing URLSearchParams instance. */
export function writeCrudQueryUrl<TValues extends Record<string, any>>(
  next: URLSearchParams,
  values: Record<string, any>,
  config: CrudListQueryConfig<TValues>,
  page: CrudQueryPageUrlOptions,
  options: { resetPage: boolean; removeMissing: boolean },
  extraKnownKeys: readonly string[] = []
): void {
  const knownKeys = Array.from(
    new Set([...Object.keys(values), ...extraKnownKeys])
  );
  const entries = resolveQueryKeyEntries(
    config.urlKeys,
    knownKeys,
    page.pageKey,
    page.sizeKey
  );

  if (options.removeMissing) {
    entries.forEach(({ queryKey, urlKey }) => {
      if (isEmptyValue(values[queryKey])) next.delete(urlKey);
    });
  }

  entries.forEach(({ queryKey, urlKey }) => {
    const value = values[queryKey];
    next.delete(urlKey);
    if (isEmptyValue(value)) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (!isEmptyValue(item)) next.append(urlKey, String(item));
      });
      return;
    }
    next.set(urlKey, String(value));
  });

  if (!options.resetPage) return;

  if (page.keepDefaultParams || 1 !== page.defaultPage) {
    next.set(page.pageKey, '1');
  } else {
    next.delete(page.pageKey);
  }

  if (page.keepDefaultParams || page.pageSize !== page.defaultPageSize) {
    next.set(page.sizeKey, String(page.pageSize));
  } else {
    next.delete(page.sizeKey);
  }
}

/** Merge query values under fixed params; fixed params win. */
export function mergeCrudQueryParams(
  queryValues: Record<string, any>,
  params: Record<string, any> | undefined
): Record<string, any> {
  return {
    ...normalizeQueryValues(queryValues),
    ...(params ?? {}),
  };
}

export function hasQueryParams<TValues extends Record<string, any>>(
  config: CrudListQueryConfig<TValues> | undefined
): config is CrudListQueryConfig<TValues> {
  if (!config || !config.slots) return false;
  return Object.values(config.slots).some(Boolean);
}
