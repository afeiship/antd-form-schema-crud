import type { CrudApi, CrudId, CrudMode, CrudRecord } from './types';

type AnyFn = (...args: any[]) => any;

/**
 * Reads the global `nx.$api` table registered by `@jswork/next`.
 * Returns `undefined` when the host app has no nx runtime.
 */
export function getNxApi(): Record<string, AnyFn | undefined> | undefined {
  const g: any = typeof globalThis !== 'undefined' ? globalThis : {};
  const nx = g && g.nx;
  const api = nx && nx.$api;
  return api && typeof api === 'object' ? api : undefined;
}

/**
 * Merges an explicit `api` over the `${resource}_show` naming convention.
 * Explicit methods always win, per action.
 */
export function resolveApi<TRecord extends CrudRecord = CrudRecord>(
  api: CrudApi<TRecord> | undefined,
  resource: string | undefined
): CrudApi<TRecord> {
  const nxApi = getNxApi();
  const fromResource = (suffix: string) => {
    if (!resource || !nxApi) return undefined;
    const fn = nxApi[`${resource}_${suffix}`];
    return typeof fn === 'function' ? (fn as AnyFn) : undefined;
  };

  return {
    show: api?.show ?? (fromResource('show') as CrudApi<TRecord>['show']),
    create: api?.create ?? fromResource('create'),
    update: api?.update ?? fromResource('update'),
    destroy: api?.destroy ?? fromResource('destroy'),
  };
}

export interface ApiRequirement {
  /** Missing requirement keys, for message assembly. */
  missing: string[];
  /** Human readable message; empty when the mode is satisfiable. */
  message: string;
}

/**
 * Checks what the current mode still needs before a request may fire.
 * `create` needs create; `edit` needs id + show + update; `view` needs id + show.
 */
export function checkRequirement(
  mode: CrudMode,
  api: CrudApi,
  resource: string | undefined,
  id: CrudId | undefined
): ApiRequirement {
  const missing: string[] = [];
  const hasSource = Boolean(resource) || Object.values(api).some(Boolean);
  const hasId = id !== undefined && id !== null && id !== '';

  if (!hasSource) {
    return { missing: ['api'], message: '缺少 resource 或 api，无法定位资源接口。' };
  }

  if (mode === 'create') {
    if (!api.create) missing.push('create');
  } else {
    if (!hasId) missing.push('id');
    if (!api.show) missing.push('show');
    if (mode === 'edit' && !api.update) missing.push('update');
  }

  if (missing.length === 0) return { missing, message: '' };

  const map: Record<string, string> = {
    id: '缺少 id，无法加载记录。',
    show: `缺少 ${resource ? `${resource}_show` : 'show'} 接口。`,
    create: `缺少 ${resource ? `${resource}_create` : 'create'} 接口。`,
    update: `缺少 ${resource ? `${resource}_update` : 'update'} 接口。`,
  };

  return { missing, message: map[missing[0]] };
}

/**
 * Errors from `nx.$api` are usually `{ message, ... }` envelopes; dig out the
 * deepest readable string instead of rendering `[object Object]`.
 */
export function errorMessage(error: unknown, fallback = '操作失败，请重试。'): string {
  if (typeof error === 'string' && error) return error;
  if (error === undefined || error === null) return fallback;

  if (typeof error === 'object') {
    const record = error as Record<string, any>;
    const nested = record.error && typeof record.error === 'object' ? record.error : undefined;
    const message = (nested && nested.message) || record.message || record.msg;
    if (typeof message === 'string' && message) return message;
  }

  return fallback;
}
