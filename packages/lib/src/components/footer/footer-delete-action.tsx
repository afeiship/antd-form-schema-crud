import { Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { CrudActions } from '../../types';
import { renderFooterAction } from './footer-action';

interface FooterDeleteActionProps {
  actions?: CrudActions;
  deleteLoading: boolean;
  busy: boolean;
  confirmDelete: boolean;
  onDelete: () => void;
}

/** Delete button with optional Popconfirm. */
export function FooterDeleteAction({
  actions,
  deleteLoading,
  busy,
  confirmDelete,
  onDelete,
}: FooterDeleteActionProps) {
  const button = renderFooterAction('delete', actions, {
    text: '删除',
    onClick: confirmDelete ? () => undefined : () => void onDelete(),
    props: {
      danger: true,
      icon: <DeleteOutlined />,
      loading: deleteLoading,
      disabled: busy,
    },
  });

  if (!button) return null;
  if (!confirmDelete) return button;

  return (
    <Popconfirm
      key="delete-confirm"
      title="确定删除这条记录？"
      okText="确定"
      cancelText="取消"
      onConfirm={() => void onDelete()}
    >
      {button}
    </Popconfirm>
  );
}
