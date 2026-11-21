# SchemaCrud 通用创建 / 编辑 / 预览组件设计

日期：2026-11-21
状态：待评审
关系：依赖 `@jswork/antd-form-schema` 负责字段渲染、校验、presets、converters 和 `Descriptions` 查看态；本包只负责资源生命周期和通用操作界面。

## 意图

业务接口通常是一组固定命名的资源方法：

```ts
nx.$api.users_show({ id });
nx.$api.users_create(values);
nx.$api.users_update({ id, ...values });
nx.$api.users_destroy({ id });
```

页面里真正重复的不是表单字段，而是这套流程：

- 创建：空表单 → 提交 create；
- 编辑：拉取 show → 回填 → 提交 update；
- 预览：拉取 show → 用 `Descriptions` 展示；
- 删除：确认 → 调用 destroy；
- 加载中、加载失败、提交中、删除中、缺 id、缺 API 的统一处理。

目标是把这套流程收进一个受控组件：**同一份 `FormSchema`，通过 `mode` 在创建/编辑表单和预览详情之间切换，自动调用资源 API，但不接管路由、列表和页面框架。**

## 一句话边界

**`SchemaCrud` 只根据 `mode`、`id`、`schema` 和一组 `show/create/update/destroy` API 渲染一块可操作的资源区域；路由跳转、模式切换和列表页仍由业务页面控制。**

## 目标

- 支持 `create` / `edit` / `view` 三种模式。
- 复用 `SchemaForm` 渲染创建和编辑表单。
- 复用 `SchemaForm` 的 `viewMode` / `Descriptions` 渲染预览态。
- 支持默认 `resource` 命名解析：`${resource}_show` 等。
- 支持直接传 `api`，覆盖默认解析或适配嵌套资源接口。
- `edit` / `view` 自动调用 `show`，加载完成后才挂载表单，避免 `initialValues` 丢失。
- 创建、更新、删除分别有独立 loading，防止重复提交。
- 删除默认二次确认。
- 加载失败可重试；提交失败保留表单内容并显示错误。
- schema 不被修改，组件内部只生成合并后的副本。
- 不新增数据请求库依赖，使用普通 `useEffect` + 请求序号防止过期响应。

## 非目标

- 不做资源列表、分页、筛选、表格；这些属于 `react-ant-resource-list` 一类组件。
- 不做路由、菜单、面包屑和页面权限。
- 不做 Modal / Drawer 变体；v1 只提供内联组件，业务可以自行包 Modal。
- 不做 React Query / SWR 缓存、失效和乐观更新。
- 不接管 `mode` 切换。创建成功后是否跳转到详情页由 `onCreated` 决定。
- 不支持异步 `FormSchema`；v1 只接收同步 schema。
- 不做字段级权限。只提供整个操作按钮级别的 `canEdit` / `canDelete`。
- 不做自动 i18n；默认为中文文案，通过 `actions.*.text` 覆盖。

## API

### 基础类型

```ts
export type CrudMode = 'create' | 'edit' | 'view';
export type CrudId = string | number;

export interface CrudApi<TRecord = Record<string, any>> {
  show?: (params: { id: CrudId }) => Promise<TRecord>;
  create?: (values: Record<string, any>) => Promise<unknown>;
  update?: (values: Record<string, any> & { id: CrudId }) => Promise<unknown>;
  destroy?: (params: { id: CrudId }) => Promise<unknown>;
}
```

### 组件 props

```ts
export interface SchemaCrudProps<TRecord = Record<string, any>> {
  mode: CrudMode;
  schema: FormSchema;
  resource?: string;
  id?: CrudId;
  api?: CrudApi<TRecord>;

  createInitialValues?: Record<string, any>;
  mapRecord?: (record: TRecord) => Record<string, any>;
  beforeSubmit?: (
    values: Record<string, any>,
    ctx: { mode: CrudMode; id?: CrudId }
  ) => Record<string, any> | Promise<Record<string, any>>;

  title?: ReactNode;
  extra?: ReactNode;
  footer?: ReactNode | false;
  actions?: CrudActions;

  canEdit?: boolean;
  canDelete?: boolean;
  deleteConfirm?: false | PopconfirmProps;

  onEdit?: (record: TRecord) => void;
  onCancel?: () => void;
  onCreated?: (result: unknown, values: Record<string, any>) => void;
  onUpdated?: (result: unknown, values: Record<string, any>) => void;
  onDeleted?: (result: unknown) => void;
  onError?: (error: unknown, action: CrudAction) => void;
  onFormReady?: (form: FormInstance) => void;

  formProps?: Omit<
    ComponentProps<typeof SchemaForm>,
    'meta' | 'initialValues' | 'onFinish' | 'children' | 'onFormReady'
  >;
  className?: string;
  style?: CSSProperties;
}
```

### 操作配置

```ts
export type CrudAction = 'load' | 'create' | 'update' | 'delete';

export interface CrudActionConfig {
  text?: ReactNode;
  props?: ButtonProps;
}

export interface CrudActions {
  submit?: false | CrudActionConfig;
  cancel?: false | CrudActionConfig;
  edit?: false | CrudActionConfig;
  delete?: false | CrudActionConfig;
}
```

`false` 表示隐藏该按钮；不传表示使用当前模式的默认按钮。

### API 解析

`api` 优先；没有传的 action 再从 `resource` 解析：

```ts
const resolvedApi = {
  show: api?.show ?? nx.$api[`${resource}_show`],
  create: api?.create ?? nx.$api[`${resource}_create`],
  update: api?.update ?? nx.$api[`${resource}_update`],
  destroy: api?.destroy ?? nx.$api[`${resource}_destroy`],
};
```

默认调用约定：

```ts
show({ id });
create(values);
update({ id, ...values });
destroy({ id });
```

如果接口需要 `{ id, data: values }`、嵌套 `family_user_id` 或其他参数，用 `api` 显式传入适配后的方法，不把特殊协议塞进组件。

### 资源必填规则

- 创建需要 `create`。
- 编辑需要 `show` + `update`。
- 预览需要 `show`。
- 删除需要 `destroy`。
- `edit` / `view` 必须有 `id`。
- `resource` 和 `api` 至少要有一个。
- 当前模式缺少必需方法时渲染错误提示，不发请求。
- `destroy` 是可选动作：缺失时不显示删除按钮，不影响创建/编辑/预览主流程。

## 渲染结构

```tsx
<div data-component="antd-form-schema-crud" className={...}>
  {(title || extra) && (
    <header className="antd-form-schema-crud__header">
      <div>{title}</div>
      <div>{extra}</div>
    </header>
  )}

  <main className="antd-form-schema-crud__body">
    {loadError ? <Alert ... /> : null}
    {loading ? <Spin /> : null}
    {ready ? <SchemaForm ... /> : null}
  </main>

  <footer className="antd-form-schema-crud__footer">
    {footer === false ? null : footer ?? defaultActions}
  </footer>
</div>
```

默认不强制页面标题；传 `title` 才渲染头部。`footer` 传 ReactNode 时完全接管默认操作区。

## 模式行为

### create

1. 不调用 `show`。
2. 初始值：

```ts
const initialValues = {
  ...schema.initialValues,
  ...createInitialValues,
};
```

3. 渲染编辑态 `SchemaForm`。
4. 提交时调用 `beforeSubmit`，再调用 `create(values)`。
5. 成功后触发 `onCreated(result, values)`，不自动切换 mode。

默认操作：`取消`、`创建`。

### edit

1. 要求 `id` 和 `show`。
2. 调用 `show({ id })`。
3. 记录数据经过 `mapRecord` 后，与 `schema.initialValues` 合并：

```ts
const initialValues = {
  ...schema.initialValues,
  ...mapRecord(record),
};
```

4. 数据就绪后才挂载 `SchemaForm`，避免首次挂载时 initialValues 为空。
5. 提交时调用 `beforeSubmit`，再调用 `update({ id, ...values })`。
6. 成功后触发 `onUpdated(result, values)`。

默认操作：`取消`、`删除`、`保存`。

### view

1. 要求 `id` 和 `show`。
2. 调用 `show({ id })`。
3. 渲染 schema 副本并强制 `viewMode: true`：

```ts
const viewSchema = {
  ...schema,
  viewMode: true,
  initialValues,
};
```

4. 预览态仍使用 `SchemaForm`，因此 `Descriptions`、`viewSpan`、`viewWidget`、converter `read`、option label 和 hidden 字段提交语义全部复用。
5. 不存在提交动作。

默认操作：左侧 `删除`，右侧 `返回`、`编辑`。

- `编辑` 只在 `canEdit` 且传了 `onEdit` 时显示。
- `删除` 只在 `canDelete` 且 `destroy` 可用时显示。
- `返回` 只在传了 `onCancel` 时显示。

## 加载与错误

### show 加载

- `loading` 时渲染 `Spin`，不挂载表单。
- 错误时渲染 `Alert type="error"`，附带“重试”按钮。
- `loading` 或加载失败时，默认操作区只保留“取消”（如果传了 `onCancel`），不显示提交和删除。
- 加载期间根节点带 `aria-busy="true"`。
- 每次加载递增请求序号；`id` 变化或组件卸载后，旧响应直接丢弃。
- 不使用 AbortController，因为 `nx.$api` 不一定支持取消；请求序号足够避免过期数据覆盖。

### 提交 / 删除

- `submitLoading`、`deleteLoading` 分开维护。
- 提交时禁用提交和删除；删除时禁用提交和删除。
- 提交失败保留表单值，清空 loading，并在操作区上方显示错误 `Alert`。
- 删除失败保留当前页面，同样显示错误。
- 所有错误都调用 `onError(error, action)`，父级可以上报或弹全局提示。

### 删除确认

默认使用 `Popconfirm`：

```tsx
<Popconfirm title="确定删除这条记录？" onConfirm={handleDelete}>
  <Button danger>删除</Button>
</Popconfirm>
```

`deleteConfirm={false}` 跳过确认；传对象则透传 `PopconfirmProps`，例如自定义标题或确认按钮文案。

## 表单与 schema 合并

组件绝不修改传入的 `schema`，只创建浅副本：

```ts
const resolvedSchema: FormSchema = {
  ...schema,
  initialValues,
  viewMode: mode === 'view',
};
```

说明：

- `mode` 是查看/编辑的唯一决定者。`create` / `edit` 强制编辑态，`view` 强制查看态，schema 里原有的 `viewMode` 被覆盖。
- `schema.view` 原样保留；不写时由 `antd-form-schema` 使用默认 `column: 2`、`bordered: true`、`size: 'small'`。
- 表单重新挂载 key 使用 `mode:id:reloadVersion`，确保 id 或重新加载后 initialValues 会重新生效。
- 传 `onFormReady` 可以拿到内部 Form 实例，供自定义 `footer` 调用 `form.submit()`。

## 默认操作按钮

| 模式   | 左侧 | 右侧       |
| ------ | ---- | ---------- |
| create | 取消 | 创建       |
| edit   | 删除 | 取消、保存 |
| view   | 删除 | 返回、编辑 |

- 删除按钮使用 `danger`。
- 保存/创建按钮使用 `type="primary"`。
- 创建/保存按钮 `htmlType="button"`，点击后调用内部 form 实例的 `submit()`，由 `SchemaForm` 的 `onFinish` 统一处理。
- 通过 `actions.submit.props` 可以改按钮属性，例如 `block`、`size`。
- 自定义 `footer` 时，默认按钮全部不渲染。

## 样式

根节点固定 `data-component="antd-form-schema-crud"`，class 结构：

```text
.antd-form-schema-crud
.antd-form-schema-crud__header
.antd-form-schema-crud__body
.antd-form-schema-crud__footer
```

只写布局级样式：

- header 左右分布；
- body 纵向间距；
- footer 右对齐、按钮间距 8px；
- 不覆盖 Ant Design 表单和 `Descriptions` 内部样式。

## 依赖与包配置

- `@jswork/antd-form-schema` 保持运行时依赖。
- `antd` 应加入 `peerDependencies`，因为组件直接使用 `Button`、`Alert`、`Spin`、`Popconfirm`。
- 不新增图标依赖；按钮先用纯文字，后续需要图标再加。
- 不新增 React Query、SWR 或请求库依赖。

## 使用示例

### 编辑

```tsx
<SchemaCrud
  mode="edit"
  resource="users"
  id={user.id}
  schema={userSchema}
  onCancel={() => navigate(-1)}
  onUpdated={() => navigate(`/users/${user.id}`)}
  onDeleted={() => navigate('/users')}
/>
```

### 创建

```tsx
<SchemaCrud
  mode="create"
  resource="users"
  schema={userSchema}
  createInitialValues={{ status: 'active' }}
  onCancel={() => navigate(-1)}
  onCreated={(_, values) => navigate(`/users/${values.id}`)}
/>
```

### 预览

```tsx
<SchemaCrud
  mode="view"
  resource="users"
  id={user.id}
  schema={userSchema}
  canDelete={false}
  onEdit={() => navigate(`/users/${user.id}/edit`)}
  onCancel={() => navigate('/users')}
/>
```

### 自定义 API

```tsx
<SchemaCrud
  mode="edit"
  id={log.id}
  schema={logSchema}
  api={{
    show: ({ id }) => nx.$api.health_logs_show({ family_user_id: familyUserId, id }),
    update: ({ id, ...values }) =>
      nx.$api.health_logs_update({
        family_user_id: familyUserId,
        id,
        ...values,
      }),
    destroy: ({ id }) => nx.$api.health_logs_destroy({ family_user_id: familyUserId, id }),
  }}
/>
```

## 测试计划

### 单元 / 组件测试

1. `create` 不调用 `show`，提交调用 `create`，`beforeSubmit` 生效。
2. `edit` 调用 `show({ id })`，数据回填，提交调用 `update({ id, ...values })`。
3. `view` 调用 `show`，渲染 `Descriptions`，不显示提交按钮。
4. `resource` 能解析 `nx.$api.${resource}_*`，`api` 能按 action 覆盖。
5. 缺少 `id` 或必需 API 时渲染错误，不发请求。
6. 删除默认弹确认，确认后调用 `destroy`；`deleteConfirm={false}` 直接调用。
7. show 加载失败显示重试；重试成功后恢复表单。
8. 提交失败保留表单值，loading 复位，并触发 `onError`。
9. `id` 快速切换时旧响应不覆盖新数据。
10. 传入 schema 不被修改，尤其 `viewMode` 不被永久改成 true。
11. `footer={false}` 不渲染操作区；自定义 footer 接管按钮。
12. 自定义 API 覆盖默认解析。

### 示例

- `basic`：本地 mock API 演示创建、编辑、预览切换。
- `custom-api`：覆盖默认 API 和 update payload。
- `view-only`：只读详情，隐藏删除/编辑。

## 待确认

1. 默认更新调用约定使用 `update({ id, ...values })`，是否符合现有接口习惯？
2. 预览态默认按钮是“编辑 / 删除 / 返回”，是否需要在编辑态也默认显示删除？
3. v1 是否需要支持预先传入 `record` 跳过 `show` 请求？当前设计不提供，避免两套数据来源。
