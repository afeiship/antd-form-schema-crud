import type { FormInstance } from 'antd';
import type { FormSchema } from '@jswork/antd-form-schema';
import type { ApiRequirement } from '../../api';
import type {
  CrudAction,
  CrudActions,
  CrudApi,
  CrudFormProps,
  CrudMode,
  CrudRecord,
  CrudValues,
  SchemaCrudFormProps,
} from '../../types';

export interface SchemaCrudFormState<TRecord extends CrudRecord> {
  mode: CrudMode;
  record: TRecord | undefined;
  resolvedApi: CrudApi<TRecord>;
  resolvedActions: CrudActions | undefined;
  restFormProps: CrudFormProps;
  resolvedConfirmDelete: boolean;
  resolvedTitle: SchemaCrudFormProps<TRecord>['title'];
  resolvedSchema: FormSchema;
  requirement: ApiRequirement;
  blocked: boolean;
  loading: boolean;
  showForm: boolean;
  available: boolean;
  loadError: unknown;
  actionError: { action: CrudAction; message: string } | null;
  submitLoading: boolean;
  deleteLoading: boolean;
  formKey: string;
  dirty: boolean;
  submit: () => void;
  handleFinish: (values: CrudValues) => Promise<void>;
  handleDelete: () => Promise<void>;
  handleFormReady: (form: FormInstance) => void;
  handleValuesChange: (changedValues: CrudValues, allValues: CrudValues) => void;
  clearActionError: () => void;
  reload: () => void;
  handleCancel: () => void;
  handleEdit: () => void;
  canSave: boolean;
  canCancel: boolean;
  showTitleBack: boolean;
  layout: CrudFormProps['layout'];
  labelCol: CrudFormProps['labelCol'];
  wrapperCol: CrudFormProps['wrapperCol'];
}
