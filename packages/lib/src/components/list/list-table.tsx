import { Table } from 'antd';
import type { TableProps } from 'antd';
import type { CrudRecord } from '../../types';

interface SchemaListTableProps<TRecord extends CrudRecord> {
  tableProps?: TableProps<TRecord>;
  columns: TableProps<TRecord>['columns'];
  rows: TRecord[];
  rowKey: TableProps<TRecord>['rowKey'];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
}

/** Table plus the list pagination contract. */
export function SchemaListTable<TRecord extends CrudRecord>({
  tableProps,
  columns,
  rows,
  rowKey,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
}: SchemaListTableProps<TRecord>) {
  const restTableProps = tableProps ?? {};

  return (
    <Table<TRecord>
      {...restTableProps}
      bordered={restTableProps.bordered ?? true}
      size={restTableProps.size ?? 'small'}
      columns={columns}
      dataSource={rows}
      rowKey={rowKey}
      loading={loading}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (value) => `共 ${value} 条`,
        onChange: onPageChange,
      }}
    />
  );
}
