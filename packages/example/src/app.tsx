import { useEffect, useMemo, useState } from 'react';
import { Alert, App as AntdApp, Card, Segmented, Select, Space, Spin, Tag, Typography } from 'antd';
import { SchemaCrud, errorMessage } from '@jswork/antd-form-schema-crud';
import '@jswork/antd-form-schema-crud/style.css';
import type { CrudId, CrudMode } from '@jswork/antd-form-schema-crud';
import type { FormSchema } from '@jswork/antd-form-schema';
import { postsApi } from './api/posts';
import type { PostRecord } from './api/posts';

const schema: FormSchema = {
  fields: [
    {
      key: 'title',
      label: '标题',
      widget: 'input',
      placeholder: '请输入文章标题',
      required: true,
      viewSpan: 2,
    },
    {
      key: 'subtitle',
      label: '副标题',
      widget: 'input',
      placeholder: '一句话摘要',
      viewSpan: 2,
    },
    {
      key: 'status',
      label: '状态',
      widget: 'select',
      options: [
        ['draft', '草稿'],
        ['waiting', '待发布'],
        ['published', '已发布'],
      ],
    },
    {
      key: 'is_sticky',
      label: '置顶',
      widget: 'switch',
    },
  ],
};

const modeText: Record<CrudMode, string> = {
  view: '文章详情',
  edit: '编辑文章',
  create: '新建文章',
};

const statusText: Record<PostRecord['status'], string> = {
  draft: '草稿',
  waiting: '待发布',
  published: '已发布',
};

function Demo() {
  const { message } = AntdApp.useApp();
  const [mode, setMode] = useState<CrudMode>('view');
  const [activeId, setActiveId] = useState<CrudId>();
  const [records, setRecords] = useState<PostRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  const loadList = async () => {
    const data = await postsApi.posts_index({ page: 1, size: 20 });
    setRecords(data.rows);
    setTotal(data.total);
    return data.rows;
  };

  const loadInitial = async () => {
    setLoading(true);
    setListError(null);
    try {
      const rows = await loadList();
      if (rows.length > 0) {
        setActiveId((current) => current ?? rows[0].id);
      } else {
        setMode('create');
      }
    } catch (error) {
      setListError(errorMessage(error, '文章列表加载失败。'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInitial();
    // Load once on mount; later refreshes are triggered explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Typography.Title level={3} className="!mb-1">
              SchemaCrud × posts
            </Typography.Title>
            <Typography.Text type="secondary">
              真实 Rails 接口：nx.$api.posts_show / create / update / destroy。
            </Typography.Text>
          </div>
          <Tag color="blue">Build {BUILD_TIME}</Tag>
        </div>

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
            <SchemaCrud
              key={`${mode}-${String(activeId ?? '')}-${refresh}`}
              mode={mode}
              schema={schema}
              resource="posts"
              id={activeId}
              title={modeText[mode]}
              formProps={{ layout: 'vertical' }}
              createInitialValues={{ status: 'draft', is_sticky: false }}
              beforeSubmit={(values) => ({
                ...values,
                title: String(values.title ?? '').trim(),
                subtitle: String(values.subtitle ?? '').trim(),
              })}
              extra={
                <Space wrap>
                  <Select
                    style={{ width: 260 }}
                    value={activeId}
                    options={options}
                    disabled={mode === 'create' || records.length === 0}
                    placeholder="选择文章"
                    onChange={(id) => {
                      setActiveId(id);
                      setMode('view');
                    }}
                  />
                  <Segmented
                    value={mode}
                    options={[
                      { label: '预览', value: 'view', disabled: !activeId },
                      { label: '编辑', value: 'edit', disabled: !activeId },
                      { label: '新建', value: 'create' },
                    ]}
                    onChange={(value) => setMode(value as CrudMode)}
                  />
                </Space>
              }
              onCancel={mode === 'view' || !activeId ? undefined : () => setMode('view')}
              onEdit={activeId ? () => setMode('edit') : undefined}
              onCreated={handleCreated}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
              onError={(error, action) => {
                if (action === 'load') return;
                message.error(errorMessage(error, '操作失败，请重试。'));
              }}
            />
          )}
        </Card>

        {!loading && !listError ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Typography.Text type="secondary">共 {total} 篇：</Typography.Text>
              {records.map((item) => (
                <Tag
                  key={item.id}
                  color={
                    item.status === 'published'
                      ? 'green'
                      : item.status === 'waiting'
                        ? 'orange'
                        : 'default'
                  }
                >
                  {item.title} · {statusText[item.status]}
                </Tag>
              ))}
            </div>
            <Typography.Paragraph type="secondary" className="mt-4 !mb-0">
              <Typography.Text code>resource="posts"</Typography.Text> 解析全局{' '}
              <Typography.Text code>nx.$api</Typography.Text>；写操作会把表单值包成{' '}
              <Typography.Text code>{'{ post: values }'}</Typography.Text>，符合当前 Rails 控制器。
            </Typography.Paragraph>
          </>
        ) : null}
      </div>
    </div>
  );
}

function App() {
  return (
    <AntdApp>
      <Demo />
    </AntdApp>
  );
}

export default App;
