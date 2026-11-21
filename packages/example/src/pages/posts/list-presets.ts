import type { ListPresets } from '@jswork/antd-form-schema-crud';

/** 列表列展示配置，只影响列宽/标题等，不改变表单字段。 */
export const postListPresets: ListPresets = {
  fields: {
    title: { title: '标题', width: 240 },
    subtitle: { title: '副标题', ellipsis: true },
    status: { title: '状态', width: 100, align: 'center' },
    is_sticky: { hidden: true },
  },
};
