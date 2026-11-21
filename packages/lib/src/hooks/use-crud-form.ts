import { useCallback, useMemo, useRef, useState } from 'react';
import type { FormInstance } from 'antd';
import type { FormSchema } from '@jswork/antd-form-schema';
import type { CrudId, CrudMode, CrudValues } from '../types';
import { useDirtyState } from './use-dirty-state';

interface UseCrudFormOptions {
  mode: CrudMode;
  id?: CrudId;
  schema: FormSchema;
  record?: CrudValues;
  recordVersion?: number;
  reloadVersion: number;
  onValuesChange?: (changedValues: CrudValues, allValues: CrudValues) => void;
}

/**
 * Form state derived from mode + record: schema copy, initial values, form key,
 * readiness, dirty tracking, and submit. The component keeps layout props.
 */
export function useCrudForm({
  mode,
  id,
  schema,
  record,
  recordVersion = 0,
  reloadVersion,
  onValuesChange,
}: UseCrudFormOptions) {
  const [readyKey, setReadyKey] = useState('');
  const [dirtyBaseline, setDirtyBaseline] = useState<CrudValues>({});
  const formRef = useRef<FormInstance | null>(null);

  const initialValues = useMemo<CrudValues>(() => {
    const base: CrudValues = { ...(schema.initialValues ?? {}) };
    if (mode === 'create') return base;
    return { ...base, ...(record ?? {}) };
  }, [schema.initialValues, mode, record]);

  // Never mutate the incoming schema; only build a shallow copy.
  const resolvedSchema = useMemo<FormSchema>(
    () => ({ ...schema, initialValues, viewMode: mode === 'view' }),
    [schema, initialValues, mode]
  );

  // A reload loads a new record object; remount the form so initialValues
  // follow that record instead of keeping the previous form store.
  const formKey = `${mode}:${String(id ?? '')}:${reloadVersion}:${recordVersion}`;
  const formReady = readyKey === formKey;
  const { dirty, check: checkDirty } = useDirtyState(mode === 'edit', dirtyBaseline);

  const handleFormReady = useCallback(
    (form: FormInstance) => {
      formRef.current = form;
      setReadyKey(formKey);
      if (mode === 'edit') setDirtyBaseline(form.getFieldsValue());
    },
    [formKey, mode]
  );

  const handleValuesChange = useCallback(
    (changedValues: CrudValues, allValues: CrudValues) => {
      checkDirty(allValues);
      onValuesChange?.(changedValues, allValues);
    },
    [checkDirty, onValuesChange]
  );

  const submit = useCallback(() => formRef.current?.submit(), []);

  return {
    resolvedSchema,
    formKey,
    formReady,
    dirty,
    submit,
    handleFormReady,
    handleValuesChange,
  };
}
