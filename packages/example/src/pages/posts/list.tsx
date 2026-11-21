import { App as AntdApp } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SchemaCrudList, errorMessage } from '@jswork/antd-form-schema-crud';
import type { CrudSuccessEvent } from '@jswork/antd-form-schema-crud';
import type { PostRecord } from '../../api/posts';
import { PageHeader } from './components/page-header';
import { postListPresets } from './list-presets';
import { postSchema } from './schema';

const DEFAULT_PAGE_SIZE = 10;

function readPositive(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function PostsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { message } = AntdApp.useApp();
  const page = readPositive(searchParams.get('page'), 1);
  const pageSize = readPositive(searchParams.get('size'), DEFAULT_PAGE_SIZE);

  const handlePageChange = (nextPage: number, nextPageSize: number) => {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));

    if (nextPageSize === DEFAULT_PAGE_SIZE) next.delete('size');
    else next.set('size', String(nextPageSize));

    setSearchParams(next);
  };

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
          page={page}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onCreate={() => navigate('/posts/new')}
          onEdit={(record) => navigate(`/posts/${record.id}/edit`)}
          onSuccess={handleSuccess}
          onError={(error) => message.error(errorMessage(error, '操作失败，请重试。'))}
        />
      </div>
    </div>
  );
}
