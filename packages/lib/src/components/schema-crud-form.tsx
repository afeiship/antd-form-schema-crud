import { useCallback, useMemo, useState } from 'react';
import { Alert, Button, Card, Spin } from 'antd';
import cx from 'classnames';
import { SchemaForm } from '@jswork/antd-form-schema';
import { checkRequirement, errorMessage, resolveApi } from '../api';
import { CLASS_NAME } from '../constants';
import { getSchemaCrudFormDefaults } from '../defaults';
import { useCrudActions } from '../hooks/use-crud-actions';
import { useCrudForm } from '../hooks/use-crud-form';
import { useCrudMode } from '../hooks/use-crud-mode';
import { useLatest } from '../hooks/use-latest';
import { useRecordLoader } from '../hooks/use-record-loader';
import type { CrudRecord, CrudValues, SchemaCrudFormProps } from '../types';
import { alertTitleProps } from '../utils/antd';
import { SchemaCardExtra, SchemaCardTitle } from './schema-card-header';
import { SchemaFooter } from './schema-footer';

function SchemaCrudFormRender<TRecord extends CrudRecord = CrudRecord>(
  props: SchemaCrudFormProps<TRecord>
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
  } = props;

  const { mode, setMode } = useCrudMode({
    mode: controlledMode,
    id,
    onModeChange,
  });

  const projectDefaults = getSchemaCrudFormDefaults();
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

  const {
    layout = 'vertical',
    onValuesChange: userOnValuesChange,
    ...restFormProps
  } = resolvedFormProps;

  const { resolvedSchema, formKey, formReady, dirty, submit, handleFormReady, handleValuesChange } =
    useCrudForm({
      mode,
      id,
      schema,
      record: record as CrudValues | undefined,
      reloadVersion,
      onValuesChange: userOnValuesChange,
    });

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
        onSubmit={submit}
      />
    </footer>
  );

  return (
    <Card
      data-component={CLASS_NAME}
      className={cx(CLASS_NAME, className)}
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

export const SchemaCrudForm = Object.assign(SchemaCrudFormRender, {
  displayName: 'SchemaCrudForm',
  version: __VERSION__,
});

/** Alias kept for the existing package import style. */
export const AntdFormSchemaCrudForm = SchemaCrudForm;

export default SchemaCrudForm;
