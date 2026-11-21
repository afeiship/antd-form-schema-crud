import { App as AntdApp } from 'antd';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { SchemaCrudForm, errorMessage } from '@jswork/antd-form-schema-crud';
import type { CrudMode, CrudSuccessEvent } from '@jswork/antd-form-schema-crud';
import type { PostRecord } from '../../api/posts';
import { PageHeader } from './components/page-header';
import { postPageConfig } from './config';

export function PostsDetailPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { id } = useParams();
  const { message } = AntdApp.useApp();

  const handleSuccess = (event: CrudSuccessEvent) => {
    if (event.action !== 'delete') return;
    message.success('删除成功');
    navigate(`/posts${search}`);
  };

  const handleModeChange = (mode: CrudMode) => {
    if (mode === 'edit') navigate(`/posts/${id}/edit${search}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="文章详情"
          description="SchemaCrudForm 调用 nx.$api.posts_show / posts_destroy。"
        />
        <SchemaCrudForm<PostRecord>
          resource={postPageConfig.resource}
          schema={postPageConfig.schema}
          id={id}
          mode="view"
          title={postPageConfig.title}
          viewFields={postPageConfig.detail.fields}
          onModeChange={handleModeChange}
          onSuccess={handleSuccess}
          onBack={() => navigate(`/posts${search}`)}
          onError={(error) => message.error(errorMessage(error, '操作失败，请重试。'))}
        />
      </div>
    </div>
  );
}
