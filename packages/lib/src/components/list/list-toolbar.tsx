import { Button, Space } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ListActions } from '../../types';

interface SchemaListToolbarProps {
  actions?: ListActions;
  loading: boolean;
  onCreate?: () => void;
  onBack?: () => void;
  reload: () => void;
}

/** Card extra actions: create, refresh and back. */
export function SchemaListToolbar({
  actions,
  loading,
  onCreate,
  onBack,
  reload,
}: SchemaListToolbarProps) {
  const createAction = actions?.create === false ? null : (actions?.create ?? {});
  const refreshAction = actions?.refresh === false ? null : (actions?.refresh ?? {});
  const showCreate = Boolean(createAction) && Boolean(onCreate);
  const showRefresh = Boolean(refreshAction);
  const showBack = Boolean(onBack);

  if (!showCreate && !showRefresh && !showBack) return null;

  return (
    <Space wrap>
      {showCreate ? (
        <Button
          {...createAction?.props}
          size={createAction?.props?.size ?? 'small'}
          type={createAction?.props?.type ?? 'primary'}
          icon={createAction?.props?.icon ?? <PlusOutlined />}
          onClick={onCreate}
        >
          {createAction?.text ?? '新建'}
        </Button>
      ) : null}
      {showRefresh ? (
        <Button
          {...refreshAction?.props}
          size={refreshAction?.props?.size ?? 'small'}
          icon={refreshAction?.props?.icon ?? <ReloadOutlined />}
          loading={refreshAction?.props?.loading ?? loading}
          onClick={reload}
        >
          {refreshAction?.text ?? '刷新'}
        </Button>
      ) : null}
      {showBack ? (
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
          返回
        </Button>
      ) : null}
    </Space>
  );
}
