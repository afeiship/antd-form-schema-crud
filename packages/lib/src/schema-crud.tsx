import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject, ReactNode } from 'react';
import { Alert, Button, Popconfirm, Spin, version as antdVersion } from 'antd';
import type { ButtonProps, FormInstance } from 'antd';
import cx from 'classnames';
import { SchemaForm } from '@jswork/antd-form-schema';
import type { FormSchema } from '@jswork/antd-form-schema';
import { checkRequirement, errorMessage, resolveApi } from './resolve-api';
import type {
  CrudAction,
  CrudId,
  CrudRecord,
  CrudValues,
  SchemaCrudProps,
} from './types';

const CLASS_NAME = 'antd-form-schema-crud';
const ANTD_MAJOR = Number.parseInt(String(antdVersion).split('.')[0], 10) || 5;

/** Keep the newest value reachable from effects without re-running them. */
function useLatest<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

/** antd v5 uses `message`, antd v6 renamed it to `title`. */
const alertTitleProps = (text: ReactNode) =>
  (ANTD_MAJOR >= 6 ? { title: text } : { message: text }) as {
    title?: ReactNode;
    message?: ReactNode;
  };

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type ActionName = 'submit' | 'cancel' | 'edit' | 'delete';

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

  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [record, setRecord] = useState<TRecord | undefined>(undefined);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<{ action: CrudAction; message: string } | null>(
    null
  );
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [formReady, setFormReady] = useState(false);

  const formRef = useRef<FormInstance | null>(null);
  const latestRef = useLatest({ resolvedApi, onError });

  const loading = loadState === 'loading';
  const showForm = mode === 'create' ? !blocked : loadState === 'ready';

  // Load the record for edit / view. Stale responses (unmount or a newer
  // request) are dropped through the `active` flag; `nx.$api` calls are not
  // cancelable, so no AbortController here.
  useEffect(() => {
    if (!needsLoad) {
      setLoadState('ready');
      setRecord(undefined);
      setLoadError(null);
      setActionError(null);
      return;
    }
    const show = blocked ? undefined : latestRef.current.resolvedApi.show;
    if (!show) {
      setLoadState('idle');
      setRecord(undefined);
      return;
    }
    setLoadState('loading');
    setLoadError(null);
    setRecord(undefined);
    setFormReady(false);
    let active = true;
    Promise.resolve()
      .then(() => show({ id: id as CrudId }))
      .then((data) => {
        if (!active) return;
        setRecord(data);
        setLoadState('ready');
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error);
        setLoadState('error');
        latestRef.current.onError?.(error, 'load');
      });
    return () => {
      active = false;
    };
  }, [needsLoad, blocked, id, reloadVersion, resource, latestRef]);

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
      const apiFn = latestRef.current.resolvedApi[action];
      if (!apiFn || submitLoading || deleteLoading) return;
      setActionError(null);
      setSubmitLoading(true);
      try {
        const next = (await beforeSubmit?.(values, { mode, id })) ?? values;
        if (mode === 'create') {
          const result = await latestRef.current.resolvedApi.create?.(next);
          onCreated?.(result, next);
        } else {
          const result = await latestRef.current.resolvedApi.update?.({
            ...next,
            id: id as CrudId,
          });
          onUpdated?.(result, next);
        }
      } catch (error) {
        setActionError({ action, message: errorMessage(error) });
        onError?.(error, action);
      } finally {
        setSubmitLoading(false);
      }
    },
    [mode, id, beforeSubmit, onCreated, onUpdated, onError, submitLoading, deleteLoading, latestRef]
  );

  const handleDelete = useCallback(async () => {
    const destroy = latestRef.current.resolvedApi.destroy;
    if (!destroy || id === undefined || id === null || submitLoading || deleteLoading) return;
    setActionError(null);
    setDeleteLoading(true);
    try {
      const result = await destroy({ id });
      onDeleted?.(result);
    } catch (error) {
      setActionError({ action: 'delete', message: errorMessage(error, '删除失败，请重试。') });
      onError?.(error, 'delete');
    } finally {
      setDeleteLoading(false);
    }
  }, [id, submitLoading, deleteLoading, onDeleted, onError, latestRef]);

  const renderAction = (
    name: ActionName,
    defaults: { text: ReactNode; onClick: () => void; props?: ButtonProps }
  ): ReactNode => {
    const config = actions?.[name];
    if (config === false) return null;
    const { text, props: extraProps } = config ?? {};
    return (
      <Button
        key={name}
        {...defaults.props}
        {...extraProps}
        onClick={(event) => {
          extraProps?.onClick?.(event);
          defaults.onClick();
        }}
      >
        {text ?? defaults.text}
      </Button>
    );
  };

  const buildDeleteButton = (busy: boolean): ReactNode => {
    if (!canDelete || !resolvedApi.destroy) return null;
    // Popconfirm opens on the child's click, so the inner button must stay
    // inert when confirmation is on; only the confirm callback may delete.
    const withConfirm = deleteConfirm !== false;
    const button = renderAction('delete', {
      text: '删除',
      onClick: withConfirm ? () => undefined : () => void handleDelete(),
      props: { danger: true, loading: deleteLoading, disabled: busy },
    });
    if (!button) return null;
    if (!withConfirm) return button;
    return (
      <Popconfirm
        key="delete-confirm"
        {...(deleteConfirm ?? {})}
        title={deleteConfirm?.title ?? '确定删除这条记录？'}
        okText={deleteConfirm?.okText ?? '确定'}
        cancelText={deleteConfirm?.cancelText ?? '取消'}
        onConfirm={(event) => {
          deleteConfirm?.onConfirm?.(event);
          void handleDelete();
        }}
      >
        {button}
      </Popconfirm>
    );
  };

  const buildDefaultActions = (): ReactNode => {
    const interactable = showForm && !loading && !loadError;
    const busy = submitLoading || deleteLoading;

    const cancel = onCancel
      ? renderAction('cancel', {
          text: mode === 'view' ? '返回' : '取消',
          onClick: onCancel,
        })
      : null;

    // While loading, failing to load or being misconfigured, only the cancel
    // button stays on screen.
    if (!interactable) {
      return cancel ? (
        <div className={`${CLASS_NAME}__footer-right`}>{cancel}</div>
      ) : null;
    }

    const submit = renderAction('submit', {
      text: mode === 'create' ? '创建' : '保存',
      onClick: () => formRef.current?.submit(),
      props: {
        type: 'primary',
        htmlType: 'button',
        loading: submitLoading,
        disabled: busy || !formReady,
      },
    });

    const del = buildDeleteButton(busy);

    const left: ReactNode[] = [];
    const right: ReactNode[] = [];

    if (mode === 'create') {
      if (cancel) left.push(cancel);
      if (submit) right.push(submit);
    } else if (mode === 'edit') {
      if (del) left.push(del);
      if (cancel) right.push(cancel);
      if (submit) right.push(submit);
    } else {
      if (del) left.push(del);
      if (cancel) right.push(cancel);
      const edit =
        canEdit && onEdit
          ? renderAction('edit', {
              text: '编辑',
              onClick: () => {
                if (record !== undefined) onEdit(record);
              },
            })
          : null;
      if (edit) right.push(edit);
    }

    if (left.length === 0 && right.length === 0) return null;
    return (
      <>
        <div className={`${CLASS_NAME}__footer-left`}>{left}</div>
        <div className={`${CLASS_NAME}__footer-right`}>{right}</div>
      </>
    );
  };

  const footerNode = footer === false ? null : footer ?? buildDefaultActions();
  const headerNode =
    title !== undefined && title !== null || extra !== undefined && extra !== null ? (
      <header className={`${CLASS_NAME}__header`}>
        <div className={`${CLASS_NAME}__title`}>{title}</div>
        <div className={`${CLASS_NAME}__extra`}>{extra}</div>
      </header>
    ) : null;

  return (
    <div
      data-component={CLASS_NAME}
      className={cx(CLASS_NAME, className)}
      style={style}
      aria-busy={loading || undefined}
    >
      {headerNode}
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
              <Button size="small" onClick={() => setReloadVersion((v) => v + 1)}>
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
