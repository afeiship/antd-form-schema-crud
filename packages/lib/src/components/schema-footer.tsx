import type { ReactNode } from 'react';
import { ArrowLeftOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { CLASS_NAME } from '../constants';
import type { CrudActions, CrudMode } from '../types';
import { FooterDeleteAction } from './footer/footer-delete-action';
import { renderFooterAction } from './footer/footer-action';

interface SchemaFooterProps {
  mode: CrudMode;
  actions?: CrudActions;
  hasDestroy: boolean;
  submitLoading: boolean;
  deleteLoading: boolean;
  canSave: boolean;
  available: boolean;
  canCancel: boolean;
  confirmDelete: boolean;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSubmit: () => void;
}

/** Picks the footer buttons for the current mode and action configuration. */
export function SchemaFooter({
  mode,
  actions,
  hasDestroy,
  submitLoading,
  deleteLoading,
  canSave,
  available,
  canCancel,
  confirmDelete,
  onCancel,
  onEdit,
  onDelete,
  onSubmit,
}: SchemaFooterProps) {
  const busy = submitLoading || deleteLoading;
  const cancel = canCancel
    ? renderFooterAction('cancel', actions, {
        text: mode === 'view' ? '返回' : '取消',
        onClick: onCancel,
        props: {
          icon: mode === 'view' ? <ArrowLeftOutlined /> : undefined,
        },
      })
    : null;

  // Loading, load failure, or a blocked configuration keeps only the leave action.
  if (!available) {
    return cancel ? <div className={`${CLASS_NAME}__footer-right`}>{cancel}</div> : null;
  }

  const save = renderFooterAction('save', actions, {
    text: mode === 'create' ? '创建' : '保存',
    onClick: onSubmit,
    props: {
      type: 'primary',
      htmlType: 'button',
      icon: <SaveOutlined />,
      title: '保存快捷键：Ctrl/⌘ + S',
      'aria-keyshortcuts': 'Control+S Meta+S',
      loading: submitLoading,
      disabled: !canSave,
    },
  });

  const remove =
    hasDestroy && (mode === 'edit' || mode === 'view') ? (
      <FooterDeleteAction
        actions={actions}
        deleteLoading={deleteLoading}
        busy={busy}
        confirmDelete={confirmDelete}
        onDelete={onDelete}
      />
    ) : null;

  const edit =
    mode === 'view'
      ? renderFooterAction('edit', actions, {
          text: '编辑',
          onClick: onEdit,
          props: { icon: <EditOutlined /> },
        })
      : null;

  const buttons: ReactNode[] = [];
  if (remove) buttons.push(remove);
  if (cancel) buttons.push(cancel);

  if (mode === 'create') {
    if (save) buttons.push(save);
  } else if (mode === 'edit') {
    if (save) buttons.push(save);
  } else if (edit) {
    buttons.push(edit);
  }

  if (buttons.length === 0) return null;
  return <div className={`${CLASS_NAME}__footer-right`}>{buttons}</div>;
}
