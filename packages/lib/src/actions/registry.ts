import type {
  CrudActionSurface,
  CrudFormActionsApi,
  CrudListActionsApi,
  CrudRecord,
} from '../types';

type RegisteredActions = CrudListActionsApi<any> | CrudFormActionsApi;
type Listener = () => void;

const entries: Record<CrudActionSurface, Map<string, RegisteredActions>> = {
  list: new Map(),
  form: new Map(),
};

const listeners: Record<CrudActionSurface, Map<string, Set<Listener>>> = {
  list: new Map(),
  form: new Map(),
};

const emptyListActions = Object.freeze({
  ready: false,
  reload: () => undefined,
  create: () => undefined,
  edit: () => undefined,
  remove: async () => undefined,
}) as CrudListActionsApi<any>;

const emptyFormActions = Object.freeze({
  ready: false,
  submit: () => undefined,
  reload: () => undefined,
  edit: () => undefined,
  cancel: () => undefined,
  remove: async () => undefined,
}) as CrudFormActionsApi;

function notify(surface: CrudActionSurface, scope: string) {
  listeners[surface].get(scope)?.forEach((listener) => listener());
}

function subscribe(surface: CrudActionSurface, scope: string, listener: Listener) {
  const byScope = listeners[surface];
  const bucket = byScope.get(scope) ?? new Set<Listener>();
  bucket.add(listener);
  byScope.set(scope, bucket);

  return () => {
    bucket.delete(listener);
    if (bucket.size === 0) byScope.delete(scope);
  };
}

function getListSnapshot<TRecord extends CrudRecord = CrudRecord>(
  scope: string
): CrudListActionsApi<TRecord> {
  return (entries.list.get(scope) as CrudListActionsApi<TRecord> | undefined) ?? emptyListActions;
}

function getFormSnapshot(scope: string): CrudFormActionsApi {
  return (entries.form.get(scope) as CrudFormActionsApi | undefined) ?? emptyFormActions;
}

function register(
  surface: CrudActionSurface,
  scope: string | undefined,
  actions: RegisteredActions
) {
  if (!scope) return () => undefined;

  const byScope = entries[surface];
  if (byScope.has(scope)) {
    console.error(
      `[antd-form-schema-crud] Duplicate ${surface} action scope "${scope}". ` +
        'The first mounted instance keeps ownership; give each instance a unique actionScope.'
    );
    return () => undefined;
  }

  byScope.set(scope, actions);
  notify(surface, scope);
  let active = true;

  return () => {
    if (!active) return;
    active = false;
    if (byScope.get(scope) !== actions) return;
    byScope.delete(scope);
    notify(surface, scope);
  };
}

/** Stable empty snapshots for hooks before an instance mounts and for SSR. */
export const crudActionSnapshots = {
  list: emptyListActions,
  form: emptyFormActions,
};

export const crudActionRegistry = {
  subscribe,
  register,
  getListSnapshot,
  getFormSnapshot,
};
