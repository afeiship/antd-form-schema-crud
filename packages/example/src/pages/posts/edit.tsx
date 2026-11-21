import { App as AntdApp } from 'antd';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { SchemaCrudForm, errorMessage } from '@jswork/antd-form-schema-crud';
import type { CrudSuccessEvent } from '@jswork/antd-form-schema-crud';
import type { PostRecord } from '../../api/posts';
import { PageHeader } from './components/page-header';
import { postPageConfig } from './config';

export function PostsEditPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { id } = useParams();
  const { message } = AntdApp.useApp();

  const handleSuccess = (_event: CrudSuccessEvent) => {
    message.success('保存成功');
    navigate(`/posts/${id}${search}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="编辑文章"
          description="SchemaCrudForm 调用 nx.$api.posts_show / posts_update。"
        />
        <SchemaCrudForm<PostRecord>
          resource={postPageConfig.resource}
          schema={postPageConfig.schema}
          id={id}
          mode="form"
          title={postPageConfig.title}
          onSuccess={handleSuccess}
          onBack={() => navigate(`/posts${search}`)}
          onError={(error) => message.error(errorMessage(error, '保存失败，请重试。'))}
        />
      </div>
    </div>
  );
}
