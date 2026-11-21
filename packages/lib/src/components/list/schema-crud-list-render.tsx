import { Card } from 'antd';
import type { TableProps } from 'antd';
import cx from 'classnames';
import { getSchemaCrudCardSize } from '../../defaults';
import { CLASS_NAME, CLASS_NAME_LIST } from '../../constants';
import type { CrudRecord, SchemaCrudListProps } from '../../types';
import { useRegisterCrudListActions } from '../../actions/use-crud-action-registration';
import { SchemaListActionAlert, SchemaListStateAlert } from './list-state-alert';
import { SchemaListTable } from './list-table';
import { SchemaListToolbar } from './list-toolbar';
import { useSchemaCrudListState } from './use-schema-crud-list-state';

function SchemaCrudListRender<TRecord extends CrudRecord = CrudRecord>(
  props: SchemaCrudListProps<TRecord>
) {
  const { title, actions, tableProps, onCreate, onEdit, onBack, className, actionScope, resource } =
    props;
  const state = useSchemaCrudListState(props);

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

  return (
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
        />
      }
      loading={initialLoading}
      aria-busy={state.loading || undefined}
    >
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
  );
}

export { SchemaCrudListRender };
