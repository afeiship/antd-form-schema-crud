import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Spin } from 'antd';
import type { FormInstance } from 'antd';
import cx from 'classnames';
import { SchemaForm } from '@jswork/antd-form-schema';
import type { FormSchema } from '@jswork/antd-form-schema';
import { checkRequirement, errorMessage, resolveApi } from '../api';
import { CLASS_NAME } from '../constants';
import { useLatest } from '../hooks/use-latest';
import { useRecordLoader } from '../hooks/use-record-loader';
import type { CrudAction, CrudId, CrudRecord, CrudValues, SchemaCrudProps } from '../types';
import { alertTitleProps } from '../utils/antd';
import { SchemaFooter } from './schema-footer';
import { SchemaHeader } from './schema-header';

function SchemaCrudRender<TRecord extends CrudRecord = CrudRecord>(
  props: SchemaCrudProps<TRecord>
) {
  const {
    mode,
    schema,
    resource,
    id,
    api,
    createInitialValues,
    mapRecord,
    beforeSubmit,
    title,
    extra,
    footer,
    actions,
    canEdit = true,
    canDelete = true,
    deleteConfirm,
    onEdit,
    onCancel,
    onCreated,
    onUpdated,
    onDeleted,
    onError,
    onFormReady,
    formProps,
    className,
    style,
  } = props;

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
  const [formReady, setFormReady] = useState(false);

  const formRef = useRef<FormInstance | null>(null);
  const resolvedApiRef = useLatest(resolvedApi);
  const onErrorRef = useLatest(onError);

  const { record, loadState, loadError } = useRecordLoader<TRecord>({
    enabled: needsLoad,
    blocked,
    id,
    resource,
    reloadVersion,
    apiRef: resolvedApiRef,
    onError,
    onLoadStart: () => setFormReady(false),
  });

  const loading = loadState === 'loading';
  const showForm = mode === 'create' ? !blocked : loadState === 'ready';

  // Mirrors the previous loader effect: entering create clears stale action errors.
  useEffect(() => {
    if (mode === 'create') setActionError(null);
  }, [mode]);

  const initialValues = useMemo<CrudValues>(() => {
    const base: CrudValues = { ...(schema.initialValues ?? {}) };
    if (mode === 'create') {
      return { ...base, ...(createInitialValues ?? {}) };
    }
    const mapped = record ? (mapRecord ? mapRecord(record) : (record as CrudValues)) : {};
    return { ...base, ...mapped };
  }, [schema.initialValues, mode, createInitialValues, record, mapRecord]);

  // Never mutate the incoming schema; only build a shallow copy.
  const resolvedSchema = useMemo<FormSchema>(
    () => ({ ...schema, initialValues, viewMode: mode === 'view' }),
    [schema, initialValues, mode]
  );

  // Remount the form whenever the editing target changes so the new
  // initialValues actually land in the antd store.
  const formKey = `${mode}:${String(id ?? '')}:${reloadVersion}`;

  const handleFormReady = useCallback(
    (form: FormInstance) => {
      formRef.current = form;
      setFormReady(true);
      onFormReady?.(form);
    },
    [onFormReady]
  );

  const handleFinish = useCallback(
    async (values: CrudValues) => {
      const action: CrudAction = mode === 'create' ? 'create' : 'update';
      const apiFn = resolvedApiRef.current[action];
      if (!apiFn || submitLoading || deleteLoading) return;
      setActionError(null);
      setSubmitLoading(true);
      try {
        const next = (await beforeSubmit?.(values, { mode, id })) ?? values;
        if (mode === 'create') {
          const result = await resolvedApiRef.current.create?.(next);
          onCreated?.(result, next);
        } else {
          const result = await resolvedApiRef.current.update?.({
            ...next,
            id: id as CrudId,
          });
          onUpdated?.(result, next);
        }
      } catch (error) {
        setActionError({ action, message: errorMessage(error) });
        onErrorRef.current?.(error, action);
      } finally {
        setSubmitLoading(false);
      }
    },
    [
      mode,
      id,
      beforeSubmit,
      onCreated,
      onUpdated,
      submitLoading,
      deleteLoading,
      resolvedApiRef,
      onErrorRef,
    ]
  );

  const handleDelete = useCallback(async () => {
    const destroy = resolvedApiRef.current.destroy;
    if (!destroy || id === undefined || id === null || submitLoading || deleteLoading) return;
    setActionError(null);
    setDeleteLoading(true);
    try {
      const result = await destroy({ id });
      onDeleted?.(result);
    } catch (error) {
      setActionError({ action: 'delete', message: errorMessage(error, '删除失败，请重试。') });
      onErrorRef.current?.(error, 'delete');
    } finally {
      setDeleteLoading(false);
    }
  }, [id, submitLoading, deleteLoading, onDeleted, resolvedApiRef, onErrorRef]);

  const handleRetry = useCallback(() => setReloadVersion((value) => value + 1), []);
  const handleSubmit = useCallback(() => formRef.current?.submit(), []);
  const handleEdit = record !== undefined && onEdit ? () => onEdit(record) : undefined;

  const footerNode =
    footer === false
      ? null
      : (footer ?? (
          <SchemaFooter
            mode={mode}
            actions={actions}
            canEdit={canEdit}
            canDelete={canDelete}
            deleteConfirm={deleteConfirm}
            hasDestroy={Boolean(resolvedApi.destroy)}
            submitLoading={submitLoading}
            deleteLoading={deleteLoading}
            formReady={formReady}
            showForm={showForm}
            loading={loading}
            loadError={loadError}
            onCancel={onCancel}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSubmit={handleSubmit}
          />
        ));

  return (
    <div
      data-component={CLASS_NAME}
      className={cx(CLASS_NAME, className)}
      style={style}
      aria-busy={loading || undefined}
    >
      <SchemaHeader title={title} extra={extra} />
      <main className={`${CLASS_NAME}__body`}>
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
        ) : loading ? (
          <div className={`${CLASS_NAME}__loading`}>
            <Spin />
          </div>
        ) : showForm ? (
          <SchemaForm
            {...formProps}
            key={formKey}
            meta={resolvedSchema}
            onFinish={handleFinish}
            onFormReady={handleFormReady}
          />
        ) : null}
      </main>
      {actionError ? (
        <Alert
          className={`${CLASS_NAME}__alert`}
          type="error"
          showIcon
          closable
          {...alertTitleProps(actionError.message)}
        />
      ) : null}
      {footerNode ? <footer className={`${CLASS_NAME}__footer`}>{footerNode}</footer> : null}
    </div>
  );
}

export const SchemaCrud = Object.assign(SchemaCrudRender, {
  displayName: 'SchemaCrud',
  version: __VERSION__,
});

/** Backward-compatible alias; the previous default export name. */
export const AntdFormSchemaCrud = SchemaCrud;

export default SchemaCrud;
