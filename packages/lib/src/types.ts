import type { ReactNode, CSSProperties, ComponentProps } from 'react';
import type { ButtonProps, PopconfirmProps, FormInstance } from 'antd';
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
  submit?: false | CrudActionConfig;
  cancel?: false | CrudActionConfig;
  edit?: false | CrudActionConfig;
  delete?: false | CrudActionConfig;
}

/** SchemaForm props minus the ones this component owns. */
export type CrudFormProps = Omit<
  ComponentProps<typeof SchemaForm>,
  'meta' | 'initialValues' | 'onFinish' | 'children' | 'onFormReady'
>;

export interface SchemaCrudProps<TRecord = CrudRecord> {
  /** Which lifecycle the component renders. Owned by the caller, never switched internally. */
  mode: CrudMode;
  /** Shared schema for create, edit and view. Never mutated. */
  schema: FormSchema;
  /** Resource prefix; resolves `nx.$api[`${resource}_show`]` and friends. */
  resource?: string;
  /** Record id; required by `edit` and `view`. */
  id?: CrudId;
  /** Explicit API methods; each one overrides the `resource` lookup for its action. */
  api?: CrudApi<TRecord>;
  /** Seed values for `create`; merged over `schema.initialValues`. */
  createInitialValues?: CrudValues;
  /** Maps the `show` payload onto form values. */
  mapRecord?: (record: TRecord) => CrudValues;
  /** Runs right before `create` / `update`; may be async. */
  beforeSubmit?: (
    values: CrudValues,
    ctx: { mode: CrudMode; id?: CrudId }
  ) => CrudValues | Promise<CrudValues>;

  title?: ReactNode;
  extra?: ReactNode;
  /** Replaces the whole default action bar; `false` hides it entirely. */
  footer?: ReactNode | false;
  /** Per-button text and props; `false` hides a button. */
  actions?: CrudActions;

  canEdit?: boolean;
  canDelete?: boolean;
  /** `false` deletes without confirmation; an object is forwarded to Popconfirm. */
  deleteConfirm?: false | PopconfirmProps;

  onEdit?: (record: TRecord) => void;
  onCancel?: () => void;
  onCreated?: (result: unknown, values: CrudValues) => void;
  onUpdated?: (result: unknown, values: CrudValues) => void;
  onDeleted?: (result: unknown) => void;
  onError?: (error: unknown, action: CrudAction) => void;
  onFormReady?: (form: FormInstance) => void;

  formProps?: CrudFormProps;
  className?: string;
  style?: CSSProperties;
}
