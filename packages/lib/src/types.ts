import type { ReactNode, CSSProperties, ComponentProps } from 'react';
import type { ButtonProps } from 'antd';
import type { FormSchema, SchemaForm } from '@jswork/antd-form-schema';

export type CrudMode = 'create' | 'edit' | 'view';
export type CrudId = string | number;
export type CrudAction = 'load' | 'create' | 'update' | 'delete';

export type CrudRecord = Record<string, any>;
export type CrudValues = Record<string, any>;

/** The four resource methods. Every method is optional so partial APIs resolve per-action. */
export interface CrudApi<TRecord = CrudRecord> {
  show?: (params: { id: CrudId }) => Promise<TRecord>;
  create?: (values: CrudValues) => Promise<unknown>;
  update?: (values: CrudValues & { id: CrudId }) => Promise<unknown>;
  destroy?: (params: { id: CrudId }) => Promise<unknown>;
}

/** Per-button config; `false` on the parent hides the button. */
export interface CrudActionConfig {
  text?: ReactNode;
  props?: ButtonProps;
}

export interface CrudActions {
  /** Create / save button. */
  save?: false | CrudActionConfig;
  /** Create cancel, edit cancel, or view back button. */
  cancel?: false | CrudActionConfig;
  /** View-mode edit button. */
  edit?: false | CrudActionConfig;
  /** Delete button. */
  delete?: false | CrudActionConfig;
}

/** SchemaForm props minus the ones this component owns. */
export type CrudFormProps = Omit<
  ComponentProps<typeof SchemaForm>,
  'meta' | 'initialValues' | 'onFinish' | 'children' | 'onFormReady'
>;

export type CrudSuccessEvent =
  | { action: 'create'; result: unknown; values: CrudValues }
  | { action: 'update'; result: unknown; values: CrudValues }
  | { action: 'delete'; result: unknown };

export interface SchemaCrudProps<TRecord = CrudRecord> {
  /** Resource prefix; resolves `nx.$api[`${resource}_show`]` and friends. */
  resource?: string;
  /** Shared schema for create, edit and view. Never mutated. */
  schema: FormSchema;
  /** Record id; absent means create, present defaults to view. */
  id?: CrudId;
  /** Controlled mode; omit to let the component manage create/view/edit internally. */
  mode?: CrudMode;
  /** Explicit API methods; each one overrides the `resource` lookup for its action. */
  api?: CrudApi<TRecord>;

  /** Title subject, rendered as 新建 X / X详情 / 编辑 X. `false` hides the title. */
  title?: ReactNode | false;
  /** Custom content in Card extra, before the built-in back button. */
  extra?: ReactNode;
  actions?: CrudActions;
  /** Delete confirmation; defaults to true. */
  confirmDelete?: boolean;

  /** Defaults to `{ layout: 'vertical' }`. */
  formProps?: CrudFormProps;

  onSuccess?: (event: CrudSuccessEvent) => void;
  /** Create cancel and view back. Edit cancel returns to view internally. */
  onBack?: () => void;
  /** Called instead of mutating internal mode when `mode` is controlled. */
  onModeChange?: (mode: CrudMode) => void;
  onError?: (error: unknown, action: CrudAction) => void;

  className?: string;
  style?: CSSProperties;
}
