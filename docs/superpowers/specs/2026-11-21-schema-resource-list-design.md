# SchemaResource：资源列表与 CRUD 串联

日期：2026-11-21

状态：待确认

关系：在 `SchemaCrud` v2 之上增加一层资源页面能力。底层字段、表单、预览仍由 `@jswork/antd-form-schema` 和 `SchemaCrud` 负责，本文只定义列表、分页和页面级切换。

## 一句话边界

新增一个页面级组件 `SchemaResource`：只给 `resource + schema`，组件负责 `index` 列表、分页、新建、预览、编辑、删除，以及这些界面之间的返回和刷新；不负责路由、权限、搜索表单、请求缓存和弹层容器。

## 意图

`SchemaCrud` 已经解决了“一条记录”的创建、预览、编辑、删除，但业务页面仍然要自己维护：

- `xx_index` 请求；
- `page / size` 分页；
- 列表加载与错误；
- 列表行和当前记录的选中关系；
- 新建、详情、列表之间的跳转；
- 写操作后刷新列表。

参考项目 `react-ant-resource-list` 已经证明，`nx.$api.xx_index` 返回固定结构 `{ rows, total }`，列表本身可以高度标准化。这次把列表接进现有 CRUD，让一个页面只写 `resource + schema + 少量展示配置`。

## 参考项目审计

参考项目：`/Users/afei/github/react-ant-resource-list`。

### 值得吸收

- 根容器是 `Card`，标题在 `Card.title`，动作在 `Card.extra`。
- 列表接口固定调用 `{resource}_index`，payload 固定包含 `{ page, size }`。
- 响应固定为 `{ rows, total }`。
- 表格默认 `bordered`、`size="middle"`，底部服务端分页。
- 卡片头部有“新建、刷新、返回”这类资源级动作。
- 行内可以有查看、编辑、删除等操作列。

### 不照搬

- 不依赖 `@jswork/antd-components` 的 `AcTable`、`AcCardExtras`。
- 不做 `lang` / `module` / i18n。
- 不通过 `nx.$event` 跳转，页面切换留在组件内部。
- 不做 `paramsAdd`、`paramsEdit` 这类路由上下文参数。
- 不把列定义拆成 `columns / columnsFields / columnsAction` 三套 prop。
- 不做 `hasBack` 这种只有布尔值的动作开关，统一用 `actions.* = false` 隐藏。

## 目标

- `SchemaResource` 只写 `resource`、`schema`、`title` 就能跑通列表 + CRUD。
- `xx_index` 通过 `nx.$api` 自动解析，返回结构严格按 `{ rows, total }`。
- 服务端分页由组件内部维护，业务只通过 `params` 传筛选条件。
- 列表行可以进入 `SchemaCrud` 的预览 / 编辑；新建也复用同一个 `SchemaCrud`。
- 创建、更新、删除成功后自动刷新列表；删除当前页最后一条时自动回退一页。
- 列可以由业务显式传入，也可以从 schema 字段自动推导。
- 列表加载、空数据、接口错误、分页请求竞态都有明确状态。
- 不重复实现表单、预览、删除确认，全部复用 `SchemaCrud`。

## 非目标

- 不做路由、菜单、面包屑。
- 不做搜索表单；筛选条件由业务通过 `params` 传入。
- 不做 Drawer / Modal 容器；列表、新建、详情在同一个 Card 内切换。
- 不做批量选择、批量删除、行拖拽、列设置、导出。
- 不做前端排序、前端过滤、前端分页。
- 不做请求缓存、React Query / SWR、乐观更新。
- 不做全局 toast；成功和失败提示仍由业务的 `onSuccess` / `onError` 处理。
- 不做列表级别的全局配置函数；第一版复用 `configureSchemaCrud` 的详情默认值。

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

推荐新增导出：

```ts
export { SchemaResource } from '@jswork/antd-form-schema-crud';
```

`SchemaCrud` 保持“一条记录”的语义不变，`SchemaResource` 是“一个资源页面”的语义。

### 类型

```ts
import type { TableProps } from 'antd';
import type { ReactNode } from 'react';
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

export interface ResourceActions {
  create?: false | CrudActionConfig;
  refresh?: false | CrudActionConfig;
  view?: false | CrudActionConfig;
  edit?: false | CrudActionConfig;
  delete?: false | CrudActionConfig;
}

export interface SchemaResourceProps<TRecord extends CrudRecord = CrudRecord> {
  resource?: string;
  schema: FormSchema;
  api?: CrudApi<TRecord>;

  title?: ReactNode | false;
  /** 显式列定义；不传时从 schema 字段推导。 */
  columns?: TableProps<TRecord>['columns'];
  rowKey?: keyof TRecord | ((record: TRecord) => React.Key);

  /** 业务筛选条件，和 page / size 一起发送。 */
  params?: Record<string, any>;
  pageSize?: number;

  actions?: ResourceActions;
  confirmDelete?: boolean;
  tableProps?: Omit<
    TableProps<TRecord>,
    'columns' | 'dataSource' | 'pagination' | 'rowKey' | 'loading'
  >;
  formProps?: CrudFormProps;

  onSuccess?: (event: CrudSuccessEvent) => void;
  onError?: (error: unknown, action: CrudAction) => void;
  /** 列表页本身的返回；详情返回列表由组件内部处理。 */
  onBack?: () => void;

  className?: string;
}
```

### 默认值

```ts
const defaults = {
  pageSize: 10,
  rowKey: 'id',
  confirmDelete: true,
  actions: {
    create: true,
    refresh: true,
    view: true,
    edit: true,
    delete: true,
  },
};
```

### 常用接入

```tsx
<SchemaResource
  resource="posts"
  schema={postSchema}
  title="文章"
/>
```

`nx.$api` 只需提供固定命名的五个方法：

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
<SchemaResource
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
/>
```

### 显隐动作

```tsx
<SchemaResource
  resource="posts"
  schema={postSchema}
  title="文章"
  actions={{
    create: { text: '新建文章' },
    refresh: false,
    delete: false,
  }}
/>
```

## 页面与交互

### 三种界面

组件内部只有一个页面状态：

```ts
type ResourceScreen = 'list' | 'create' | 'detail';
```

- `list`：`Card + Table + Pagination`。
- `create`：`SchemaCrud`，不传 `id`。
- `detail`：`SchemaCrud`，传当前 `id`，预览态可切编辑。

不做 Drawer，不做路由跳转。这样列表和详情共享一个 Card 区域，返回路径最短。

### 列表标题

- `title="文章"` → “文章列表”。
- `title` 不传 → “记录列表”。
- `title={false}` → 不渲染标题主体。

### 列表 Card

`Card.extra` 依次放：

1. `actions.create !== false`：新建按钮。
2. `actions.refresh !== false`：刷新按钮。
3. `onBack` 存在：返回按钮。

`Card` 内容：

- 加载中用 `Spin` 包住 Table，保留表格布局。
- 加载失败显示 `Alert + 重试`。
- 空数据走 Ant Design 默认空状态。
- 表格默认 `bordered`、`size="middle"`。
- 分页固定服务端模式：`current`、`pageSize`、`total`，默认显示 pagesize changer。

### 列

优先级：

1. 业务传 `columns`，完全使用。
2. 不传 `columns`，从 `schema.fields` 推导：
   - 跳过 `hidden: true` 的字段；
   - 跳过没有 `label` 的字段；
   - 跳过带 `condition` 的字段，避免把条件字段直接当静态列；
   - 标题取 `label`，`dataIndex` 取 `key`；
   - `options` 存在时，把值映射成 option label；否则直接显示原值。

不论哪种方式，最后都追加操作列：

- 查看：进入 `detail`，默认预览态。
- 编辑：进入 `detail`，默认编辑态。
- 删除：`Popconfirm` 后调用 `destroy`，成功后刷新当前页。

`actions.view/edit/delete = false` 时隐藏对应行内动作。`actions.view = false` 时关闭整行点击进入详情，避免出现没有入口但点击仍有跳转。

### 分页

- 初始 `page=1`，`pageSize` 默认 10。
- 修改 page 或 pageSize 直接重新请求。
- `params` 变化时回到第 1 页再请求。
- 删除后刷新当前页；如果当前页变成空页且 `page > 1`，自动 `page - 1` 再请求。
- 请求竞态：只接受最后一次请求的响应，旧响应丢弃。

### 新建流程

1. 点击“新建” → `screen=create`。
2. 渲染 `SchemaCrud`，`id` 为空，`mode` 不传。
3. `SchemaCrud` 的创建成功事件透传给业务 `onSuccess`。
4. 如果 `event.result` 是对象且有 `id`，进入该记录的 `detail`；否则回到 `list`。
5. 无论进入详情还是列表，都刷新 `index`。

### 详情 / 编辑流程

1. 点击行或“查看” → `screen=detail`，`id` 为当前行。
2. `SchemaCrud` 内部负责预览 → 编辑 → 预览。
3. `SchemaCrud` 的“返回”回到 `list`，并刷新当前页。
4. 更新成功后：详情继续显示刷新后的记录；列表在后台重新请求。
5. 删除成功后：回到 `list`。

### 删除

列表行删除：

```ts
await api.destroy({ id });
await reloadListAfterDelete();
```

详情删除继续复用 `SchemaCrud` 的底部删除按钮和确认逻辑。两处都发同一个 `onSuccess({ action: 'delete', result })`。

### 错误

- `index` 失败：列表内 `Alert`，带重试；同时调用 `onError(error, 'load')`。
- `index` 返回结构不符：抛出可读错误“posts_index 返回结构必须是 { rows, total }”，不进 Table。
- `show/create/update/destroy` 失败：仍由 `SchemaCrud` 处理，`SchemaResource` 只负责透传 `onError`。

## 组件拆分

新增文件建议：

```text
packages/lib/src/
├── api/resolve-api.ts          # 增加 index 解析
├── types.ts                    # CrudListParams / CrudListResult / ResourceActions
├── components/
│   ├── schema-resource.tsx     # 页面状态、切换、事件
│   ├── schema-resource-list.tsx# Card + Table + 分页 + 行操作
│   └── schema-crud.tsx         # 复用，不改职责
├── hooks/
│   ├── use-crud-list.ts        # index 请求、分页、竞态、删除回退
│   └── use-crud-columns.ts     # 显式列 / schema 推导列 + 操作列
└── utils/
    └── list.ts                 # 响应校验、option label 映射
```

职责：

- `use-crud-list`：只处理 `index` 请求和分页状态，不碰表单。
- `use-crud-columns`：只生成列定义，不请求数据。
- `SchemaResourceList`：纯列表 UI。
- `SchemaResource`：`list / create / detail` 状态机和 `SchemaCrud` 接线。
- `SchemaCrud`：保持现状，不新增列表逻辑。

## API 解析

`resolveApi` 增加：

```ts
index: api?.index ?? fromResource('index')
```

`SchemaCrud` 仍只读取 `show/create/update/destroy`，不会因为 `index` 存在而改变行为。

## 与现有能力的关系

- `schema` 同时驱动表单、预览和列表默认列。
- `resource` 同时驱动五个接口名：`index/show/create/update/destroy`。
- `configureSchemaCrud` 的 `title / confirmDelete / actions / formProps` 仍作用于内嵌的 `SchemaCrud`。
- `SchemaResource` 自己的 `title / confirmDelete / formProps` 优先级高于全局默认值。
- 未保存判断、删除确认、底部按钮继续由 `SchemaCrud` 负责，不在列表层重复实现。
- 第一版不给 `SchemaResource` 增加独立的全局配置函数。

## 示例改造

目标：`packages/example/src/pages/posts/index.tsx` 缩到一个组件调用。

删除：

- `use-post-list.ts`
- `PostSummary` 的手写列表说明
- 页面里的 `activeId`、`loadList`、`handleSuccess`、`Select` 和条件 `Card`

替换为：

```tsx
<SchemaResource
  resource="posts"
  schema={postSchema}
  title="文章"
  pageSize={10}
/>
```

保留：

- `postsApi`，其中 `posts_index` 已经返回 `{ rows, total }`。
- `postSchema`。
- `PageHeader` 可以留在页面外层，也可以删掉。

## 验收

### 功能

- 初始化自动请求 `posts_index({ page: 1, size: 10 })`。
- 翻页、修改 pageSize、修改 params 都会发正确 payload。
- 快速翻页时旧响应不会覆盖新响应。
- 新建成功后按约定进入详情或列表，并刷新。
- 查看、编辑、返回列表正常。
- 详情删除、行内删除都走 `posts_destroy`，确认行为和 `SchemaCrud` 一致。
- 删除当前页最后一条会回退一页。
- `actions` 能隐藏对应按钮和操作列。
- 显式 columns 和 schema 推导 columns 都正确。
- `xx_index` 结构不合法时显示接口错误，不渲染脏数据。

### 类型与构建

- `tsc --noEmit` 通过。
- `vitest` 覆盖上述关键路径。
- `tsup` 通过。
- example `tsc` 和 `vite build` 通过。

## 版本与兼容

- 给 `CrudApi` 增加可选 `index`，不破坏现有调用。
- 新增 `SchemaResource`，不修改 `SchemaCrud` props。
- 按 `2.1.0` minor 发布。

## 待确认

1. 组件名用 `SchemaResource`，还是 `SchemaCrudList`？推荐 `SchemaResource`，因为它包含列表、新建和详情，不只是列表。
2. 新建成功后默认进入新记录详情，还是直接回列表？推荐有 `id` 时进详情，否则回列表。
3. 行内删除默认开启，还是默认只在详情里删除？推荐默认开启，但保留 `Popconfirm`。
4. 不传 `columns` 时从 schema 推导列表列，是否接受？推荐接受，显式 `columns` 仍然优先。
5. 列表、新建、详情在同一 Card 内切换，不做 Drawer，是否符合预期？推荐是。
