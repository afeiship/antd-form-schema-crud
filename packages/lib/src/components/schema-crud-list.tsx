import { useMemo } from 'react';
import { Alert, Button, Card, Space, Spin, Table } from 'antd';
import type { TableProps } from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import cx from 'classnames';
import { checkListRequirement, errorMessage, resolveApi } from '../api';
import { CLASS_NAME, CLASS_NAME_LIST } from '../constants';
import { useCrudColumns } from '../hooks/use-crud-columns';
import { useCrudList } from '../hooks/use-crud-list';
import { useLatest } from '../hooks/use-latest';
import type { CrudRecord, SchemaCrudListProps } from '../types';
import { alertTitleProps } from '../utils/antd';

function SchemaCrudListRender<TRecord extends CrudRecord = CrudRecord>(
  props: SchemaCrudListProps<TRecord>
) {
  const {
    resource,
    schema,
    api,
    title,
    presets,
    columns,
    rowKey = 'id' as keyof TRecord,
    params,
    pageSize = 10,
    actions,
    confirmDelete = true,
    tableProps,
    onCreate,
    onView,
    onEdit,
    onSuccess,
    onError,
    onBack,
    className,
  } = props;

  const resolvedApi = useMemo(() => resolveApi<TRecord>(api, resource), [api, resource]);
  const requirement = checkListRequirement(resolvedApi, resource);
  const blocked = requirement.missing.length > 0;

  const {
    page,
    pageSize: currentPageSize,
    rows,
    total,
    loading,
    loadError,
    actionError,
    deletingKey,
    reload,
    handlePageChange,
    handleDelete,
    clearActionError,
  } = useCrudList<TRecord>({
    enabled: !blocked,
    resource,
    apiRef: useLatest(resolvedApi),
    params,
    pageSize,
    rowKey,
    onSuccess,
    onError,
  });

  const canView = actions?.view !== false && Boolean(onView);
  const canEdit = actions?.edit !== false && Boolean(onEdit);
  const canDelete = actions?.delete !== false && Boolean(resolvedApi.destroy);

  const resolvedColumns = useCrudColumns<TRecord>({
    schema,
    columns,
    presets,
    confirmDelete,
    canView,
    canEdit,
    canDelete,
    deletingKey,
    rowKey,
    onView,
    onEdit,
    onDelete: handleDelete,
  });

  const createAction = actions?.create === false ? null : actions?.create ?? {};
  const refreshAction = actions?.refresh === false ? null : actions?.refresh ?? {};
  const showCreate = Boolean(createAction) && Boolean(onCreate);
  const showRefresh = Boolean(refreshAction);
  const showBack = Boolean(onBack);

  const extra =
    showCreate || showRefresh || showBack ? (
      <Space wrap>
        {showCreate ? (
          <Button
            {...createAction?.props}
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
    ) : undefined;

  const titleNode = title === false ? undefined : <>{title ?? '记录'}列表</>;

  const { onRow: userOnRow, ...restTableProps } = tableProps ?? {};
  const rowKeyProp = rowKey as TableProps<TRecord>['rowKey'];

  return (
    <Card
      data-component={CLASS_NAME_LIST}
      className={cx(CLASS_NAME, `${CLASS_NAME}--list`, className)}
      title={titleNode}
      extra={extra}
      aria-busy={loading || undefined}
    >
      {blocked ? (
        <Alert type="error" showIcon {...alertTitleProps(requirement.message)} />
      ) : loadError ? (
        <Alert
          type="error"
          showIcon
          {...alertTitleProps('列表加载失败')}
          description={errorMessage(loadError, '列表加载失败，请稍后重试。')}
          action={
            <Button size="small" onClick={reload}>
              重试
            </Button>
          }
        />
      ) : (
        <Spin spinning={loading}>
          {actionError ? (
            <Alert
              className={`${CLASS_NAME}__alert`}
              type="error"
              showIcon
              closable
              {...alertTitleProps(actionError.message)}
              onClose={clearActionError}
            />
          ) : null}
          <Table<TRecord>
            {...restTableProps}
            bordered={restTableProps.bordered ?? true}
            size={restTableProps.size ?? 'middle'}
            columns={resolvedColumns}
            dataSource={rows}
            rowKey={rowKeyProp}
            pagination={{
              current: page,
              pageSize: currentPageSize,
              total,
              showSizeChanger: true,
              showTotal: (value) => `共 ${value} 条`,
              onChange: handlePageChange,
            }}
            onRow={(record, index) => {
              const rowProps = userOnRow?.(record, index) ?? {};
              if (!canView) return rowProps;

              return {
                ...rowProps,
                onClick: (event) => {
                  rowProps.onClick?.(event);
                  if (event.defaultPrevented) return;
                  const target = event.target as HTMLElement;
                  if (target.closest('button, a, input, textarea, select, [role="button"]')) return;
                  onView?.(record);
                },
              };
            }}
          />
        </Spin>
      )}
    </Card>
  );
}

export const SchemaCrudList = Object.assign(SchemaCrudListRender, {
  displayName: 'SchemaCrudList',
  version: __VERSION__,
});

export default SchemaCrudList;
