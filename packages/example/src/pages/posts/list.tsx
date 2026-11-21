import { useNavigate } from 'react-router-dom';
import { SchemaCrudList } from '@jswork/antd-form-schema-crud';
import type { PostRecord } from '../../api/posts';
import { PageHeader } from './components/page-header';
import { postPageConfig } from './config';

export function PostsListPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="SchemaCrudList × posts"
          description="列表固定请求 nx.$api.posts_index({ page, size })，响应固定 { rows, total }。"
        />

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
