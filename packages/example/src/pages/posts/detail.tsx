import { App as AntdApp } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { SchemaCrudForm, errorMessage } from '@jswork/antd-form-schema-crud';
import type { CrudMode, CrudSuccessEvent } from '@jswork/antd-form-schema-crud';
import type { PostRecord } from '../../api/posts';
import { PageHeader } from './components/page-header';
import { postSchema } from './schema';

export function PostsDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { message } = AntdApp.useApp();

  const handleSuccess = (event: CrudSuccessEvent) => {
    if (event.action !== 'delete') return;
    message.success('删除成功');
    navigate('/posts');
  };

  const handleModeChange = (mode: CrudMode) => {
    if (mode === 'edit') navigate(`/posts/${id}/edit`);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="文章详情"
          description="SchemaCrudForm 调用 nx.$api.posts_show / posts_destroy。"
        />
        <SchemaCrudForm<PostRecord>
          resource="posts"
          schema={postSchema}
          id={id}
          mode="view"
          title="文章"
          onModeChange={handleModeChange}
          onSuccess={handleSuccess}
          onBack={() => navigate('/posts')}
          onError={(error) => message.error(errorMessage(error, '操作失败，请重试。'))}
        />
      </div>
    </div>
  );
}
