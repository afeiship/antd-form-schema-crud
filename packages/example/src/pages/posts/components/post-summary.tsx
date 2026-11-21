import { Tag, Typography } from 'antd';
import type { PostRecord } from '../../../api/posts';
import { STATUS_TEXT } from '../schema';

interface PostSummaryProps {
  records: PostRecord[];
  total: number;
}

function statusColor(status: PostRecord['status']) {
  if (status === 'published') return 'green';
  if (status === 'waiting') return 'orange';
  return 'default';
}

export function PostSummary({ records, total }: PostSummaryProps) {
  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Typography.Text type="secondary">共 {total} 篇：</Typography.Text>
        {records.map((item) => (
          <Tag key={item.id} color={statusColor(item.status)}>
            {item.title} · {STATUS_TEXT[item.status]}
          </Tag>
        ))}
      </div>
      <Typography.Paragraph type="secondary" className="mt-4 !mb-0">
        <Typography.Text code>resource="posts"</Typography.Text> 解析全局{' '}
        <Typography.Text code>nx.$api</Typography.Text>；写操作会把表单值包成{' '}
        <Typography.Text code>{'{ post: values }'}</Typography.Text>，符合当前 Rails 控制器。
      </Typography.Paragraph>
    </>
  );
}
