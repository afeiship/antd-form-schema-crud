# antd-form-schema-crud

> Ant Design schema-driven CRUD: `SchemaCrudForm` for one record, `SchemaCrudList` for a resource list.

## Installation

```shell
pnpm add @jswork/antd-form-schema-crud @jswork/antd-form-schema@^1.0.3
```

`@jswork/antd-form-schema` 是 peer dependency；宿主项目需要显式安装，避免多份 schema 实例。

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
- `page`、`size` 由组件控制，`params` 里的同名字段会被覆盖。
- 默认响应是 `{ rows, total }`；外层 `data` 解包放在 API 适配层。
- 请求和响应字段名可在项目入口全局配置一次，默认仍是 `page / size / rows / total`。
- 服务端分页；`presets` 只配置列展示，不改变表单字段。
- 列表不依赖 React Router，跳转由 `onCreate / onEdit` 交给业务。
- `fields` 只筛选 schema 推导列；显式 `columns` 优先，`fields` 不传时展示全部字段。
- 行内只有编辑和删除，不提供查看按钮，也不响应整行点击。
- 行内删除默认开启，带 `Popconfirm`；删除当前页最后一条会自动回退一页。
- 需要刷新后保留页码时，把 `page` 受控传入，并用 `onPageChange` 写回路由；`onPageChange` 也会覆盖筛选重置和删除回退。

### 查询区

查询区只有 `query.slots` 一种接入方式。查询值、页码回退和 URL 同步由列表处理：

```tsx
<SchemaCrudList
  resource="posts"
  schema={postSchema}
  params={{ tenant_id: 1 }}
  query={{
    defaultValues: { keywords: undefined, status: 'open' },
    slots: {
      headerStart: ({ values }) => (
        <Tag>{values.status === 'open' ? '进行中' : '全部状态'}</Tag>
      ),
      headerEnd: ({ values, setValues, reset }) => (
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="搜索"
            value={(values.keywords as string) ?? ''}
            onChange={(event) =>
              setValues({ keywords: event.target.value.trim() || undefined })
            }
          />
          <Button onClick={() => reset()}>重置</Button>
        </Space>
      ),
      body: ({ values, setValues }) => (
        <DateRangePicker
          value={values.range}
          onChange={(range) => setValues({ range })}
        />
      ),
    },
  }}
/>
```

- `before` / `headerStart` / `headerEnd` / `body` 四个 slot 可同时使用。
- `headerStart` 在新建之前，`headerEnd` 在刷新 / 返回之后，`before` 在 Card 之前，`body` 在 Card 内容顶部。
- 所有 slot 都是函数，统一拿到 `values` / `setValues` / `reset` / `loading`。
- `defaultValues` 是整份查询状态的唯一基线；惰性函数只执行一次，可读 `searchParams` / `location`。
- 查询值不要求是行记录字段。需要类型提示时用第二个泛型：`SchemaCrudList<PostRecord, PostListQuery>`。
- 请求合并为 `{ ...query.values, ...params, page, size }`，同名 key 由 `params` 覆盖。
- 查询值变化默认回第 1 页；`setValues(value, { resetPage: false })` 可保留当前页。
- Router 中默认同步查询值到 URL，`urlKeys` 支持数组或 `{ keywords: 'q' }` 映射；`url: false` 可关闭。
- 查询值里的分页 key 会被忽略，`page` / `size` 始终优先。

### 业务字段配置

列表字段和详情字段通常不同。每个业务用一个普通配置对象集中声明，不复制 schema：

```ts
export const postPageConfig = {
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
```

单页新建/编辑优先用一个 `form` 模式，不需要拆两个页面或两套 mode：

```tsx
<SchemaCrudForm
  resource="posts"
  schema={postSchema}
  id={id}
  mode="form"
  title="文章"
  onBack={() => navigate('/posts')}
/>

<SchemaCrudList
  resource={postPageConfig.resource}
  schema={postPageConfig.schema}
  title={postPageConfig.title}
  fields={postPageConfig.list.fields}
  presets={postPageConfig.list.presets}
/>

<SchemaCrudForm
  resource={postPageConfig.resource}
  schema={postPageConfig.schema}
  id={id}
  mode="view"
  title={postPageConfig.title}
  viewFields={postPageConfig.detail.fields}
/>
```

- `fields` 按数组顺序生成列表列，未知 key 和 schema `hidden` 字段会被忽略。
- `viewFields` 只在 `mode="view"` 生效；新建、编辑继续使用完整 schema。
- `mode="form"` 用一个页面同时承接新建和编辑；详情仍使用 `mode="view"`。
- 详情字段、列表字段都来自同一份 schema；需要额外计算列时继续用显式 `columns`。

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
- 只需要新建/编辑时传 `mode="form"`：无 `id` 为创建，有 `id` 直接进入编辑，不经过详情态。保存后停留在编辑并重新加载记录；取消或删除调用 `onBack`。大部分单页表单用这个即可。
- 表单默认横向布局，标签宽 `100px`，控件列设置 `flex-grow: 1`、`flex-shrink: 1`、`flex-basis: 0`，并允许收缩到 0；要改宽度传 `formProps.labelCol`。
- 详情可用 `viewFields` 筛选字段，组件内按声明顺序展示；新建和编辑不受影响。
- 新建、编辑支持 `Cmd+S`（macOS）/ `Ctrl+S`（Windows/Linux）保存，并拦截浏览器自带的保存网页；详情态不绑定快捷键，底部左侧显示灰色快捷键提示。
- 快捷键与保存按钮共用同一套可保存条件：表单 ready、无请求进行中、编辑态有变更；校验不通过时不会发请求。

## 外部动作 hook

列表和表单的动作可通过 `actionScope` 暴露给同页面其他 React 组件，不需要 ref，也不走 window 事件：

```tsx
import { useCrudListActions, useCrudFormActions } from '@jswork/antd-form-schema-crud';

function PageToolbar() {
  const list = useCrudListActions('posts');
  const form = useCrudFormActions('posts');

  return (
    <>
      <Button disabled={!list.ready} onClick={() => list.reload()}>刷新</Button>
      <Button disabled={!list.ready} onClick={() => list.create()}>新建</Button>
      <Button disabled={!list.ready} onClick={() => list.edit(record)}>编辑</Button>
      <Button disabled={!form.ready} onClick={() => form.submit()}>保存</Button>
    </>
  );
}
```

```tsx
<SchemaCrudList resource="posts" ... />
<SchemaCrudForm resource="posts" ... />
```

- 默认 scope 回退到 `resource`，也可用 `actionScope` 显式指定。
- 列表和表单按 surface 隔离，同一个 `'posts'` 可同时存在。
- 目标挂载前返回 `ready: false` 和完整 no-op API；卸载后自动失效。
- 同一 surface + scope 只允许一个实例，重复注册会在开发环境报错并保留第一个。
- `remove` 直接删除、不弹 Popconfirm，调用方自行确认；返回 Promise。`submit` 是触发式接口，结果仍走 `onSuccess` / `onError`。
- 标题左侧有图标返回；底部是独立工具栏：删除、取消/返回与主操作统一靠右，删除排在最前。
- 创建默认值写在 `schema.initialValues`，提交前转换写在 `schema.normalizeValues`。
- 成功回调统一为 `onSuccess(event)`，按 `event.action` 区分 `create / update / delete`。
- 需要受控模式时传 `mode`，并通过 `onModeChange` 同步。

## Router 分页

`SchemaCrudList` 默认从路由查询参数读取并写回分页，不需要额外组件或子入口：

```tsx
import { SchemaCrudList } from '@jswork/antd-form-schema-crud';

<SchemaCrudList
  resource="posts"
  schema={postSchema}
  title="文章"
  onCreate={() => navigate('/posts/new')}
  onEdit={(record) => navigate(`/posts/${record.id}/edit`)}
/>
```

- 默认读写 `?page=1&size=10`，翻页和切换每页数量会自动更新 URL。
- URL 参数名跟随 `configureSchemaCrudList({ keys: { page, size } })` 的全局配置。
- 业务不再需要手写 `handlePageChange`，也不需要自己读取 `useSearchParams`。
- `keepDefaultParams` 默认 `true`，即使等于默认值也保留在 URL 中；传 `false` 时默认值会从 URL 移除。
- 需要额外处理时仍可传 `onPageChange`，它在 URL 更新后触发。
- 同时传 `page` 或 `pageSize` 视为受控分页，此时不读写 URL，回到纯组件状态。
- 不在 Router 上下文中时自动退回组件内部分页，单元测试和无路由页面仍可直接使用。
- 在 Router 上下文中，新建默认导航到 `${pathname}/add${search}`，编辑默认导航到 `${pathname}/${rowKey}/edit${search}`；传入 `onCreate` / `onEdit` 即完全覆盖。
- 删除成功默认提示“删除成功”，请求失败默认提示“操作失败，请重试。”；`onSuccess` / `onError` 可覆盖。

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

## Shared UI defaults

表单卡片和列表卡片共用同一个 `cardSize`，默认 `middle`。需要调整时只配置一次：

```ts
import { configureSchemaCrud } from '@jswork/antd-form-schema-crud';

configureSchemaCrud({ cardSize: 'small' });
```

`getSchemaCrudDefaults()` 返回当前共享默认值，`resetSchemaCrudDefaults()` 恢复默认。改成 `small` 后，标题栏、内边距和底部工具栏会一起收紧。

## Project defaults

`configureSchemaCrudForm` 只作用于 `SchemaCrudForm`，列表有独立的项目级配置。列表默认值：`pageSize=10`、`rowKey='id'`、`confirmDelete=true`、表格 `size='small'`。

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

列表请求和响应 key 的项目级配置：

```ts
import {
  configureSchemaCrudList,
  getSchemaCrudListDefaults,
  resetSchemaCrudListDefaults,
} from '@jswork/antd-form-schema-crud';

configureSchemaCrudList({
  keys: {
    page: 'pageNo',
    size: 'pageSize',
    rows: 'list',
    total: 'count',
  },
});
// GET: posts_index({ pageNo, pageSize, ...params })
// Response: { list, count }
```

只传需要改的 key；未传的继续使用默认值。`getSchemaCrudListDefaults()` 返回合并后的四个 key，`resetSchemaCrudListDefaults()` 恢复默认。

## Exports

- 组件：`SchemaCrudForm`、`AntdFormSchemaCrudForm`、`SchemaCrudList`
- 全局配置：`configureSchemaCrud`、`getSchemaCrudDefaults`、`resetSchemaCrudDefaults`、`configureSchemaCrudForm`、`getSchemaCrudFormDefaults`、`resetSchemaCrudFormDefaults`、`configureSchemaCrudList`、`getSchemaCrudListDefaults`、`resetSchemaCrudListDefaults`
- 工具：`resolveApi`、`checkRequirement`、`checkListRequirement`、`errorMessage`、`getNxApi`
- 类型：`SchemaCrudDefaults`、`SchemaCrudFormProps`、`SchemaCrudListProps`、`CrudApi`、`CrudListParams`、`CrudListResult`、`ListPresets`、`CrudSuccessEvent` 等
