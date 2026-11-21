# SchemaCrudList：资源列表与多页面 CRUD

日期：2026-11-21

状态：待确认

关系：在 `SchemaCrudForm` v2 之上增加列表组件。列表只负责 `xx_index`、分页、行操作和列表级动作；新建、详情、编辑通过路由进入独立的 `SchemaCrudForm` 页面。

## 一句话边界

新增 `SchemaCrudList`：只给 `resource + schema`，组件负责 `index` 列表、服务端分页、加载状态和行内动作。页面之间怎么跳由业务决定，示例用 React Router 把列表、新建、详情、编辑串起来。

## 意图

`SchemaCrudForm` 已经解决了“一条记录”的创建、预览、编辑、删除。列表页还缺一套标准实现：

- 调用 `xx_index`；
- 维护 `page / size`；
- 处理列表加载、错误、空数据；
- 渲染列和行操作；
- 跳转到新建、详情、编辑页面。

参考项目 `react-ant-resource-list` 已经验证了 `nx.$api.xx_index` 的固定结构：

```ts
{ rows, total }
```

这次把列表接进现有 CRUD，但**不把详情塞进列表组件**。列表、新建、详情、编辑各自是一个页面，通过路由组合。这样更接近真实后台项目，也不会让一个组件同时承担列表、详情和路由。

## 参考项目审计

参考项目：`/Users/afei/github/react-ant-resource-list`。

### 值得吸收

- 根容器是 `Card`，标题在 `Card.title`，动作在 `Card.extra`。
- 固定调用 `{resource}_index`，payload 包含 `{ page, size }`。
- 响应固定 `{ rows, total }`。
- 表格默认 `bordered`、`size="middle"`，服务端分页。
- 卡片头部有新建、刷新、返回这类资源级动作。
- 行内可以有查看、编辑、删除操作。

### 不照搬

- 不依赖 `@jswork/antd-components` 的 `AcTable`、`AcCardExtras`。
- 不做 `lang` / `module` / i18n。
- 不通过 `nx.$event` 跳转。
- 不做 `paramsAdd`、`paramsEdit` 这类路由上下文参数。
- 不把列定义拆成 `columns / columnsFields / columnsAction` 三套 prop。
- 不内置路由，不依赖 `react-router`；跳转通过 `onCreate / onView / onEdit` 交给业务。

## 目标

- `SchemaCrudList` 只写 `resource`、`schema`、`title` 就能渲染标准列表。
- `xx_index` 通过 `nx.$api` 自动解析，返回结构严格按 `{ rows, total }`。
- 服务端分页由组件内部维护，业务只通过 `params` 传筛选条件。
- 列可以由业务显式传入，也可以从 schema 字段自动推导。
- 列支持 `presets`：按 key 统一标题、宽度、对齐、省略和固定列，和表单 presets 一样“定义一次，多处复用”。
- 行内动作通过回调交给路由；组件不假设 Router 实现。
- 删除支持两种入口：列表行内删除，或详情页 `SchemaCrudForm` 删除。
- 列表加载、空数据、接口错误、分页请求竞态都有明确状态。
- 示例使用 React Router，把列表、新建、详情、编辑四个页面串起来。

## 非目标

- 不做路由、菜单、面包屑。
- 不做内置 Drawer / Modal。
- 不做搜索表单；筛选条件由业务通过 `params` 传入。
- 不做批量选择、批量删除、拖拽、列设置、导出。
- 不做前端排序、前端过滤、前端分页。
- 不做请求缓存、React Query / SWR、乐观更新。
- 不做全局 toast；成功和失败提示由业务的 `onSuccess` / `onError` 处理。
- 不给列表增加独立的全局配置函数；第一版复用 `configureSchemaCrudForm` 的详情默认值。

## 数据契约

### 请求

```ts
interface CrudListParams {
  page: number;
  size: number;
  [key: string]: any;
}
```

组件固定发送：

```ts
nx.$api.posts_index({
  page: 2,
  size: 10,
  ...params,
});
```

`page`、`size` 由组件控制，`params` 不允许覆盖它们。

### 响应

```ts
interface CrudListResult<TRecord> {
  rows: TRecord[];
  total: number;
}
```

约定：

- `rows` 必须是数组。
- `total` 必须是有限数字。
- 结构不符时组件显示明确的接口错误，不把异常数据塞进 Table。
- 组件不拆 `data.data`、`data.rows` 等外层包裹；外层解包属于 API 适配层，`nx.$api.xx_index` 应当已经返回固定结构。

## API

### 组件名

新增导出：

```ts
export {
  SchemaCrudForm,
  SchemaCrudList,
} from '@jswork/antd-form-schema-crud';
```

命名成对：`SchemaCrudForm` 负责一条记录，`SchemaCrudList` 负责一个资源列表。原 `SchemaCrud` 改名为 `SchemaCrudForm`，不保留旧名。

### 类型

```ts
import type { Key, ReactNode } from 'react';
import type { TableProps } from 'antd';
import type { FormSchema } from '@jswork/antd-form-schema';

export interface CrudListResult<TRecord = CrudRecord> {
  rows: TRecord[];
  total: number;
}

export interface CrudListParams {
  page: number;
  size: number;
  [key: string]: any;
}

export interface CrudApi<TRecord = CrudRecord> {
  index?: (params: CrudListParams) => Promise<CrudListResult<TRecord>>;
  show?: (params: { id: CrudId }) => Promise<TRecord>;
  create?: (values: CrudValues) => Promise<unknown>;
  update?: (values: CrudValues & { id: CrudId }) => Promise<unknown>;
  destroy?: (params: { id: CrudId }) => Promise<unknown>;
}

export interface ListActions {
  create?: false | CrudActionConfig;
  refresh?: false | CrudActionConfig;
  view?: false | CrudActionConfig;
  edit?: false | CrudActionConfig;
  delete?: false | CrudActionConfig;
}

export interface ListPresetField {
  title?: ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  ellipsis?: boolean;
  fixed?: 'left' | 'right';
}

export interface ListPresetsInput {
  fields?: Record<string, ListPresetField>;
}

/** 分区写法，或扁平的 key -> 标题映射。 */
export type ListPresets = ListPresetsInput | Record<string, string>;

export interface SchemaCrudListProps<TRecord extends CrudRecord = CrudRecord> {
  resource?: string;
  schema: FormSchema;
  api?: CrudApi<TRecord>;

  title?: ReactNode | false;
  /** 列展示预设；按 key 提供 title / width / align / ellipsis / fixed。 */
  presets?: ListPresets;
  /** 显式列定义；不传时从 schema 字段推导。 */
  columns?: TableProps<TRecord>['columns'];
  rowKey?: keyof TRecord | ((record: TRecord) => Key);

  /** 业务筛选条件，和 page / size 一起发送。 */
  params?: Record<string, any>;
  pageSize?: number;

  actions?: ListActions;
  confirmDelete?: boolean;
  tableProps?: Omit<
    TableProps<TRecord>,
    'columns' | 'dataSource' | 'pagination' | 'rowKey' | 'loading'
  >;

  onCreate?: () => void;
  onView?: (record: TRecord) => void;
  onEdit?: (record: TRecord) => void;
  /** 列表行删除成功后触发；component 已自动刷新当前页。 */
  onSuccess?: (event: CrudSuccessEvent) => void;
  onError?: (error: unknown, action: CrudAction) => void;
  /** 列表页本身的返回。 */
  onBack?: () => void;

  className?: string;
}
```

公开导出：`CrudListResult`、`CrudListParams`、`ListActions`、`ListPresetField`、`ListPresetsInput`、`ListPresets`、`SchemaCrudListProps`。

### 列 presets

列表的 `presets` 只描述“列怎么显示”，不改变表单的 `widget` / `label`：

```ts
const postListPresets: ListPresets = {
  fields: {
    title: { title: '标题', width: 280, ellipsis: true },
    status: { title: '状态', width: 96, align: 'center' },
    is_sticky: { title: '置顶', width: 80, align: 'center' },
  },
};
```

也接受扁平标题表：

```ts
const postListPresets = {
  title: '标题',
  status: '状态',
  is_sticky: '置顶',
};
```

合并规则：

1. 显式 `columns` 优先。
2. `presets` 次之。
3. `schema.fields` 的 `label` 再次。
4. 最后回退到字段 `key`。

具体行为：

- 传 `columns` 时，只对 `dataIndex` 是字符串的列做属性级合并；列自己写了 `title / width / align / ellipsis / fixed` 就保留，缺的才用 presets 补。
- 不传 `columns` 时，从 `schema.fields` 生成列，标题优先取 presets，其次取字段 `label`。
- presets 不创建列：schema 里没有的字段，不会因为 presets 多出一列。
- 操作列不受 presets 影响。
- presets 只做展示元数据；自定义单元格、排序、筛选仍用显式 `columns`。

### 动作显示规则

`actions` 只控制“要不要显示”，回调决定“点了去哪”：

- 新建按钮：`actions.create !== false` 且传了 `onCreate`。
- 查看入口：`actions.view !== false` 且传了 `onView`。
- 编辑入口：`actions.edit !== false` 且传了 `onEdit`。
- 删除入口：`actions.delete !== false` 且解析到了 `destroy`。
- 刷新按钮：`actions.refresh !== false`，默认显示。
- 返回按钮：传了 `onBack`，默认显示。

`actions.view = false` 时整行点击也关闭，避免出现“看不到查看按钮但点行仍跳转”的隐藏行为。

### 默认值

```ts
const defaults = {
  pageSize: 10,
  rowKey: 'id',
  confirmDelete: true,
};
```

### 常用接入

```tsx
<SchemaCrudList
  resource="posts"
  schema={postSchema}
  title="文章"
  presets={postListPresets}
  onCreate={() => navigate('/posts/new')}
  onView={(record) => navigate(`/posts/${record.id}`)}
  onEdit={(record) => navigate(`/posts/${record.id}/edit`)}
  onBack={() => navigate('/')}
/>
```

`nx.$api` 仍需提供固定命名的接口：

```ts
nx.set(nx, '$api', {
  posts_index: async ({ page, size, keywords }) => ({ rows, total }),
  posts_show: async ({ id }) => record,
  posts_create: async (values) => record,
  posts_update: async ({ id, ...values }) => record,
  posts_destroy: async ({ id }) => result,
});
```

### 带筛选和自定义列

```tsx
<SchemaCrudList
  resource="posts"
  schema={postSchema}
  title="文章"
  params={{ keywords, status }}
  pageSize={20}
  columns={[
    { title: 'ID', dataIndex: 'id', width: 72 },
    { title: '标题', dataIndex: 'title' },
    { title: '状态', dataIndex: 'status' },
  ]}
  rowKey="id"
  onCreate={() => navigate('/posts/new')}
  onView={(record) => navigate(`/posts/${record.id}`)}
/>
```

## 列表 UI

### 标题

- `title="文章"` → “文章列表”。
- `title` 不传 → “记录列表”。
- `title={false}` → 不渲染标题主体；如果仍有 `extra` 动作，Card 头部保留动作区。

### Card

`Card.extra` 依次放：

1. `actions.create !== false` 且有 `onCreate`：新建按钮。
2. `actions.refresh !== false`：刷新按钮。
3. 有 `onBack`：返回按钮。

Card 内容：

- 加载中用 `Spin` 包住 Table，保留表格布局。
- 加载失败显示 `Alert + 重试`。
- 空数据走 Ant Design 默认空状态。
- 表格默认 `bordered`、`size="middle"`。
- 分页固定服务端模式：`current`、`pageSize`、`total`，默认显示 pageSize changer。

### 列

优先级：

1. 业务传 `columns`，逐列使用；缺省的展示属性由 `presets` 补。
2. 不传 `columns`，从 `schema.fields` 推导：
   - 跳过 `hidden: true` 的字段；
   - 跳过带 `condition` 的字段，避免把条件字段直接当静态列；
   - 跳过既没有 `label`、也没有 presets 标题的字段；
   - 标题取 presets 标题，其次取 `label`；
   - `dataIndex` 取 `key`；
   - `width / align / ellipsis / fixed` 从 presets 取；
   - `options` 存在时，把值映射成 option label；否则直接显示原值。

不论哪种方式，最后都追加操作列：

- 查看：调用 `onView(record)`。
- 编辑：调用 `onEdit(record)`。
- 删除：`Popconfirm` 后调用 `destroy`，成功后刷新当前页。

### 分页

- 初始 `page=1`，`pageSize` 默认 10。
- 修改 page 或 pageSize 直接重新请求。
- `params` 变化时回到第 1 页再请求。
- 删除后刷新当前页；如果当前页变成空页且 `page > 1`，自动 `page - 1` 再请求。
- 请求竞态：只接受最后一次请求的响应，旧响应丢弃。

### 删除

列表行删除：

```ts
await api.destroy({ id });
await reloadListAfterDelete();
```

详情页删除继续复用 `SchemaCrudForm` 的底部删除按钮和确认逻辑。两处都触发 `onSuccess({ action: 'delete', result })`。

### 错误

- `index` 失败：列表内 `Alert`，带重试；同时调用 `onError(error, 'load')`。
- `index` 返回结构不符：抛出可读错误“posts_index 返回结构必须是 { rows, total }”，不进 Table。
- 行删除失败：`Alert` 或业务 `onError(error, 'delete')`，不刷新列表。

## 多页面路由

### 路由表

示例新增：

```text
/posts            列表
/posts/new        新建
/posts/:id        详情
/posts/:id/edit   编辑
```

### 列表页

```tsx
<SchemaCrudList
  resource="posts"
  schema={postSchema}
  title="文章"
  presets={postListPresets}
  onCreate={() => navigate('/posts/new')}
  onView={(record) => navigate(`/posts/${record.id}`)}
  onEdit={(record) => navigate(`/posts/${record.id}/edit`)}
/>
```

### 新建页

```tsx
<SchemaCrudForm
  resource="posts"
  schema={postSchema}
  title="文章"
  onBack={() => navigate('/posts')}
  onSuccess={(event) => {
    if (event.action === 'create') {
      const record = event.result as PostRecord | undefined;
      navigate(record?.id == null ? '/posts' : `/posts/${record.id}`);
    }
  }}
/>
```

`id` 为空时，`SchemaCrudForm` 自动进入创建态。

### 详情页

```tsx
<SchemaCrudForm
  resource="posts"
  schema={postSchema}
  id={id}
  title="文章"
  onBack={() => navigate('/posts')}
  onSuccess={(event) => {
    if (event.action === 'delete') navigate('/posts');
  }}
/>
```

不传 `mode`，所以详情页默认预览，点击编辑在组件内部切换到编辑态。

### 编辑页

编辑页需要直接进入编辑态，因此使用受控 `mode="edit"`：

```tsx
<SchemaCrudForm
  resource="posts"
  schema={postSchema}
  id={id}
  mode="edit"
  title="文章"
  onBack={() => navigate('/posts')}
  onModeChange={(nextMode) => {
    if (nextMode === 'view') navigate(`/posts/${id}`);
  }}
/>
```

保存成功或取消编辑时，`SchemaCrudForm` 会请求切到 `view`，这里把路由导航到详情页。

## 组件拆分

新增文件建议：

```text
packages/lib/src/
├── api/resolve-api.ts           # 增加 index 解析
├── types.ts                     # CrudListParams / CrudListResult / ListActions
├── components/
│   ├── schema-crud-list.tsx     # Card + Table + 分页 + 行操作
│   └── schema-crud.tsx          # 复用，不改职责
├── hooks/
│   ├── use-crud-list.ts         # index 请求、分页、竞态、删除回退
│   └── use-crud-columns.ts      # 显式列 / presets / schema 推导列 + 操作列
└── utils/
    └── list.ts                  # 响应校验、option label 映射
```

职责：

- `use-crud-list`：只处理 `index` 请求和分页状态，不碰表单。
- `use-crud-columns`：合并显式列、presets 和 schema 字段，只生成列定义，不请求数据。
- `SchemaCrudList`：纯列表 UI 和行级动作，不做路由。
- `SchemaCrudForm`：保持现状，不新增列表逻辑。

## 与现有能力的关系

- `schema` 同时驱动表单、预览和列表默认列。
- 列表 `presets` 是独立的列展示配置，不改变 `SchemaForm` 的 `label` / `widget`。
- `resource` 同时驱动五个接口名：`index/show/create/update/destroy`。
- `configureSchemaCrudForm` 的 `title / confirmDelete / actions / formProps` 仍作用于详情页的 `SchemaCrudForm`，不影响列表动作。
- 未保存判断、删除确认、底部按钮继续由 `SchemaCrudForm` 负责，不在列表层重复实现。
- 第一版不给 `SchemaCrudList` 增加独立的全局配置函数。

## 示例改造

`packages/example/src/pages/posts/index.tsx` 改为列表页，只渲染 `SchemaCrudList`。

新增页面：

```text
packages/example/src/pages/posts/
├── index.tsx          # 列表
├── create.tsx         # 新建
├── detail.tsx         # 详情
├── edit.tsx           # 编辑
├── list-presets.ts    # 列展示 presets
```

删除页面里的手写逻辑：

- `use-post-list.ts`
- `activeId`、`loadList`、`handleSuccess`、`Select`
- 条件渲染的加载 Card 和 `PostSummary`

保留：

- `postsApi`，其中 `posts_index` 已经返回 `{ rows, total }`。
- `postSchema`。
- 新增 `list-presets.ts`，集中维护列标题、宽度和对齐。

```ts
import type { ListPresets } from '@jswork/antd-form-schema-crud';

export const postListPresets: ListPresets = {
  fields: {
    title: { title: '标题', width: 280, ellipsis: true },
    subtitle: { title: '副标题', width: 240, ellipsis: true },
    status: { title: '状态', width: 96, align: 'center' },
    is_sticky: { title: '置顶', width: 80, align: 'center' },
  },
};
```

`PageHeader` 可以保留在页面外层。

`app.tsx` 引入 `react-router-dom`：

```tsx
<BrowserRouter>
  <Routes>
    <Route path="/posts" element={<PostsListPage />} />
    <Route path="/posts/new" element={<PostCreatePage />} />
    <Route path="/posts/:id" element={<PostDetailPage />} />
    <Route path="/posts/:id/edit" element={<PostEditPage />} />
  </Routes>
</BrowserRouter>
```

## 验收

### 功能

- 初始化自动请求 `posts_index({ page: 1, size: 10 })`。
- 翻页、修改 pageSize、修改 params 都会发正确 payload。
- 快速翻页时旧响应不会覆盖新响应。
- 新建、查看、编辑、返回列表的路由跳转正常。
- 新建成功后按约定进入详情或列表。
- 详情删除、编辑页保存、取消编辑都回到正确路由。
- 行内删除走 `posts_destroy`，成功后刷新当前页。
- 删除当前页最后一条会回退一页。
- `actions` 能隐藏对应按钮和操作列。
- 显式 columns 和 schema 推导 columns 都正确。
- presets 能补齐列展示属性，显式 columns 已写的属性不被覆盖。
- presets 不会为 schema 中不存在的字段创建列。
- `xx_index` 结构不合法时显示接口错误，不渲染脏数据。

### 类型与构建

- `tsc --noEmit` 通过。
- `vitest` 覆盖上述关键路径。
- `tsup` 通过。
- example `tsc` 和 `vite build` 通过。

## 版本与兼容

- 给 `CrudApi` 增加可选 `index`，不破坏现有调用。
- 原 `SchemaCrud` 改名为 `SchemaCrudForm`；`2.0.0` 尚未发布，不保留旧名别名。
- 新增 `SchemaCrudList`，不修改 `SchemaCrudForm` props。
- 列表能力按 `2.x` 发布。

## 待确认

1. 行内删除默认开启，还是默认只在详情里删除？推荐默认开启，但保留 `Popconfirm`。
2. 不传 `columns` 时从 schema 推导列表列，是否接受？推荐接受，显式 `columns` 仍然优先。
3. 示例使用 `react-router-dom` 的 `BrowserRouter + Routes`，路由按 `/posts`、`/posts/new`、`/posts/:id`、`/posts/:id/edit` 组织，是否接受？
4. 列 presets 只收敛 `title / width / align / ellipsis / fixed`，不包含 `render`，是否接受？推荐接受，复杂单元格继续用显式 `columns`。
