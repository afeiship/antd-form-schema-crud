import { Tag, Typography } from 'antd';

export function PageHeader() {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <Typography.Title level={3} className="!mb-1">
          SchemaCrud × posts
        </Typography.Title>
        <Typography.Text type="secondary">
          真实 Rails 接口：nx.$api.posts_show / create / update / destroy。
        </Typography.Text>
      </div>
      <Tag color="blue">Build {BUILD_TIME}</Tag>
    </div>
  );
}
