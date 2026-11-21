import type { CrudApi, CrudRecord } from '../types';

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
    index: api?.index ?? (fromResource('index') as CrudApi<TRecord>['index']),
    show: api?.show ?? (fromResource('show') as CrudApi<TRecord>['show']),
    create: api?.create ?? fromResource('create'),
    update: api?.update ?? fromResource('update'),
    destroy: api?.destroy ?? fromResource('destroy'),
  };
}
