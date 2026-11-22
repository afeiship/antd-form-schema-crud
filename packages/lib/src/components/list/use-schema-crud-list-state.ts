import { useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { checkListRequirement, resolveApi } from '../../api';
import { getSchemaCrudListKeys } from '../../defaults';
import { useCrudColumns } from '../../hooks/use-crud-columns';
import { useCrudList } from '../../hooks/use-crud-list';
import { useLatest } from '../../hooks/use-latest';
import type { CrudRecord, SchemaCrudListProps } from '../../types';
import { mergeCrudQueryParams } from '../../utils/query';
import { selectSchemaFields } from '../../utils/schema';

interface SchemaCrudListStateOptions {
  queryValues?: Record<string, any>;
  paramsResetPageRef?: MutableRefObject<boolean>;
}

/** Request, requirement, column and delete state for the list card. */
export function useSchemaCrudListState<
  TRecord extends CrudRecord = CrudRecord,
  TQuery extends Record<string, any> = CrudRecord
>(
  props: SchemaCrudListProps<TRecord, TQuery>,
  options: SchemaCrudListStateOptions = {}
) {
  const { queryValues = {}, paramsResetPageRef } = options;
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
    rowActions,
    actionColumn,
    confirmDelete = true,
    onEdit,
    onPageChange,
    onSuccess,
    onError,
  } = props;

  const warnedDuplicateRef = useRef(false);
  const mergedParams = useMemo(() => {
    const next = mergeCrudQueryParams(queryValues, params);
    if (!warnedDuplicateRef.current) {
      const duplicates = Object.keys(queryValues).filter((key) =>
        params && Object.prototype.hasOwnProperty.call(params, key)
      );
      if (duplicates.length > 0) {
        warnedDuplicateRef.current = true;
        console.warn(
          `[SchemaCrudList] params 与 query 使用了同名 key：${duplicates.join(
            ', '
          )}。请求中 params 会覆盖 query。`
        );
      }
    }
    return next;
  }, [queryValues, params]);

  const listKeys = getSchemaCrudListKeys();
  const resolvedApi = useMemo(() => resolveApi<TRecord>(api, resource), [api, resource]);
  const effectiveSchema = useMemo(() => selectSchemaFields(schema, fields), [schema, fields]);
  const requirement = checkListRequirement(resolvedApi, resource);
  const blocked = requirement.missing.length > 0;

  const list = useCrudList<TRecord>({
    enabled: !blocked,
    resource,
    apiRef: useLatest(resolvedApi),
    params: mergedParams,
    paramsResetPageRef,
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
    rowActions,
    actionColumn,
    reload: list.reload,
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
