import { useEffect, useMemo, useState } from 'react';
import { Alert, App as AntdApp, Button, Card, Select, Space, Spin } from 'antd';
import { SchemaCrud, errorMessage } from '@jswork/antd-form-schema-crud';
import type { CrudId, CrudSuccessEvent, SchemaCrudProps } from '@jswork/antd-form-schema-crud';
import type { PostRecord } from '../../api/posts';
import { PageHeader } from './components/page-header';
import { PostSummary } from './components/post-summary';
import { postSchema } from './schema';
import { usePostList } from './use-post-list';

type HandleError = NonNullable<SchemaCrudProps['onError']>;

export function PostsPage() {
  const { message } = AntdApp.useApp();
  const [activeId, setActiveId] = useState<CrudId>();
  const { records, total, loading, listError, loadList, loadInitial } = usePostList();

  useEffect(() => {
    if (loading || listError || records.length === 0) return;
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

  const handleSuccess = async (event: CrudSuccessEvent) => {
    try {
      const rows = await loadList();
      if (event.action === 'create') {
        setActiveId((event.result as PostRecord).id ?? rows[0]?.id);
        message.success('创建成功');
      } else if (event.action === 'delete') {
        setActiveId(rows[0]?.id);
        message.success('删除成功');
      } else {
        message.success('保存成功');
      }
    } catch (error) {
      message.error(errorMessage(error, '列表刷新失败，请手动刷新。'));
    }
  };

  const handleError: HandleError = (error, action) => {
    if (action === 'load') return;
    message.error(errorMessage(error, '操作失败，请重试。'));
  };

  const extra = (
    <Space wrap>
      <Select
        style={{ width: 260 }}
        value={activeId}
        options={options}
        disabled={records.length === 0}
        placeholder="选择文章"
        onChange={(id) => setActiveId(id)}
      />
      <Button onClick={() => setActiveId(undefined)}>新建</Button>
    </Space>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl">
        <PageHeader />

        {loading ? (
          <Card>
            <div className="flex min-h-40 items-center justify-center">
              <Spin />
            </div>
          </Card>
        ) : listError ? (
          <Card>
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
          </Card>
        ) : (
          <SchemaCrud
            resource="posts"
            schema={postSchema}
            id={activeId}
            title="文章"
            extra={extra}
            onSuccess={handleSuccess}
            onBack={() => setActiveId(activeId === undefined ? records[0]?.id : undefined)}
            onError={handleError}
          />
        )}

        {!loading && !listError ? <PostSummary records={records} total={total} /> : null}
      </div>
    </div>
  );
}
