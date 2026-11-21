import { useEffect, useMemo, useState } from 'react';
import { Alert, App as AntdApp, Card, Spin } from 'antd';
import { errorMessage } from '@jswork/antd-form-schema-crud';
import type { CrudId, CrudMode, SchemaCrudProps } from '@jswork/antd-form-schema-crud';
import type { PostRecord } from '../../api/posts';
import { PageHeader } from './components/page-header';
import { PostSchemaCrud } from './components/post-schema-crud';
import { PostSummary } from './components/post-summary';
import { usePostList } from './use-post-list';

type HandleError = NonNullable<SchemaCrudProps['onError']>;

export function PostsPage() {
  const { message } = AntdApp.useApp();
  const [mode, setMode] = useState<CrudMode>('view');
  const [activeId, setActiveId] = useState<CrudId>();
  const [refresh, setRefresh] = useState(0);
  const { records, total, loading, listError, loadList, loadInitial } = usePostList();

  useEffect(() => {
    if (loading || listError) return;
    if (records.length === 0) {
      setActiveId(undefined);
      setMode('create');
      return;
    }
    setActiveId((current) =>
      records.some((item) => item.id === current) ? current : records[0].id
    );
  }, [loading, listError, records]);

  const options = useMemo(
    () =>
      records.map((item) => ({
        value: item.id,
        label: `${item.id} · ${item.title}`,
      })),
    [records]
  );

  const handleCreated = async (result: unknown) => {
    const record = result as PostRecord;
    try {
      const rows = await loadList();
      setActiveId(record.id ?? rows[0]?.id);
      setMode('view');
      setRefresh((value) => value + 1);
      message.success('创建成功');
    } catch (error) {
      message.error(errorMessage(error, '列表刷新失败，请手动刷新。'));
    }
  };

  const handleUpdated = async () => {
    try {
      await loadList();
      setMode('view');
      setRefresh((value) => value + 1);
      message.success('保存成功');
    } catch (error) {
      message.error(errorMessage(error, '列表刷新失败，请手动刷新。'));
    }
  };

  const handleDeleted = async () => {
    try {
      const rows = await loadList();
      const next = rows[0];
      if (next) {
        setActiveId(next.id);
        setMode('view');
      } else {
        setActiveId(undefined);
        setMode('create');
      }
      setRefresh((value) => value + 1);
      message.success('删除成功');
    } catch (error) {
      message.error(errorMessage(error, '列表刷新失败，请手动刷新。'));
    }
  };

  const handleError: HandleError = (error, action) => {
    if (action === 'load') return;
    message.error(errorMessage(error, '操作失败，请重试。'));
  };

  const selectRecord = (id: CrudId) => {
    setActiveId(id);
    setMode('view');
  };

  const changeMode = (nextMode: CrudMode) => {
    setMode(nextMode);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl">
        <PageHeader />

        <Card>
          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Spin />
            </div>
          ) : listError ? (
            <Alert
              type="error"
              showIcon
              title="文章列表加载失败"
              description={listError}
              action={
                <button
                  type="button"
                  className="cursor-pointer border-0 bg-transparent text-blue-600"
                  onClick={() => void loadInitial()}
                >
                  重试
                </button>
              }
            />
          ) : (
            <PostSchemaCrud
              activeId={activeId}
              mode={mode}
              options={options}
              recordsCount={records.length}
              refresh={refresh}
              onSelect={selectRecord}
              onModeChange={changeMode}
              onCreated={handleCreated}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
              onError={handleError}
            />
          )}
        </Card>

        {!loading && !listError ? <PostSummary records={records} total={total} /> : null}
      </div>
    </div>
  );
}
