import type { ReactNode } from 'react';
import { Space } from 'antd';
import { CLASS_NAME } from '../constants';
import type { CrudMode } from '../types';

interface SchemaCardTitleProps {
  mode: CrudMode;
  subject: ReactNode;
  dirty: boolean;
}

/** Card title: 新建 X / X详情 / 编辑 X, plus the unsaved dot. */
export function SchemaCardTitle({ mode, subject, dirty }: SchemaCardTitleProps) {
  if (!subject) return null;

  const title =
    mode === 'view' ? (
      <>{subject}详情</>
    ) : (
      <>
        {mode === 'create' ? '新建' : '编辑'}
        {subject}
      </>
    );

  return (
    <Space size={6}>
      <span>{title}</span>
      {dirty ? <span className={`${CLASS_NAME}__dirty`} aria-label="有未保存修改" /> : null}
    </Space>
  );
}

interface SchemaCardExtraProps {
  extra?: ReactNode;
}

/** Card extra: caller-owned content only; navigation lives in the footer. */
export function SchemaCardExtra({ extra }: SchemaCardExtraProps) {
  if (!extra) return null;
  return <Space>{extra}</Space>;
}
