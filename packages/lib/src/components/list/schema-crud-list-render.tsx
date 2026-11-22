import { Card } from 'antd';
import type { TableProps } from 'antd';
import cx from 'classnames';
import { useEffect, useRef } from 'react';
import { getSchemaCrudCardSize, getSchemaCrudListKeys } from '../../defaults';
import { CLASS_NAME, CLASS_NAME_LIST } from '../../constants';
import type { CrudListQueryContext, CrudRecord, SchemaCrudListProps } from '../../types';
import { useCrudListQuery } from '../../hooks/use-crud-list-query';
import type { CrudQueryUrlAdapter } from '../../utils/query';
import { hasQueryParams } from '../../utils/query';
import { useRegisterCrudListActions } from '../../actions/use-crud-action-registration';
import { SchemaListActionAlert, SchemaListStateAlert } from './list-state-alert';
import { SchemaListTable } from './list-table';
import { SchemaListToolbar } from './list-toolbar';
import { resolveCrudListQueryNodes } from './schema-crud-list-query';
import { useSchemaCrudListState } from './use-schema-crud-list-state';

interface SchemaCrudListRenderProps<
  TRecord extends CrudRecord = CrudRecord,
  TQuery extends Record<string, any> = CrudRecord
> extends SchemaCrudListProps<TRecord, TQuery> {
  /** Internal adapter supplied by the router wrapper. */
  queryUrlAdapter?: CrudQueryUrlAdapter;
}

function SchemaCrudListRender<
  TRecord extends CrudRecord = CrudRecord,
  TQuery extends Record<string, any> = CrudRecord
>(props: SchemaCrudListRenderProps<TRecord, TQuery>) {
  const {
    title,
    actions,
    tableProps,
    query,
    queryUrlAdapter,
    onCreate,
    onEdit,
    onBack,
    className,
    actionScope,
    resource,
  } = props;
  const paramsResetPageRef = useRef(true);
  const listKeys = getSchemaCrudListKeys();
  const queryState = useCrudListQuery({
    query,
    urlAdapter: queryUrlAdapter,
    pageKey: listKeys.page,
    sizeKey: listKeys.size,
    paramsResetPageRef,
  });
  const state = useSchemaCrudListState(props, {
    queryValues: queryState.values,
    paramsResetPageRef,
  });

  const emptyQueryWarnedRef = useRef(false);
  useEffect(() => {
    if (!query || emptyQueryWarnedRef.current) return;
    if (hasQueryParams(query)) return;
    emptyQueryWarnedRef.current = true;
    console.warn('[SchemaCrudList] query.slots 为空，查询区不会渲染。');
  }, [query]);

  useRegisterCrudListActions<TRecord>(actionScope ?? resource, {
    reload: state.reload,
    create: () => {
      if (actions?.create === false || !onCreate) return;
      onCreate();
    },
    edit: (record) => {
      if (actions?.edit === false || !onEdit || record === undefined || record === null) return;
      onEdit(record);
    },
    remove: (record) => {
      if (actions?.delete === false) return Promise.resolve();
      return state.handleDelete(record);
    },
  });
  const cardSize = getSchemaCrudCardSize();
  const titleNode = title === false ? undefined : <>{title ?? '记录'}列表</>;
  const initialLoading = state.loading && state.rows.length === 0 && !state.loadError;
  const queryContext: CrudListQueryContext<TQuery> = {
    values: queryState.values,
    setValues: queryState.setValues,
    reset: queryState.reset,
    loading: state.loading,
  };
  const queryNodes = resolveCrudListQueryNodes(query, queryContext);

  return (
    <>
      {queryNodes.before ? (
        <div className={`${CLASS_NAME}__query-before`}>{queryNodes.before}</div>
      ) : null}
      <Card
        data-component={CLASS_NAME_LIST}
        size={cardSize}
        className={cx(CLASS_NAME, `${CLASS_NAME}--list`, className)}
        title={titleNode}
        extra={
          <SchemaListToolbar
            actions={actions}
            loading={state.loading}
            onCreate={onCreate}
            onBack={onBack}
            reload={state.reload}
            queryStart={queryNodes.headerStart}
            queryEnd={queryNodes.headerEnd}
          />
        }
        loading={initialLoading && !query?.slots?.body}
        aria-busy={state.loading || undefined}
      >
        {queryNodes.body ? (
          <div className={`${CLASS_NAME}__query-body`}>{queryNodes.body}</div>
        ) : null}
        <SchemaListStateAlert
          blocked={state.blocked}
          requirementMessage={state.requirement.message}
          loadError={state.loadError}
          reload={state.reload}
        />
        {!state.blocked && !state.loadError ? (
          <>
            <SchemaListActionAlert error={state.actionError} onClose={state.clearActionError} />
            <SchemaListTable<TRecord>
              tableProps={tableProps}
              columns={state.resolvedColumns}
              rows={state.rows}
              rowKey={state.rowKey as TableProps<TRecord>['rowKey']}
              loading={state.loading}
              page={state.page}
              pageSize={state.pageSize}
              total={state.total}
              onPageChange={state.handlePageChange}
            />
          </>
        ) : null}
      </Card>
    </>
  );
}

export { SchemaCrudListRender };
