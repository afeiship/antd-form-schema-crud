import { App as AntdApp } from 'antd';
import { useNavigate } from 'react-router-dom';
import { SchemaCrudForm, errorMessage } from '@jswork/antd-form-schema-crud';
import type { CrudSuccessEvent } from '@jswork/antd-form-schema-crud';
import type { PostRecord } from '../../api/posts';
import { PageHeader } from './components/page-header';
import { postSchema } from './schema';

export function PostsCreatePage() {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();

  const handleSuccess = (event: CrudSuccessEvent) => {
    message.success('创建成功');
    const record = event.result as PostRecord | undefined;
    navigate(`/posts/${record?.id ?? ''}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="新建文章"
          description="SchemaCrudForm 调用 nx.$api.posts_create。"
        />
        <SchemaCrudForm<PostRecord>
          resource="posts"
          schema={postSchema}
          mode="create"
          title="文章"
          onSuccess={handleSuccess}
          onBack={() => navigate('/posts')}
          onError={(error) => message.error(errorMessage(error, '创建失败，请重试。'))}
        />
      </div>
    </div>
  );
}
