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

  const formKey = `${mode}:${String(id ?? '')}:${reloadVersion}`;
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
