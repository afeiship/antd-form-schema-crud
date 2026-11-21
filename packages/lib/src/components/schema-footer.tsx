import type { ReactNode } from 'react';
import { Button, Popconfirm } from 'antd';
import type { ButtonProps } from 'antd';
import { CLASS_NAME } from '../constants';
import type { CrudActions, CrudMode, SchemaCrudProps } from '../types';

type ActionName = 'submit' | 'cancel' | 'edit' | 'delete';

interface SchemaFooterProps {
  mode: CrudMode;
  actions?: CrudActions;
  canEdit: boolean;
  canDelete: boolean;
  deleteConfirm: SchemaCrudProps['deleteConfirm'];
  hasDestroy: boolean;
  submitLoading: boolean;
  deleteLoading: boolean;
  formReady: boolean;
  showForm: boolean;
  loading: boolean;
  loadError: unknown;
  onCancel?: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onSubmit: () => void;
}

export function SchemaFooter({
  mode,
  actions,
  canEdit,
  canDelete,
  deleteConfirm,
  hasDestroy,
  submitLoading,
  deleteLoading,
  formReady,
  showForm,
  loading,
  loadError,
  onCancel,
  onEdit,
  onDelete,
  onSubmit,
}: SchemaFooterProps) {
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
    if (!canDelete || !hasDestroy) return null;
    // Popconfirm opens on the child's click, so the inner button must stay
    // inert when confirmation is on; only the confirm callback may delete.
    const button = renderAction('delete', {
      text: '删除',
      onClick: deleteConfirm === false ? () => void onDelete() : () => undefined,
      props: { danger: true, loading: deleteLoading, disabled: busy },
    });
    if (!button) return null;
    if (deleteConfirm === false) return button;

    return (
      <Popconfirm
        key="delete-confirm"
        {...(deleteConfirm ?? {})}
        title={deleteConfirm?.title ?? '确定删除这条记录？'}
        okText={deleteConfirm?.okText ?? '确定'}
        cancelText={deleteConfirm?.cancelText ?? '取消'}
        onConfirm={(event) => {
          deleteConfirm?.onConfirm?.(event);
          void onDelete();
        }}
      >
        {button}
      </Popconfirm>
    );
  };

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
    return cancel ? <div className={`${CLASS_NAME}__footer-right`}>{cancel}</div> : null;
  }

  const submit = renderAction('submit', {
    text: mode === 'create' ? '创建' : '保存',
    onClick: onSubmit,
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
            onClick: onEdit,
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
}
