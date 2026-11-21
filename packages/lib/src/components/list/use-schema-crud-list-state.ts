import { useMemo } from 'react';
import { checkListRequirement, resolveApi } from '../../api';
import { getSchemaCrudListKeys } from '../../defaults';
import { useCrudColumns } from '../../hooks/use-crud-columns';
import { useCrudList } from '../../hooks/use-crud-list';
import { useLatest } from '../../hooks/use-latest';
import type { CrudRecord, SchemaCrudListProps } from '../../types';
import { selectSchemaFields } from '../../utils/schema';

/** Request, requirement, column and delete state for the list card. */
export function useSchemaCrudListState<TRecord extends CrudRecord = CrudRecord>(
  props: SchemaCrudListProps<TRecord>
) {
  const {
    resource,
    schema,
    api,
    presets,
    columns,
    fields,
    rowKey = 'id' as keyof TRecord,
    params,
    page: controlledPage,
    pageSize = 10,
    actions,
    confirmDelete = true,
    onEdit,
    onPageChange,
    onSuccess,
    onError,
  } = props;

  const listKeys = getSchemaCrudListKeys();
  const resolvedApi = useMemo(() => resolveApi<TRecord>(api, resource), [api, resource]);
  const effectiveSchema = useMemo(() => selectSchemaFields(schema, fields), [schema, fields]);
  const requirement = checkListRequirement(resolvedApi, resource);
  const blocked = requirement.missing.length > 0;

  const list = useCrudList<TRecord>({
    enabled: !blocked,
    resource,
    apiRef: useLatest(resolvedApi),
    params,
    controlledPage,
    pageSize,
    keys: listKeys,
    rowKey,
    onPageChange,
    onSuccess,
    onError,
  });

  const canEdit = actions?.edit !== false && Boolean(onEdit);
  const canDelete = actions?.delete !== false && Boolean(resolvedApi.destroy);

  const resolvedColumns = useCrudColumns<TRecord>({
    schema: effectiveSchema,
    columns,
    presets,
    confirmDelete,
    canEdit,
    canDelete,
    deletingKey: list.deletingKey,
    rowKey,
    onEdit,
    onDelete: list.handleDelete,
  });

  return {
    rowKey,
    requirement,
    blocked,
    resolvedColumns,
    ...list,
  };
}
