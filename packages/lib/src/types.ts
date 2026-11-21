import type { ReactNode, ComponentProps, Key } from 'react';
import type { ButtonProps, TableProps } from 'antd';
import type { FormSchema, SchemaForm } from '@jswork/antd-form-schema';

export type CrudMode = 'create' | 'edit' | 'view';
/** `form` resolves to `create` without an id and `edit` with one. */
export type CrudFormMode = CrudMode | 'form';
export type CrudId = string | number;
export type CrudAction = 'load' | 'create' | 'update' | 'delete';

export type CrudRecord = Record<string, any>;
export type CrudValues = Record<string, any>;
export type CrudActionSurface = 'list' | 'form';

/** Actions exposed by a mounted SchemaCrudList instance. */
export interface CrudListActionsApi<TRecord extends CrudRecord = CrudRecord> {
  /** True while a matching list instance is mounted and registered. */
  ready: boolean;
  reload: () => void;
  create: () => void;
  edit: (record: TRecord) => void;
  /** Runs delete directly; caller owns confirmation. Resolves after the request and callbacks settle. */
  remove: (record: TRecord) => Promise<void>;
}

/** Actions exposed by a mounted SchemaCrudForm instance. */
export interface CrudFormActionsApi {
  /** True while a matching form instance is mounted and registered. */
  ready: boolean;
  submit: () => void;
  reload: () => void;
  edit: () => void;
  cancel: () => void;
  /** Runs delete directly; caller owns confirmation. Resolves after the request and callbacks settle. */
  remove: () => Promise<void>;
}

/** Configurable request/response keys for resource list. */
export interface CrudListKeys {
  page: string;
  size: string;
  rows: string;
  total: string;
}

/** Fixed payload for resource list requests. */
export interface CrudListParams {
  page: number;
  size: number;
  [key: string]: any;
}

/** Fixed response shape for `${resource}_index`. */
export interface CrudListResult<TRecord = CrudRecord> {
  rows: TRecord[];
  total: number;
}

/** The five resource methods. Every method is optional so partial APIs resolve per-action. */
export interface CrudApi<TRecord = CrudRecord> {
  index?: (params: CrudListParams) => Promise<CrudListResult<TRecord>>;
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

export interface ListActions {
  /** New button; needs `onCreate` to render. */
  create?: false | CrudActionConfig;
  /** Refresh button; visible by default. */
  refresh?: false | CrudActionConfig;
  /** Edit action; needs `onEdit` to render. */
  edit?: false | CrudActionConfig;
  /** Row delete action; needs `destroy` to render. */
  delete?: false | CrudActionConfig;
}

/** Column presentation presets, keyed by field key. */
export interface ListPresetField {
  /** Hide this schema-derived column; the form field is unchanged. */
  hidden?: boolean;
  title?: ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  ellipsis?: boolean;
  fixed?: 'left' | 'right';
}

export interface ListPresetsInput {
  fields?: Record<string, ListPresetField>;
}

/** Sectioned presets, or a flat key -> title map. */
export type ListPresets = ListPresetsInput | Record<string, string>;

/** SchemaForm props minus the ones this component owns. */
export type CrudFormProps = Omit<
  ComponentProps<typeof SchemaForm>,
  'meta' | 'initialValues' | 'onFinish' | 'children' | 'onFormReady'
>;

export type CrudSuccessEvent =
  | { action: 'create'; result: unknown; values: CrudValues }
  | { action: 'update'; result: unknown; values: CrudValues }
  | { action: 'delete'; result: unknown };

export interface SchemaCrudFormProps<TRecord = CrudRecord> {
  /** Resource prefix; resolves `nx.$api[`${resource}_show`]` and friends. */
  resource?: string;
  /** Shared schema for create, edit and view. Never mutated. */
  schema: FormSchema;
  /** Record id; absent means create, present defaults to view. */
  id?: CrudId;
  /** Controlled mode; omit to let the component manage create/view/edit internally. */
  mode?: CrudFormMode;
  /** Explicit API methods; each one overrides the `resource` lookup for its action. */
  api?: CrudApi<TRecord>;

  /** Title subject, rendered as 新建 X / X详情 / 编辑 X. `false` hides the title. */
  title?: ReactNode | false;
  /** Custom content in Card extra, before the built-in back button. */
  extra?: ReactNode;
  actions?: CrudActions;
  /** Delete confirmation; defaults to true. */
  confirmDelete?: boolean;
  /** Scope used by useCrudFormActions; falls back to resource when omitted. */
  actionScope?: string;

  /** Defaults to horizontal layout with a 100px label column and a shrinkable control column. */
  formProps?: CrudFormProps;
  /**
   * Field keys shown in view mode, in this order. Create/edit keep the full schema.
   * Omitted = all fields.
   */
  viewFields?: readonly string[];

  onSuccess?: (event: CrudSuccessEvent) => void;
  /** Create cancel and view back. Edit cancel returns to view internally. */
  onBack?: () => void;
  /** Called instead of mutating internal mode when `mode` is controlled. */
  onModeChange?: (mode: CrudMode) => void;
  onError?: (error: unknown, action: CrudAction) => void;

  className?: string;
}

export interface SchemaCrudListProps<TRecord extends CrudRecord = CrudRecord> {
  resource?: string;
  schema: FormSchema;
  api?: CrudApi<TRecord>;

  title?: ReactNode | false;
  /** Column presentation presets, keyed by field key. */
  presets?: ListPresets;
  /** Explicit columns; omitted columns are derived from schema.fields. */
  columns?: TableProps<TRecord>['columns'];
  /**
   * Restrict derived columns to these schema field keys, in this order.
   * Omitted = all fields; explicit `columns` wins.
   */
  fields?: readonly string[];
  rowKey?: keyof TRecord | ((record: TRecord) => Key);

  /** Business filters, sent with page / size. */
  params?: Record<string, any>;
  /** Controlled current page. Passing page or pageSize disables URL syncing. */
  page?: number;
  pageSize?: number;
  /** Keep page / size in the URL even when they equal the defaults. Defaults to true. */
  keepDefaultParams?: boolean;

  actions?: ListActions;
  confirmDelete?: boolean;
  /** Scope used by useCrudListActions; falls back to resource when omitted. */
  actionScope?: string;
  tableProps?: Omit<
    TableProps<TRecord>,
    'columns' | 'dataSource' | 'pagination' | 'rowKey' | 'loading'
  >;

  /** Router context defaults to `${pathname}/add${search}`. */
  onCreate?: () => void;
  /** Router context defaults to `${pathname}/${record[rowKey]}/edit${search}`. */
  onEdit?: (record: TRecord) => void;
  /** Called whenever the page or page size changes, including params reset and delete rollback. */
  onPageChange?: (page: number, pageSize: number) => void;
  /** Row delete success; router context defaults to a “删除成功” toast. */
  onSuccess?: (event: CrudSuccessEvent) => void;
  /** Router context defaults to an “操作失败，请重试。” toast. */
  onError?: (error: unknown, action: CrudAction) => void;
  /** List page back. */
  onBack?: () => void;

  className?: string;
}
