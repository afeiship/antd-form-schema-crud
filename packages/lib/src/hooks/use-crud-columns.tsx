import { useMemo, useRef } from 'react';
import type { Key, ReactNode } from 'react';
import { Space } from 'antd';
import type { TableProps } from 'antd';
import type { FormSchema } from '@jswork/antd-form-schema';
import { CLASS_NAME } from '../constants';
import type {
  CrudBuiltinRowAction,
  CrudListActionColumn,
  CrudRecord,
  CrudRowAction,
  CrudRowActionsConfig,
  CrudRowActionsMode,
  ListPresetField,
  ListPresets,
} from '../types';
import { getOptionLabel, getRecordKey, resolveListPresets } from '../utils/list';
import { SchemaRowActionItem } from '../components/list/row-action-item';
import { isBuiltinRowAction, resolveRowAction } from '../components/list/row-action';

interface UseCrudColumnsOptions<TRecord extends CrudRecord> {
  schema: FormSchema;
  columns?: TableProps<TRecord>['columns'];
  presets?: ListPresets;
  confirmDelete: boolean;
  canEdit: boolean;
  canDelete: boolean;
  deletingKey: Key | null;
  rowKey: keyof TRecord | ((record: TRecord) => Key);
  rowActions?: CrudRowActionsConfig<TRecord> | null;
  actionColumn?: CrudListActionColumn;
  reload: () => void;
  onEdit?: (record: TRecord) => void;
  onDelete: (record: TRecord) => Promise<void>;
}

interface ActionEntry<TRecord extends CrudRecord> {
  action: CrudRowAction<TRecord>;
  href?: string;
  loading?: boolean;
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
  canEdit,
  canDelete,
  deletingKey,
  rowKey,
  rowActions,
  actionColumn,
  reload,
  onEdit,
  onDelete,
}: UseCrudColumnsOptions<TRecord>) {
  const presetMap = useMemo(() => resolveListPresets(presets), [presets]);
  const warnedRef = useRef<Set<string>>(new Set());
  const warnOnce = (key: string, message: string) => {
    if (warnedRef.current.has(key)) return;
    warnedRef.current.add(key);
    console.error(message);
  };

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
        if (preset?.hidden) return false;
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

  const actionColumnDef = useMemo<TableProps<TRecord>['columns'] | null>(() => {
    if (rowActions === null) return null;

    const items = rowActions?.items ?? [];
    const rawMode = rowActions?.mode;
    let mode: CrudRowActionsMode = 'prepend';
    if (rawMode === 'append' || rawMode === 'prepend' || rawMode === 'replace') {
      mode = rawMode;
    } else if (rawMode !== undefined) {
      warnOnce(`mode:${String(rawMode)}`, `[SchemaCrudList] rowActions.mode 非法：${String(rawMode)}，已回退 prepend。`);
    }

    const seen = new Set<string>();
    items.forEach((item) => {
      const key = isBuiltinRowAction(item) ? `builtin:${item.builtin}` : item.key;
      if (seen.has(key)) {
        warnOnce(
          `dup:${key}`,
          `[SchemaCrudList] rowActions 存在重复 key：${key}，只保留第一个。`
        );
      }
      seen.add(key);
    });

    const buildBuiltin = (
      builtin: 'edit' | 'delete',
      ref: CrudBuiltinRowAction<TRecord> | undefined,
      record: TRecord
    ): CrudRowAction<TRecord> | null => {
      if (builtin === 'edit') {
        if (!canEdit || !onEdit) {
          warnOnce(
            'builtin:edit:missing',
            '[SchemaCrudList] builtin edit 不可用（需要 onEdit，且未被 actions.edit 关闭），已跳过。'
          );
          return null;
        }
        return {
          key: '__builtin_edit',
          text: ref?.text ?? '编辑',
          tooltip: ref?.tooltip,
          props: ref?.props,
          hidden: ref?.hidden,
          disabled: ref?.disabled,
          onClick: () => {
            onEdit(record);
          },
        };
      }
      if (!canDelete) {
        warnOnce('builtin:delete:missing', '[SchemaCrudList] builtin delete 需要 destroy，已跳过。');
        return null;
      }
      return {
        key: '__builtin_delete',
        text: ref?.text ?? '删除',
        tooltip: ref?.tooltip,
        props: ref?.props,
        hidden: ref?.hidden,
        disabled: ref?.disabled,
        danger: true,
        confirm: confirmDelete
          ? { title: '确定删除这条记录吗？', okText: '确定', cancelText: '取消' }
          : undefined,
        onClick: () => onDelete(record),
      };
    };

    if (
      columns?.some((column) => (column as Record<string, any>)?.key === '__schema_crud_actions')
    ) {
      warnOnce(
        'conflict:actions',
        '[SchemaCrudList] 显式 columns 已包含 __schema_crud_actions，组件仍会再追加一列操作列。'
      );
    }

    const isStaticallyVisible = (item: (typeof items)[number]) => {
      if (isBuiltinRowAction(item)) {
        if (mode !== 'replace') return false;
        return item.builtin === 'edit' ? canEdit : canDelete;
      }
      if (item.hidden === true) return false;
      if (typeof item.href === 'string' && item.href === '') return false;
      return true;
    };
    const customCount = items.filter(isStaticallyVisible).length;
    const builtinCount = mode === 'replace' ? 0 : (canEdit ? 1 : 0) + (canDelete ? 1 : 0);
    const width = actionColumn?.width ?? Math.max(76, (customCount + builtinCount) * 48 + 16);

    return [
      {
        key: '__schema_crud_actions',
        title: actionColumn?.title ?? '操作',
        className: `${CLASS_NAME}__actions`,
        width,
        render: (_: unknown, record: TRecord, index: number) => {
          const recordKey = getRecordKey(record, rowKey);
          const isDeleting = deletingKey !== null && deletingKey === recordKey;
          const custom: ActionEntry<TRecord>[] = [];
          const seenRowKeys = new Set<string>();

          items.forEach((item) => {
            if (isBuiltinRowAction(item)) {
              if (mode !== 'replace') {
                warnOnce(
                  `builtin:${item.builtin}:mode`,
                  `[SchemaCrudList] builtin ${item.builtin} 仅在 replace 模式生效，已忽略。`
                );
                return;
              }
              const builtin = buildBuiltin(item.builtin, item, record);
              if (!builtin) return;
              if (seenRowKeys.has(builtin.key)) {
                warnOnce(`dup:${builtin.key}`, `[SchemaCrudList] rowActions 存在重复 key：${builtin.key}，只保留第一个。`);
                return;
              }
              seenRowKeys.add(builtin.key);
              const resolved = resolveRowAction(builtin, record, index);
              if (!resolved) return;
              custom.push({
                action: resolved.action,
                loading: builtin.key === '__builtin_delete' ? isDeleting : undefined,
              });
              return;
            }

            if (seenRowKeys.has(item.key)) {
              warnOnce(`dup:${item.key}`, `[SchemaCrudList] rowActions 存在重复 key：${item.key}，只保留第一个。`);
              return;
            }
            seenRowKeys.add(item.key);
            const resolved = resolveRowAction(item, record, index);
            if (!resolved) return;
            custom.push({ action: resolved.action, href: resolved.href });
          });

          const builtin: ActionEntry<TRecord>[] = [];
          if (mode !== 'replace') {
            const pushBuiltin = (key: 'edit' | 'delete') => {
              const ref = buildBuiltin(key, undefined, record);
              if (!ref) return;
              if (seenRowKeys.has(ref.key)) {
                warnOnce(`dup:${ref.key}`, `[SchemaCrudList] rowActions 存在重复 key：${ref.key}，只保留第一个。`);
                return;
              }
              seenRowKeys.add(ref.key);
              const resolved = resolveRowAction(ref, record, index);
              if (!resolved) return;
              builtin.push({
                action: resolved.action,
                loading: key === 'delete' ? isDeleting : undefined,
              });
            };
            if (canEdit) pushBuiltin('edit');
            if (canDelete) pushBuiltin('delete');
          }

          const ordered =
            mode === 'replace'
              ? custom
              : mode === 'prepend'
                ? [...custom, ...builtin]
                : [...builtin, ...custom];

          if (ordered.length === 0) return null;

          return (
            <Space size={0}>
              {ordered.map((entry) => (
                <SchemaRowActionItem<TRecord>
                  key={entry.action.key}
                  action={entry.action}
                  record={record}
                  index={index}
                  href={entry.href}
                  loading={entry.loading}
                  reload={reload}
                />
              ))}
            </Space>
          );
        },
      },
    ];
  }, [
    rowActions,
    actionColumn,
    columns,
    canEdit,
    canDelete,
    confirmDelete,
    deletingKey,
    rowKey,
    reload,
    onEdit,
    onDelete,
  ]);

  return useMemo<TableProps<TRecord>['columns']>(() => {
    const list = [...(dataColumns ?? [])];
    if (actionColumnDef) list.push(...actionColumnDef);
    return list;
  }, [dataColumns, actionColumnDef]);
}
