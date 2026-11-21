import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Space, Spin } from 'antd';
import type { FormInstance } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import cx from 'classnames';
import { SchemaForm } from '@jswork/antd-form-schema';
import type { FormSchema } from '@jswork/antd-form-schema';
import { checkRequirement, errorMessage, resolveApi } from '../api';
import { CLASS_NAME } from '../constants';
import { useCrudMode } from '../hooks/use-crud-mode';
import { useDirtyState } from '../hooks/use-dirty-state';
import { useLatest } from '../hooks/use-latest';
import { useRecordLoader } from '../hooks/use-record-loader';
import type { CrudAction, CrudId, CrudRecord, CrudValues, SchemaCrudProps } from '../types';
import { alertTitleProps } from '../utils/antd';
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
    confirmDelete = true,
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

  const resolvedApi = useMemo(() => resolveApi<TRecord>(api, resource), [api, resource]);
  const requirement = checkRequirement(mode, resolvedApi, resource, id);
  const blocked = requirement.missing.length > 0;
  const needsLoad = mode !== 'create';

  const [actionError, setActionError] = useState<{ action: CrudAction; message: string } | null>(
    null
  );
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [pendingReload, setPendingReload] = useState(false);
  const [readyKey, setReadyKey] = useState('');
  const [dirtyBaseline, setDirtyBaseline] = useState<CrudValues>({});

  const formRef = useRef<FormInstance | null>(null);
  const submittingRef = useRef(false);
  const deletingRef = useRef(false);
  const resolvedApiRef = useLatest(resolvedApi);

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

  useEffect(() => {
    if (mode === 'create') setActionError(null);
  }, [mode]);

  useEffect(() => {
    setActionError(null);
  }, [id]);

  // After an update, refetch the same record before showing the refreshed view.
  // In controlled mode this waits until the caller actually switches to view.
  useEffect(() => {
    if (!pendingReload || mode !== 'view') return;
    setPendingReload(false);
    setReloadVersion((value) => value + 1);
  }, [pendingReload, mode]);

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
  } = formProps ?? {};

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

  const handleFinish = useCallback(
    async (values: CrudValues) => {
      const action: CrudAction = mode === 'create' ? 'create' : 'update';
      const apiFn = resolvedApiRef.current[action];
      if (!apiFn || submittingRef.current || deletingRef.current) return;

      setActionError(null);
      submittingRef.current = true;
      setSubmitLoading(true);
      try {
        if (mode === 'create') {
          const result = await resolvedApiRef.current.create?.(values);
          onSuccess?.({ action: 'create', result, values });
        } else {
          const payload = { ...values, id: id as CrudId };
          const result = await resolvedApiRef.current.update?.(payload);
          onSuccess?.({ action: 'update', result, values });
          setMode('view');
          setPendingReload(true);
        }
      } catch (error) {
        setActionError({ action, message: errorMessage(error) });
        onError?.(error, action);
      } finally {
        submittingRef.current = false;
        setSubmitLoading(false);
      }
    },
    [mode, id, onSuccess, onError, resolvedApiRef, setMode]
  );

  const handleDelete = useCallback(async () => {
    const destroy = resolvedApiRef.current.destroy;
    if (
      !destroy ||
      id === undefined ||
      id === null ||
      submittingRef.current ||
      deletingRef.current
    ) {
      return;
    }

    setActionError(null);
    deletingRef.current = true;
    setDeleteLoading(true);
    try {
      const result = await destroy({ id });
      onSuccess?.({ action: 'delete', result });
      setMode('create');
    } catch (error) {
      setActionError({ action: 'delete', message: errorMessage(error, '删除失败，请重试。') });
      onError?.(error, 'delete');
    } finally {
      deletingRef.current = false;
      setDeleteLoading(false);
    }
  }, [id, onSuccess, onError, resolvedApiRef, setMode]);

  const handleCancel = useCallback(() => {
    if (mode === 'edit') {
      setMode('view');
      setActionError(null);
      return;
    }
    onBack?.();
  }, [mode, onBack, setMode]);

  const handleEdit = useCallback(() => {
    if (mode !== 'view' || record === undefined) return;
    setMode('edit');
    setActionError(null);
  }, [mode, record, setMode]);

  const handleRetry = useCallback(() => setReloadVersion((value) => value + 1), []);
  const handleSubmit = useCallback(() => formRef.current?.submit(), []);

  const canCancel = actions?.cancel !== false && (mode === 'edit' || Boolean(onBack));
  const subject = title === false ? null : (title ?? '记录');
  const titleText =
    mode === 'view' ? (
      <>{subject}详情</>
    ) : (
      <>
        {mode === 'create' ? '新建' : '编辑'}
        {subject}
      </>
    );

  const titleNode = subject ? (
    <Space size={6}>
      <span>{titleText}</span>
      {dirty ? <span className={`${CLASS_NAME}__dirty`} aria-label="有未保存修改" /> : null}
    </Space>
  ) : undefined;

  const backButton =
    canCancel && (mode !== 'view' || Boolean(onBack)) ? (
      <Button size="small" icon={<ArrowLeftOutlined />} onClick={handleCancel}>
        返回
      </Button>
    ) : undefined;

  const extraNode =
    extra || backButton ? (
      <Space>
        {extra}
        {backButton}
      </Space>
    ) : undefined;

  const footerNode = (
    <footer className={`${CLASS_NAME}__footer`}>
      <SchemaFooter
        mode={mode}
        actions={actions}
        hasDestroy={Boolean(resolvedApi.destroy)}
        submitLoading={submitLoading}
        deleteLoading={deleteLoading}
        formReady={formReady}
        dirty={dirty}
        available={available}
        canCancel={canCancel}
        confirmDelete={confirmDelete}
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
                <Button size="small" onClick={handleRetry}>
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
