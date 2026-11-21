import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Spin } from 'antd';
import type { FormInstance } from 'antd';
import cx from 'classnames';
import { SchemaForm } from '@jswork/antd-form-schema';
import type { FormSchema } from '@jswork/antd-form-schema';
import { checkRequirement, errorMessage, resolveApi } from '../api';
import { CLASS_NAME } from '../constants';
import { getSchemaCrudDefaults } from '../defaults';
import { useCrudActions } from '../hooks/use-crud-actions';
import { useCrudMode } from '../hooks/use-crud-mode';
import { useDirtyState } from '../hooks/use-dirty-state';
import { useLatest } from '../hooks/use-latest';
import { useRecordLoader } from '../hooks/use-record-loader';
import type { CrudRecord, CrudValues, SchemaCrudProps } from '../types';
import { alertTitleProps } from '../utils/antd';
import { SchemaCardExtra, SchemaCardTitle } from './schema-card-header';
import { SchemaFooter } from './schema-footer';

function SchemaCrudRender<TRecord extends CrudRecord = CrudRecord>(
  props: SchemaCrudProps<TRecord>
) {
  const {
    mode: controlledMode,
    schema,
    resource,
    id,
    api,
    title,
    extra,
    actions,
    confirmDelete,
    onSuccess,
    onBack,
    onModeChange,
    onError,
    formProps,
    className,
    style,
  } = props;

  const { mode, setMode } = useCrudMode({
    mode: controlledMode,
    id,
    onModeChange,
  });

  const projectDefaults = getSchemaCrudDefaults();
  const resolvedActions =
    projectDefaults.actions && actions
      ? { ...projectDefaults.actions, ...actions }
      : (actions ?? projectDefaults.actions);
  const resolvedFormProps = { ...projectDefaults.formProps, ...formProps };
  const resolvedConfirmDelete = confirmDelete ?? projectDefaults.confirmDelete ?? true;
  const resolvedTitle = title === undefined ? projectDefaults.title : title;

  const resolvedApi = useMemo(() => resolveApi<TRecord>(api, resource), [api, resource]);
  const requirement = checkRequirement(mode, resolvedApi, resource, id);
  const blocked = requirement.missing.length > 0;
  const needsLoad = mode !== 'create';

  const [reloadVersion, setReloadVersion] = useState(0);
  const [readyKey, setReadyKey] = useState('');
  const [dirtyBaseline, setDirtyBaseline] = useState<CrudValues>({});

  const formRef = useRef<FormInstance | null>(null);
  const resolvedApiRef = useLatest(resolvedApi);
  const reload = useCallback(() => setReloadVersion((value) => value + 1), []);

  const {
    actionError,
    submitLoading,
    deleteLoading,
    clearActionError,
    handleFinish,
    handleDelete,
  } = useCrudActions({
    mode,
    id,
    apiRef: resolvedApiRef,
    setMode,
    reload,
    onSuccess,
    onError,
  });

  const { record, loadState, loadError } = useRecordLoader<TRecord>({
    enabled: needsLoad,
    blocked,
    id,
    resource,
    reloadVersion,
    apiRef: resolvedApiRef,
    onError,
  });

  const loading = loadState === 'loading';
  const showForm = mode === 'create' ? !blocked : loadState === 'ready';
  const available = showForm && !loading && !loadError;

  const initialValues = useMemo<CrudValues>(() => {
    const base: CrudValues = { ...(schema.initialValues ?? {}) };
    if (mode === 'create') return base;
    return { ...base, ...((record as CrudValues | undefined) ?? {}) };
  }, [schema.initialValues, mode, record]);

  // Never mutate the incoming schema; only build a shallow copy.
  const resolvedSchema = useMemo<FormSchema>(
    () => ({ ...schema, initialValues, viewMode: mode === 'view' }),
    [schema, initialValues, mode]
  );

  const formKey = `${mode}:${String(id ?? '')}:${reloadVersion}`;
  const formReady = readyKey === formKey;

  const { dirty, check: checkDirty } = useDirtyState(mode === 'edit', dirtyBaseline);

  const {
    layout = 'vertical',
    onValuesChange: userOnValuesChange,
    ...restFormProps
  } = resolvedFormProps;

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
      userOnValuesChange?.(changedValues, allValues);
    },
    [checkDirty, userOnValuesChange]
  );

  const handleCancel = useCallback(() => {
    if (mode === 'edit') {
      setMode('view');
      clearActionError();
      return;
    }
    onBack?.();
  }, [mode, onBack, setMode, clearActionError]);

  const handleEdit = useCallback(() => {
    if (mode !== 'view' || record === undefined) return;
    setMode('edit');
    clearActionError();
  }, [mode, record, setMode, clearActionError]);

  const handleSubmit = useCallback(() => formRef.current?.submit(), []);

  const canCancel = resolvedActions?.cancel !== false && (mode === 'edit' || Boolean(onBack));
  const showBack = canCancel && (mode !== 'view' || Boolean(onBack));
  const subject = resolvedTitle === false ? null : (resolvedTitle ?? '记录');
  const titleNode = subject ? (
    <SchemaCardTitle mode={mode} subject={subject} dirty={dirty} />
  ) : undefined;
  const extraNode =
    extra || showBack ? (
      <SchemaCardExtra extra={extra} showBack={showBack} onBack={handleCancel} />
    ) : undefined;

  const footerNode = (
    <footer className={`${CLASS_NAME}__footer`}>
      <SchemaFooter
        mode={mode}
        actions={resolvedActions}
        hasDestroy={Boolean(resolvedApi.destroy)}
        submitLoading={submitLoading}
        deleteLoading={deleteLoading}
        formReady={formReady}
        dirty={dirty}
        available={available}
        canCancel={canCancel}
        confirmDelete={resolvedConfirmDelete}
        onCancel={handleCancel}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSubmit={handleSubmit}
      />
    </footer>
  );

  return (
    <Card
      data-component={CLASS_NAME}
      className={cx(CLASS_NAME, className)}
      style={style}
      title={titleNode}
      extra={extraNode}
      aria-busy={loading || undefined}
    >
      <Spin spinning={loading}>
        <div className={`${CLASS_NAME}__body`}>
          {blocked ? (
            <Alert type="error" showIcon {...alertTitleProps(requirement.message)} />
          ) : loadError ? (
            <Alert
              type="error"
              showIcon
              {...alertTitleProps('加载失败')}
              description={errorMessage(loadError, '记录加载失败，请稍后重试。')}
              action={
                <Button size="small" onClick={reload}>
                  重试
                </Button>
              }
            />
          ) : showForm ? (
            <SchemaForm
              {...restFormProps}
              layout={layout}
              key={formKey}
              meta={resolvedSchema}
              onFinish={handleFinish}
              onFormReady={handleFormReady}
              onValuesChange={handleValuesChange}
            />
          ) : null}

          {actionError ? (
            <Alert
              className={`${CLASS_NAME}__alert`}
              type="error"
              showIcon
              closable
              {...alertTitleProps(actionError.message)}
            />
          ) : null}
        </div>
        {footerNode}
      </Spin>
    </Card>
  );
}

export const SchemaCrud = Object.assign(SchemaCrudRender, {
  displayName: 'SchemaCrud',
  version: __VERSION__,
});

/** Backward-compatible alias; the previous default export name. */
export const AntdFormSchemaCrud = SchemaCrud;

export default SchemaCrud;
