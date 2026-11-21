import { useMemo } from 'react';
import { useCrudForm } from '../../hooks/use-crud-form';
import { useCrudMode } from '../../hooks/use-crud-mode';
import { useSaveShortcut } from '../../hooks/use-save-shortcut';
import type { CrudRecord, CrudValues, SchemaCrudFormProps } from '../../types';
import { selectSchemaFields } from '../../utils/schema';
import type { SchemaCrudFormState } from './form-state.types';
import { resolveFormConfig } from './resolve-form-config';
import { useFormNavigation } from './use-form-navigation';
import { useFormRequestState } from './use-form-request-state';

/** All headless state and handlers for the CRUD form card. */
export function useSchemaCrudFormState<TRecord extends CrudRecord = CrudRecord>(
  props: SchemaCrudFormProps<TRecord>
): SchemaCrudFormState<TRecord> {
  const {
    mode: controlledMode,
    schema,
    resource,
    id,
    api,
    onSuccess,
    onBack,
    onModeChange,
    onError,
    viewFields,
  } = props;

  const { mode, setMode, isForm } = useCrudMode({ mode: controlledMode, id, onModeChange });
  const config = resolveFormConfig(props);
  const { actions: resolvedActions, formProps: resolvedFormProps } = config;
  const { confirmDelete: resolvedConfirmDelete, title: resolvedTitle } = config;

  const request = useFormRequestState<TRecord>({
    mode,
    formMode: isForm,
    resource,
    id,
    api,
    setMode,
    onBack,
    onSuccess,
    onError,
  });

  const {
    layout = 'horizontal',
    labelCol = { flex: '100px' },
    wrapperCol = { style: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 } },
    onValuesChange: userOnValuesChange,
    ...restFormProps
  } = resolvedFormProps;

  const {
    resolvedSchema: loadedSchema,
    formKey,
    formReady,
    dirty,
    submit,
    handleFormReady,
    handleValuesChange,
  } = useCrudForm({
    mode,
    id,
    schema,
    record: request.record as CrudValues | undefined,
    recordVersion: request.recordVersion,
    reloadVersion: request.reloadVersion,
    onValuesChange: userOnValuesChange,
  });

  const resolvedSchema = useMemo(
    () => (mode === 'view' ? selectSchemaFields(loadedSchema, viewFields) : loadedSchema),
    [loadedSchema, mode, viewFields]
  );

  const canSave =
    request.available &&
    mode !== 'view' &&
    resolvedActions?.save !== false &&
    !request.submitLoading &&
    !request.deleteLoading &&
    formReady &&
    (mode === 'create' || dirty);

  useSaveShortcut({
    enabled: request.available && mode !== 'view' && resolvedActions?.save !== false,
    canSave,
    onSave: submit,
  });

  const { handleCancel, handleEdit, canCancel, showTitleBack } = useFormNavigation({
    mode,
    formMode: isForm,
    setMode,
    record: request.record,
    actions: resolvedActions,
    onBack,
    clearActionError: request.clearActionError,
  });

  return {
    ...request,
    resolvedActions,
    restFormProps,
    resolvedConfirmDelete,
    resolvedTitle,
    resolvedSchema,
    formKey,
    dirty,
    submit,
    handleFormReady,
    handleValuesChange,
    handleCancel,
    handleEdit,
    canSave,
    canCancel,
    showTitleBack,
    layout,
    labelCol,
    wrapperCol,
  };
}
