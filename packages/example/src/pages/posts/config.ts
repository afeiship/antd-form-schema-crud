import type { FormSchema } from '@jswork/antd-form-schema';
import type { ListPresets } from '@jswork/antd-form-schema-crud';
import { postSchema } from './schema';
import { postListPresets } from './list-presets';

/** Resource-scoped field configuration. Pages consume it instead of repeating lists. */
export interface PostPageConfig {
  resource: 'posts';
  title: string;
  schema: FormSchema;
  list: {
    fields: string[];
    presets?: ListPresets;
  };
  detail: {
    fields: string[];
  };
}

export const postPageConfig: PostPageConfig = {
  resource: 'posts',
  title: '文章',
  schema: postSchema,
  list: {
    fields: ['title', 'subtitle', 'status'],
    presets: postListPresets,
  },
  detail: {
    fields: ['title', 'subtitle', 'status', 'is_sticky'],
  },
};
