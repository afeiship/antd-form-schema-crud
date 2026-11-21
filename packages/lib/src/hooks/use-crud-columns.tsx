import { useMemo } from 'react';
import type { Key, ReactNode } from 'react';
import { Button, Popconfirm, Space } from 'antd';
import type { TableProps } from 'antd';
import type { FormSchema } from '@jswork/antd-form-schema';
import type { CrudRecord, ListPresetField, ListPresets } from '../types';
import { getOptionLabel, getRecordKey, resolveListPresets } from '../utils/list';

interface UseCrudColumnsOptions<TRecord extends CrudRecord> {
  schema: FormSchema;
  columns?: TableProps<TRecord>['columns'];
  presets?: ListPresets;
  confirmDelete: boolean;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  deletingKey: Key | null;
  rowKey: keyof TRecord | ((record: TRecord) => Key);
  onView?: (record: TRecord) => void;
  onEdit?: (record: TRecord) => void;
  onDelete: (record: TRecord) => Promise<void>;
}

function mergePreset<TRecord>(
  column: TableProps<TRecord>['columns'] extends (infer T)[] | undefined ? T : never,
  preset: ListPresetField | undefined
) {
  if (!preset) return column;
  const item = column as Record<string, any>;
  const explicit = Object.fromEntries(
    Object.entries(item).filter(([, value]) => value !== undefined)
  );
  return { ...preset, ...explicit } as typeof column;
}

function hasChildren(column: unknown): boolean {
  return Boolean(
    column &&
      typeof column === 'object' &&
      Array.isArray((column as Record<string, any>).children)
  );
}

/**
 * Builds the final column array: explicit columns (with preset fill-ins) or
 * schema-derived columns, plus the row action column.
 */
export function useCrudColumns<TRecord extends CrudRecord>({
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
  onDelete,
}: UseCrudColumnsOptions<TRecord>) {
  const presetMap = useMemo(() => resolveListPresets(presets), [presets]);

  const dataColumns = useMemo<TableProps<TRecord>['columns']>(() => {
    if (columns) {
      return columns.map((column) => {
        if (hasChildren(column)) return column;
        const dataIndex = (column as Record<string, any>).dataIndex;
        const key = typeof dataIndex === 'string' ? dataIndex : undefined;
        return mergePreset(column, key ? presetMap[key] : undefined);
      });
    }

    return schema.fields
      .filter((field) => {
        if (field.hidden || field.condition) return false;
        const preset = presetMap[field.key];
        return Boolean(preset?.title || field.label);
      })
      .map((field) => {
        const preset = presetMap[field.key];
        const title = preset?.title ?? field.label ?? field.key;
        const optionRender = field.options
          ? (value: unknown) => getOptionLabel(field.options, value) as ReactNode
          : undefined;

        return {
          key: field.key,
          dataIndex: field.key,
          title,
          width: preset?.width,
          align: preset?.align,
          ellipsis: preset?.ellipsis,
          fixed: preset?.fixed,
          render: optionRender,
        };
      });
  }, [columns, presetMap, schema.fields]);

  const actionColumn = useMemo<TableProps<TRecord>['columns'] | null>(() => {
    if (!canView && !canEdit && !canDelete) return null;

    return [
      {
        key: '__schema_crud_actions',
        title: '操作',
        width: canDelete ? 168 : 120,
        render: (_: unknown, record: TRecord) => {
          const recordKey = getRecordKey(record, rowKey);
          const isDeleting = deletingKey !== null && deletingKey === recordKey;

          return (
            <Space size="small">
              {canView ? (
                <Button type="link" size="small" onClick={() => onView?.(record)}>
                  查看
                </Button>
              ) : null}
              {canEdit ? (
                <Button type="link" size="small" onClick={() => onEdit?.(record)}>
                  编辑
                </Button>
              ) : null}
              {canDelete ? (
                confirmDelete ? (
                  <Popconfirm
                    title="确定删除这条记录吗？"
                    okText="确定"
                    cancelText="取消"
                    onConfirm={() => onDelete(record)}
                  >
                    <Button type="link" size="small" danger loading={isDeleting}>
                      删除
                    </Button>
                  </Popconfirm>
                ) : (
                  <Button
                    type="link"
                    size="small"
                    danger
                    loading={isDeleting}
                    onClick={() => onDelete(record)}
                  >
                    删除
                  </Button>
                )
              ) : null}
            </Space>
          );
        },
      },
    ];
  }, [canView, canEdit, canDelete, confirmDelete, deletingKey, rowKey, onView, onEdit, onDelete]);

  return useMemo<TableProps<TRecord>['columns']>(() => {
    const list = [...(dataColumns ?? [])];
    if (actionColumn) list.push(...actionColumn);
    return list;
  }, [dataColumns, actionColumn]);
}
