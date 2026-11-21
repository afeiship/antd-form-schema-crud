import type { CardProps } from 'antd';
import type { CrudActions, CrudFormProps, CrudListKeys } from './types';

/** UI defaults shared by SchemaCrudForm and SchemaCrudList. */
export interface SchemaCrudDefaults {
  /** Card density for both the form and the list; defaults to `middle`. */
  cardSize?: CardProps['size'];
}

let globalSchemaCrudDefaults: SchemaCrudDefaults = {};

/** Configure shared UI defaults once for the whole project. */
export function configureSchemaCrud(defaults: SchemaCrudDefaults): void {
  if (defaults.cardSize !== undefined) {
    globalSchemaCrudDefaults = { ...globalSchemaCrudDefaults, cardSize: defaults.cardSize };
  }
}

/** Return shared UI defaults as a copy. */
export function getSchemaCrudDefaults(): SchemaCrudDefaults {
  return { ...globalSchemaCrudDefaults };
}

/** Effective Card size; both components read this one value. */
export function getSchemaCrudCardSize(): NonNullable<CardProps['size']> {
  return globalSchemaCrudDefaults.cardSize ?? 'middle';
}

/** Remove shared UI defaults. Primarily for tests and app teardown. */
export function resetSchemaCrudDefaults(): void {
  globalSchemaCrudDefaults = {};
}
import type { ReactNode } from 'react';

/**
 * Project-level defaults for SchemaCrudForm. Keep data and lifecycle props
 * (`schema`, `api`, `id`, callbacks) on the instance so they stay explicit.
 */
export interface SchemaCrudFormDefaults {
  /** Title subject; `false` hides the title for every instance. */
  title?: ReactNode | false;
  /** Delete confirmation default; the component falls back to `true`. */
  confirmDelete?: boolean;
  /** Button visibility and copy defaults, merged with per-instance actions. */
  actions?: CrudActions;
  /** SchemaForm prop defaults, merged with per-instance formProps. */
  formProps?: CrudFormProps;
}

let globalDefaults: SchemaCrudFormDefaults = {};

export interface SchemaCrudListDefaults {
  /** Request and response key names. Omitted keys keep the defaults. */
  keys?: Partial<CrudListKeys>;
}

const DEFAULT_LIST_KEYS: CrudListKeys = {
  page: 'page',
  size: 'size',
  rows: 'rows',
  total: 'total',
};

let globalListDefaults: SchemaCrudListDefaults = {};

function resolveListKey(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

/** Effective list key names after merging project-level defaults. */
export function getSchemaCrudListKeys(): CrudListKeys {
  const keys = globalListDefaults.keys ?? {};
  return {
    page: resolveListKey(keys.page, DEFAULT_LIST_KEYS.page),
    size: resolveListKey(keys.size, DEFAULT_LIST_KEYS.size),
    rows: resolveListKey(keys.rows, DEFAULT_LIST_KEYS.rows),
    total: resolveListKey(keys.total, DEFAULT_LIST_KEYS.total),
  };
}

/** Merge project-level list defaults. Usually called once near the API setup. */
export function configureSchemaCrudList(defaults: SchemaCrudListDefaults): void {
  if (defaults.keys !== undefined) {
    globalListDefaults = {
      ...globalListDefaults,
      keys: { ...globalListDefaults.keys, ...defaults.keys },
    };
  }
}

/** Return effective list defaults as a copy. */
export function getSchemaCrudListDefaults(): SchemaCrudListDefaults {
  return { keys: getSchemaCrudListKeys() };
}

/** Remove all project-level list defaults. */
export function resetSchemaCrudListDefaults(): void {
  globalListDefaults = {};
}

/** Merge project-level defaults. Top-level keys replace, matching configureSchemaForm. */
export function configureSchemaCrudForm(defaults: SchemaCrudFormDefaults): void {
  const next = { ...globalDefaults };
  if (defaults.title !== undefined) next.title = defaults.title;
  if (defaults.confirmDelete !== undefined) next.confirmDelete = defaults.confirmDelete;
  if (defaults.actions !== undefined) next.actions = defaults.actions;
  if (defaults.formProps !== undefined) next.formProps = defaults.formProps;
  globalDefaults = next;
}

/** Return a copy so callers cannot mutate the active defaults. */
export function getSchemaCrudFormDefaults(): SchemaCrudFormDefaults {
  const result = { ...globalDefaults };
  if (globalDefaults.actions) {
    result.actions = Object.fromEntries(
      Object.entries(globalDefaults.actions).map(([key, value]) => [
        key,
        value && typeof value === 'object' ? { ...value } : value,
      ])
    ) as CrudActions;
  }
  if (globalDefaults.formProps) result.formProps = { ...globalDefaults.formProps };
  return result;
}

/** Remove all project-level defaults. Primarily for tests and app teardown. */
export function resetSchemaCrudFormDefaults(): void {
  globalDefaults = {};
}
