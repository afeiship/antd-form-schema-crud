# antd-form-schema-crud

> Ant Design schema-driven CRUD: `SchemaCrudForm` for one record, `SchemaCrudList` for a resource list.

## Installation

```shell
pnpm add @jswork/antd-form-schema-crud
```

## Quick start

一行记录：`SchemaCrudForm` 负责创建、预览、编辑、删除。列表：`SchemaCrudList` 负责 `xx_index`、分页、列和行内动作。

```tsx
import { SchemaCrudForm, SchemaCrudList } from '@jswork/antd-form-schema-crud';
import '@jswork/antd-form-schema-crud/style.css';
```

### 列表

```tsx
<SchemaCrudList
  resource="posts"
  schema={postSchema}
  title="文章"
  presets={postListPresets}
  onCreate={() => navigate('/posts/new')}
  onEdit={(record) => navigate(`/posts/${record.id}/edit`)}
/>
```

页码写回路由的最小写法：

```tsx
const [searchParams, setSearchParams] = useSearchParams();
const page = Number(searchParams.get('page') ?? 1);

<SchemaCrudList
  page={page}
  onPageChange={(nextPage) => {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));
    setSearchParams(next);
  }}
/>
```

固定接口约定：

```ts
posts_index({ page, size, ...params }) // => { rows, total }
```

- `resource="posts"` 自动解析 `nx.$api.posts_index`；也可以传 `api.index`。
- `page`、`size` 由组件控制，`params` 里的同名值会被覆盖。
- 响应必须是 `{ rows, total }`；外层 `data` 解包放在 API 适配层。
- 服务端分页；`presets` 只配置列展示，不改变表单字段。
- 列表不依赖 React Router，跳转由 `onCreate / onEdit` 交给业务。
- 行内只有编辑和删除，不提供查看按钮，也不响应整行点击。
- 行内删除默认开启，带 `Popconfirm`；删除当前页最后一条会自动回退一页。
- 需要刷新后保留页码时，把 `page` 受控传入，并用 `onPageChange` 写回路由；`onPageChange` 也会覆盖筛选重置和删除回退。

### 详情 / 新建 / 编辑

```tsx
<SchemaCrudForm
  resource="posts"
  schema={postSchema}
  id={activeId}
  title="文章"
  onSuccess={(event) => {
    if (event.action === 'create') setActiveId(event.result.id);
  }}
  onBack={() => setActiveId(undefined)}
/>
```

- `id` 为空进入创建，有值进入详情；不传 `mode` 时，详情里的“编辑”由组件内部切换。
- 表单默认横向布局，标签宽 `120px`；要改宽度传 `formProps.labelCol`。
- 创建默认值写在 `schema.initialValues`，提交前转换写在 `schema.normalizeValues`。
- 成功回调统一为 `onSuccess(event)`，按 `event.action` 区分 `create / update / delete`。
- 需要受控模式时传 `mode`，并通过 `onModeChange` 同步。

## Column presets

```ts
import type { ListPresets } from '@jswork/antd-form-schema-crud';

export const postListPresets: ListPresets = {
  fields: {
    title: { title: '标题', width: 240 },
    status: { title: '状态', width: 100, align: 'center' },
  },
};
```

也接受扁平写法 `{ title: '标题', status: '状态' }`。

- 列优先级：显式 `columns` > `presets` > `schema.fields.label` > 字段 `key`。
- `presets` 不创建列；schema 没有的字段不会多出一列。
- `hidden: true` 只隐藏列表里的推导列，表单字段不受影响。
- 操作列不受 `presets` 影响；复杂单元格继续用显式 `columns`。

## Project defaults

`configureSchemaCrudForm` 只作用于 `SchemaCrudForm`，列表有独立的默认值（`pageSize=10`、`rowKey='id'`、`confirmDelete=true`）。

```ts
import {
  configureSchemaCrudForm,
  getSchemaCrudFormDefaults,
  resetSchemaCrudFormDefaults,
} from '@jswork/antd-form-schema-crud';

configureSchemaCrudForm({
  title: '文章',
  confirmDelete: false,
  actions: { save: { text: '提交' }, delete: { text: '移除' } },
  formProps: { layout: 'horizontal' },
});
```

- `actions` 和 `formProps` 会与实例 props 浅合并，实例优先。
- `getSchemaCrudFormDefaults()` 返回当前默认值的副本。
- `resetSchemaCrudFormDefaults()` 清空默认值，主要用于测试。

## Exports

- 组件：`SchemaCrudForm`、`AntdFormSchemaCrudForm`、`SchemaCrudList`
- 全局配置：`configureSchemaCrudForm`、`getSchemaCrudFormDefaults`、`resetSchemaCrudFormDefaults`
- 工具：`resolveApi`、`checkRequirement`、`checkListRequirement`、`errorMessage`、`getNxApi`
- 类型：`SchemaCrudFormProps`、`SchemaCrudListProps`、`CrudApi`、`CrudListParams`、`CrudListResult`、`ListPresets`、`CrudSuccessEvent` 等
