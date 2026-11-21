import { App as AntdApp } from 'antd';
import { useNavigate } from 'react-router-dom';
import { SchemaCrudList, errorMessage } from '@jswork/antd-form-schema-crud';
import type { CrudSuccessEvent } from '@jswork/antd-form-schema-crud';
import type { PostRecord } from '../../api/posts';
import { PageHeader } from './components/page-header';
import { postListPresets } from './list-presets';
import { postSchema } from './schema';

export function PostsListPage() {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();

  const handleSuccess = (event: CrudSuccessEvent) => {
    if (event.action === 'delete') message.success('删除成功');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="SchemaCrudList × posts"
          description="列表固定请求 nx.$api.posts_index({ page, size })，响应固定 { rows, total }。"
        />

        <SchemaCrudList<PostRecord>
          resource="posts"
          schema={postSchema}
          presets={postListPresets}
          title="文章"
          onCreate={() => navigate('/posts/new')}
          onView={(record) => navigate(`/posts/${record.id}`)}
          onEdit={(record) => navigate(`/posts/${record.id}/edit`)}
          onSuccess={handleSuccess}
          onError={(error) => message.error(errorMessage(error, '操作失败，请重试。'))}
        />
      </div>
    </div>
  );
}
