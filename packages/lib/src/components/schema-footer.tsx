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
  formReady: boolean;
  dirty: boolean;
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
  formReady,
  dirty,
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
      loading: submitLoading,
      disabled: busy || !formReady || (mode === 'edit' && !dirty),
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

  const left: ReactNode[] = [];
  const right: ReactNode[] = [];

  if (mode === 'create') {
    if (cancel) right.push(cancel);
    if (save) right.push(save);
  } else if (mode === 'edit') {
    if (remove) left.push(remove);
    if (cancel) right.push(cancel);
    if (save) right.push(save);
  } else {
    if (remove) left.push(remove);
    if (cancel) right.push(cancel);
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
