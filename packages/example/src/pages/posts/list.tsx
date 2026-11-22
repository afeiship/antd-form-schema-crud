import { Button, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  SchemaCrudList,
  queryPlugins,
  useCrudListActions,
} from '@jswork/antd-form-schema-crud';
import type { PostRecord } from '../../api/posts';
import { PageHeader } from './components/page-header';
import { postPageConfig } from './config';
import { STATUS_TEXT } from './schema';

interface PostListQuery {
  keywords?: string;
  status?: PostRecord['status'];
}

type PostStatus = PostRecord['status'];

const POST_STATUS_OPTIONS = (
  Object.entries(STATUS_TEXT) as [PostStatus, string][]
).map(([value, label]) => ({ value, label }));

export function PostsListPage() {
  const navigate = useNavigate();
  const list = useCrudListActions(postPageConfig.resource);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="SchemaCrudList × posts"
          description="列表固定请求 nx.$api.posts_index({ page, size, ...query })，查询区通过 query.slots + queryPlugins 接入。"
        />

        <div className="mb-3 flex items-center gap-3">
          <Button size="small" disabled={!list.ready} onClick={() => list.reload()}>
            外部 Hook 刷新
          </Button>
          <span className="text-xs text-slate-400">
            {list.ready ? '已连接列表实例' : '等待列表挂载'}
          </span>
        </div>

        <SchemaCrudList<PostRecord, PostListQuery>
          resource={postPageConfig.resource}
          schema={postPageConfig.schema}
          fields={postPageConfig.list.fields}
          presets={postPageConfig.list.presets}
          title={postPageConfig.title}
          keepDefaultParams={false}
          onCreate={() => navigate('/posts/new')}
          query={{
            defaultValues: { keywords: undefined, status: undefined },
            urlKeys: { keywords: 'q', status: 'status' },
            slots: {
              headerStart: queryPlugins.status<PostListQuery, PostStatus>({
                options: POST_STATUS_OPTIONS,
              }),
              headerEnd: queryPlugins.keywords<PostListQuery>({
                width: 220,
                placeholder: '搜索标题 / 副标题',
                autoFocus: true,
              }),
              body: ({ values, setValues, reset }) => {
                if (!values.keywords && !values.status) return null;
                return (
                  <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    <span>当前筛选</span>
                    {values.keywords ? (
                      <Tag closable onClose={() => setValues({ keywords: undefined })}>
                        关键词：{values.keywords}
                      </Tag>
                    ) : null}
                    {values.status ? (
                      <Tag closable onClose={() => setValues({ status: undefined })}>
                        状态：{STATUS_TEXT[values.status] ?? values.status}
                      </Tag>
                    ) : null}
                    <Button type="link" size="small" onClick={() => reset()}>
                      清空
                    </Button>
                  </div>
                );
              },
            },
          }}
        />
      </div>
    </div>
  );
}
