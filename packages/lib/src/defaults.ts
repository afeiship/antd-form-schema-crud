import type { CrudActions, CrudFormProps } from './types';
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
