import { message } from 'antd';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { errorMessage } from '../../api';
import { getSchemaCrudListKeys } from '../../defaults';
import { useCrudPageParams } from '../../hooks/use-crud-page-params';
import type { CrudRecord, CrudSuccessEvent, SchemaCrudListProps } from '../../types';
import {
  writeCrudQueryUrl,
  type CrudQueryUrlAdapter,
} from '../../utils/query';
import { SchemaCrudListRender } from './schema-crud-list-render';

/** Adds URL pagination, query URL sync and default navigation/toast handlers. */
function SchemaCrudListRoute<TRecord extends CrudRecord = CrudRecord>(
  props: SchemaCrudListProps<TRecord>
) {
  const listKeys = getSchemaCrudListKeys();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const route = useCrudPageParams({
    pageKey: listKeys.page,
    sizeKey: listKeys.size,
    defaultPage: props.page ?? 1,
    defaultPageSize: props.pageSize ?? 10,
    keepDefaultParams: props.keepDefaultParams,
    onPageChange: props.onPageChange,
  });

  const basePath = location.pathname.replace(/\/+$/, '') || '/';
  const search = location.search;
  const rowKey = props.rowKey ?? ('id' as keyof TRecord);
  const recordId = (record: TRecord) =>
    typeof rowKey === 'function' ? rowKey(record) : record[rowKey];

  const writeQueryUrl = (
    values: Record<string, any>,
    options: { resetPage: boolean; removeMissing: boolean; knownKeys?: readonly string[] }
  ) => {
    const query = props.query;
    if (!query || query.url === false) return;

    const next = new URLSearchParams(searchParams);
    writeCrudQueryUrl(
      next,
      values,
      query,
      {
        pageKey: listKeys.page,
        sizeKey: listKeys.size,
        pageSize: route.pageSize,
        defaultPage: props.page ?? 1,
        defaultPageSize: props.pageSize ?? 10,
        keepDefaultParams: props.keepDefaultParams ?? true,
      },
      options,
      options.knownKeys
    );

    if (next.toString() === searchParams.toString()) return;
    setSearchParams(next, { replace: true });
  };

  const queryUrlAdapter: CrudQueryUrlAdapter = {
    source: { searchParams, location },
    onInitial: (values) =>
      writeQueryUrl(values, { resetPage: false, removeMissing: false }),
    onChange: (values, options) =>
      writeQueryUrl(values, {
        resetPage: options.resetPage,
        removeMissing: true,
        knownKeys: options.knownKeys,
      }),
  };

  return (
    <SchemaCrudListRender<TRecord>
      {...props}
      page={route.page}
      pageSize={route.pageSize}
      onPageChange={route.onPageChange as SchemaCrudListProps<TRecord>['onPageChange']}
      onCreate={props.onCreate ?? (() => navigate(`${basePath}/add${search}`))}
      onEdit={
        props.onEdit ??
        ((record) => navigate(`${basePath}/${recordId(record)}/edit${search}`))
      }
      onSuccess={
        props.onSuccess ??
        ((event: CrudSuccessEvent) => {
          if (event.action === 'delete') message.success('删除成功');
        })
      }
      onError={
        props.onError ??
        ((error) => message.error(errorMessage(error, '操作失败，请重试。')))
      }
      queryUrlAdapter={queryUrlAdapter}
    />
  );
}

export { SchemaCrudListRoute };
