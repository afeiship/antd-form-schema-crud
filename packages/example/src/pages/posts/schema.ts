import type { FormSchema } from '@jswork/antd-form-schema';
import type { PostRecord } from '../../api/posts';

export const postSchema: FormSchema = {
  initialValues: {
    status: 'draft',
    is_sticky: false,
  },
  normalizeValues: (values) => ({
    ...values,
    title: String(values.title ?? '').trim(),
    subtitle: String(values.subtitle ?? '').trim(),
  }),
  fields: [
    {
      key: 'title',
      label: '标题',
      widget: 'input',
      placeholder: '请输入文章标题',
      required: true,
      viewSpan: 2,
    },
    {
      key: 'subtitle',
      label: '副标题',
      widget: 'input',
      placeholder: '一句话摘要',
      viewSpan: 2,
    },
    {
      key: 'status',
      label: '状态',
      widget: 'select',
      options: [
        ['draft', '草稿'],
        ['waiting', '待发布'],
        ['published', '已发布'],
      ],
    },
    {
      key: 'is_sticky',
      label: '置顶',
      widget: 'switch',
    },
  ],
};

export const STATUS_TEXT: Record<PostRecord['status'], string> = {
  draft: '草稿',
  waiting: '待发布',
  published: '已发布',
};
