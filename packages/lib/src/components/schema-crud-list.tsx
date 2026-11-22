import { useInRouterContext } from 'react-router-dom';
import type { CrudRecord, SchemaCrudListProps } from '../types';
import { SchemaCrudListRender } from './list/schema-crud-list-render';
import { SchemaCrudListRoute } from './list/schema-crud-list-route';

/** Uses the router query by default; controlled page / pageSize props take over. */
function SchemaCrudListSelector<
  TRecord extends CrudRecord = CrudRecord,
  TQuery extends Record<string, any> = CrudRecord
>(props: SchemaCrudListProps<TRecord, TQuery>) {
  const inRouter = useInRouterContext();
  const controlled = props.page !== undefined || props.pageSize !== undefined;

  return inRouter && !controlled ? (
    <SchemaCrudListRoute<TRecord, TQuery> {...props} />
  ) : (
    <SchemaCrudListRender<TRecord, TQuery> {...props} />
  );
}

export const SchemaCrudList = Object.assign(SchemaCrudListSelector, {
  displayName: 'SchemaCrudList',
  version: __VERSION__,
});

export default SchemaCrudList;
