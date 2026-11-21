# antd-form-schema-crud

> Ant Design schema-driven CRUD: `SchemaCrudForm` for one record, `SchemaCrudList` for a resource list.

[![version][version-image]][version-url]
[![license][license-image]][license-url]
[![download][download-image]][download-url]

## installation

```shell
pnpm add @jswork/antd-form-schema-crud
```

## usage

```tsx
import { SchemaCrudForm, SchemaCrudList } from '@jswork/antd-form-schema-crud';
import '@jswork/antd-form-schema-crud/style.css';

// 列表：固定调用 posts_index({ page, size, ...params })，返回 { rows, total }
<SchemaCrudList
  resource="posts"
  schema={postSchema}
  title="文章"
  onCreate={() => navigate('/posts/new')}
  onEdit={(record) => navigate(`/posts/${record.id}/edit`)}
/>;

// 单条记录：id 为空是新建，有值是详情；编辑、删除由组件处理
<SchemaCrudForm
  resource="posts"
  schema={postSchema}
  id={id}
  title="文章"
  onBack={() => navigate('/posts')}
/>;
```

- 组件不内置路由；列表跳转由 `onCreate / onEdit` 交给业务。
- `resource` 自动解析 `nx.$api` 的 `index / show / create / update / destroy`。
- 列可以用显式 `columns`，也可以由 `schema.fields` 推导，再用 `presets` 补展示属性。
- 成功回调统一为 `onSuccess(event)`，按 `event.action` 区分创建、保存、删除。

完整用法见 [packages/lib/README.md](packages/lib/README.md)，多页面示例见 [packages/example](packages/example)。

## license
Code released under [the MIT license](https://github.com/afeiship/antd-form-schema-crud/blob/main/LICENSE.txt).

[version-image]: https://img.shields.io/npm/v/@jswork/antd-form-schema-crud
[version-url]: https://npmjs.org/package/@jswork/antd-form-schema-crud

[license-image]: https://img.shields.io/npm/l/@jswork/antd-form-schema-crud
[license-url]: https://github.com/afeiship/antd-form-schema-crud/blob/main/LICENSE.txt

[download-image]: https://img.shields.io/npm/dm/@jswork/antd-form-schema-crud
[download-url]: https://www.npmjs.com/package/@jswork/antd-form-schema-crud
