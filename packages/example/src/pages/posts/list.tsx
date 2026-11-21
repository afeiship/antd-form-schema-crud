import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { SchemaCrudList, useCrudListActions } from '@jswork/antd-form-schema-crud';
import type { PostRecord } from '../../api/posts';
import { PageHeader } from './components/page-header';
import { postPageConfig } from './config';

export function PostsListPage() {
  const navigate = useNavigate();
  const list = useCrudListActions(postPageConfig.resource);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="SchemaCrudList × posts"
          description="列表固定请求 nx.$api.posts_index({ page, size })，响应固定 { rows, total }。"
        />

        <div className="mb-3 flex items-center gap-3">
          <Button size="small" disabled={!list.ready} onClick={() => list.reload()}>
            外部 Hook 刷新
          </Button>
          <span className="text-xs text-slate-400">
            {list.ready ? '已连接列表实例' : '等待列表挂载'}
          </span>
        </div>

        <SchemaCrudList<PostRecord>
          resource={postPageConfig.resource}
          schema={postPageConfig.schema}
          fields={postPageConfig.list.fields}
          presets={postPageConfig.list.presets}
          title={postPageConfig.title}
          keepDefaultParams={false}
          onCreate={() => navigate('/posts/new')}
        />
      </div>
    </div>
  );
}
