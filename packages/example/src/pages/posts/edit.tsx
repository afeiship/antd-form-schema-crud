import { App as AntdApp } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { SchemaCrudForm, errorMessage } from '@jswork/antd-form-schema-crud';
import type { CrudSuccessEvent } from '@jswork/antd-form-schema-crud';
import type { PostRecord } from '../../api/posts';
import { PageHeader } from './components/page-header';
import { postSchema } from './schema';

export function PostsEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { message } = AntdApp.useApp();

  const handleSuccess = (_event: CrudSuccessEvent) => {
    message.success('保存成功');
    navigate(`/posts/${id}`);
  };

  const handleModeChange = () => {
    navigate('/posts');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="编辑文章"
          description="SchemaCrudForm 调用 nx.$api.posts_show / posts_update。"
        />
        <SchemaCrudForm<PostRecord>
          resource="posts"
          schema={postSchema}
          id={id}
          mode="edit"
          title="文章"
          onModeChange={handleModeChange}
          onSuccess={handleSuccess}
          onBack={() => navigate('/posts')}
          onError={(error) => message.error(errorMessage(error, '保存失败，请重试。'))}
        />
      </div>
    </div>
  );
}
