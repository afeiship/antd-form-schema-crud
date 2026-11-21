import type { ReactNode } from 'react';
import { Button, Popconfirm } from 'antd';
import type { ButtonProps } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { CLASS_NAME } from '../constants';
import type { CrudActions, CrudMode } from '../types';

type ActionName = 'save' | 'cancel' | 'edit' | 'delete';

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

  const busy = submitLoading || deleteLoading;
  const cancel = canCancel
    ? renderAction('cancel', {
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

  const save = renderAction('save', {
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

  let remove: ReactNode = null;
  if (hasDestroy && (mode === 'edit' || mode === 'view')) {
    const button = renderAction('delete', {
      text: '删除',
      onClick: confirmDelete ? () => undefined : () => void onDelete(),
      props: {
        danger: true,
        icon: <DeleteOutlined />,
        loading: deleteLoading,
        disabled: busy,
      },
    });
    if (button) {
      remove = confirmDelete ? (
        <Popconfirm
          key="delete-confirm"
          title="确定删除这条记录？"
          okText="确定"
          cancelText="取消"
          onConfirm={() => void onDelete()}
        >
          {button}
        </Popconfirm>
      ) : (
        button
      );
    }
  }

  const edit =
    mode === 'view'
      ? renderAction('edit', {
          text: '编辑',
          onClick: onEdit,
          props: { icon: <EditOutlined /> },
        })
      : null;

  const actionsNode: ReactNode[] = [];

  if (mode === 'create') {
    if (cancel) actionsNode.push(cancel);
    if (save) actionsNode.push(save);
  } else if (mode === 'edit') {
    if (remove) actionsNode.push(remove);
    if (cancel) actionsNode.push(cancel);
    if (save) actionsNode.push(save);
  } else {
    if (remove) actionsNode.push(remove);
    if (cancel) actionsNode.push(cancel);
    if (edit) actionsNode.push(edit);
  }

  if (actionsNode.length === 0) return null;

  return <div className={`${CLASS_NAME}__footer-right`}>{actionsNode}</div>;
}
