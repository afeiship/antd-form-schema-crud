# SchemaCrud v2：参考 UI 与简化 API

日期：2026-11-21

状态：已实现

关系：在 `2026-11-21-schema-crud-design.md` 的 v1 实现上做一次 API 收敛；底层字段能力仍由 `@jswork/antd-form-schema` 提供。

## 意图

v1 已经能完成创建、编辑、预览、删除，但页面接入成本偏高：一个典型页面要同时传 `mode`、`resource`、`schema`、`id`、`title`、`createInitialValues`、`beforeSubmit`、`extra`、`onCancel`、`onEdit`、`onCreated`、`onUpdated`、`onDeleted`、`onError`，还要自己在页面里维护 `mode`。

这次要解决两件事：

1. **UI 参考&#x20;**`react-ant-resource-form`：用 `Card` 作为统一壳，标题栏带返回和未保存标记，表单放进 `Spin`，操作按钮固定在底部。

2. **API 收敛**：只保留资源、数据、生命周期三类入口，把能从 schema 推导的配置全部收回 schema，把三个成功回调合并成一个 `onSuccess`，把模式切换收进组件内部，同时保留受控模式作为逃生口。

## 一句话边界

`SchemaCrud`**&#x20;仍然只负责一条记录：根据&#x20;**`resource + schema + id`**&#x20;渲染创建、预览或编辑，并处理 show/create/update/destroy；列表、路由、页面框架和弹层容器仍由业务控制。**

## 参考项目审计

参考项目：`/Users/afei/github/react-ant-resource-form`。

### 值得吸收的 UI

- 根容器是 `Card`，标题在 `Card.title`，操作在 `Card.extra`，不再额外维护一套 header。

- 标题自动区分新建 / 编辑，编辑态有橙色未保存标记。

- 顶部返回按钮使用 `ArrowLeftOutlined`，按钮尺寸偏小。

- 内容区统一包 `Spin`，加载时保留卡片结构，减少布局跳动。

- 底部按钮固定在表单下方：保存、返回；保存按钮在编辑态默认禁用，直到表单发生变化。

- 表单默认 `layout="vertical"`，视觉上比横向表单更适合业务详情页。

### 不照搬的 API

参考项目把很多能力塞进组件：`initGuard`、`submitGuard`、`transformRequest`、`transformResponse`、`payloadFields`、`onInit`、`onMutate`、`onTouchedChange`、`blocker`、`disableHotkeySave`、`disableBackWhenEdit`、`mute`、`lang`。这些能力确实有用，但会让一个 CRUD 组件的 API 面变成另一个表单框架。

v2 明确不引入：

- 不做路由 blocker：离开拦截属于路由层，组件不依赖 `react-router`。

- 不做 `history.back()`：返回行为由 `onBack` 注入，组件不假设宿主路由。

- 不做全局事件 `nx.$event.emit`：成功后统一走 `onSuccess`，由业务决定是否刷新列表。

- 不做 `lang` /i18n：默认中文，文案通过 `actions.*.text` 覆盖。

- 不做热键保存：需要时由业务在页面层监听。

- 不做 `payloadFields`：提交前裁剪字段优先用 `schema.normalizeValues`；协议差异用 `api` 适配。

- 不做 `initGuard` / `submitGuard`：请求前校验属于业务 API 适配层，不进入组件生命周期。

## 目标

- 常用接入只写 4 到 5 个 prop。

- 不传 `mode` 时，组件根据 `id` 自动决定创建或预览，并允许在组件内从预览切到编辑。

- 创建初始值、提交前转换优先使用 `schema.initialValues` 和 `schema.normalizeValues`，不再增加同义 prop。

- 成功回调合并为 `onSuccess(event)`，用 `event.action` 区分 create/update/delete。

- UI 统一为 Card 壳，标题、返回、未保存标记、底部操作由组件负责。

- 保留受控 `mode`、`api`、`actions`、`formProps` 作为进阶逃生口。

- 不改变底层表单渲染、schema 不污染、请求竞态丢弃这些既有约束。

## 非目标

- 不做列表、分页、筛选、表格。

- 不做 Modal / Drawer 内建容器。

- 不做字段级权限，按钮显隐通过 `actions.* = false` 控制。

- 不做请求缓存、乐观更新、React Query / SWR。

- 不做异步 schema。

- 不做内置 toast；成功 / 失败提示由业务在 `onSuccess` / `onError` 里处理。

- 不做未保存离开确认；只在编辑态显示未保存标记并禁用保存按钮。

## v2 API

### 基础类型

```
export type CrudMode = 'create' | 'view' | 'edit';
export type CrudId = string | number;
export type CrudAction = 'load' | 'create' | 'update' | 'delete';
export type CrudRecord = Record<string, any>;
export type CrudValues = Record<string, any>;

export interface CrudApi<TRecord = CrudRecord> {
  show?: (params: { id: CrudId }) => Promise<TRecord>;
  create?: (values: CrudValues) => Promise<unknown>;
  update?: (values: CrudValues & { id: CrudId }) => Promise<unknown>;
  destroy?: (params: { id: CrudId }) => Promise<unknown>;
}

export type CrudFormProps = Omit<
  ComponentProps<typeof SchemaForm>,
  'meta' | 'initialValues' | 'onFinish' | 'children' | 'onFormReady'
>;
```

### 组件 props

```
export interface CrudActionConfig {
  text?: ReactNode;
  props?: ButtonProps;
}

export interface CrudActions {
  /** 创建/保存按钮；false 隐藏。 */
  save?: false | CrudActionConfig;
  /** 创建态“取消”、编辑态“取消”、预览态“返回”；false 隐藏。 */
  cancel?: false | CrudActionConfig;
  /** 预览态“编辑”；false 隐藏。 */
  edit?: false | CrudActionConfig;
  /** 删除按钮；false 隐藏。 */
  delete?: false | CrudActionConfig;
}

export type CrudSuccessEvent =
  | { action: 'create'; result: unknown; values: CrudValues }
  | { action: 'update'; result: unknown; values: CrudValues }
  | { action: 'delete'; result: unknown };

export interface SchemaCrudProps<TRecord = CrudRecord> {
  /** 资源前缀，解析 `${resource}_show/create/update/destroy`。 */
  resource?: string;
  schema: FormSchema;
  /** 有 id 进入预览；没有 id 进入创建。 */
  id?: CrudId;
  /** 不传时组件内部管理；传入后变成受控模式。 */
  mode?: CrudMode;
  /** 显式 API，按 action 覆盖 resource 解析。 */
  api?: CrudApi<TRecord>;

  /** 卡片标题主体，默认“记录”。 */
  title?: ReactNode | false;
  /** 卡片右上角自定义内容，会排在返回按钮之前。 */
  extra?: ReactNode;
  actions?: CrudActions;
  /** 默认 true；false 时删除不弹确认。 */
  confirmDelete?: boolean;

  /** 默认 layout: 'vertical'。 */
  formProps?: CrudFormProps;

  onSuccess?: (event: CrudSuccessEvent) => void;
  /** 创建态取消、预览态返回。编辑态取消由组件内部回到预览。 */
  onBack?: () => void;
  /** 仅在受控 mode 下用于通知业务切换模式。 */
  onModeChange?: (mode: CrudMode) => void;
  onError?: (error: unknown, action: CrudAction) => void;

  className?: string;
  style?: CSSProperties;
}
```

### 常用接入

```
<SchemaCrud
  resource="posts"
  schema={postSchema}
  id={activeId}
  title="文章"
  onSuccess={handleSuccess}
  onBack={() => setActiveId(undefined)}
/>
```

创建初始值与提交前转换不再单独传 prop：

```
const postSchema: FormSchema = {
  initialValues: { status: 'draft', is_sticky: false },
  normalizeValues: (values) => ({
    ...values,
    title: String(values.title ?? '').trim(),
    subtitle: String(values.subtitle ?? '').trim(),
  }),
  fields: [...],
};
```

## API 简化对照

| v1                              | v2                            | 说明                                                     |
| ------------------------------- | ----------------------------- | -------------------------------------------------------- |
| `mode` 必填                     | `mode` 可选                   | 未传时由 `id` 推导；组件内部可从 view 进 edit            |
| `resource`                      | `resource`                    | 保留，避免无意义改名                                     |
| `createInitialValues`           | `schema.initialValues`        | 不再保留同义 prop                                        |
| `beforeSubmit`                  | `schema.normalizeValues`      | 同步转换收回 schema；异步转换改用 `api` 适配             |
| `mapRecord`                     | 删除                          | 在 `api.show` 或业务层完成映射，组件不维护第二套数据来源 |
| `onCreated/onUpdated/onDeleted` | `onSuccess(event)`            | 用 `event.action` 分发                                   |
| `onEdit`                        | 删除                          | 预览态 “编辑” 由组件内部切换到 edit                      |
| `onCancel`                      | `onBack`                      | 只表示离开当前记录；编辑态取消在组件内回预览             |
| `canEdit` / `canDelete`         | `actions.edit/delete = false` | 只保留一套按钮显隐配置                                   |
| `deleteConfirm`                 | `confirmDelete?: boolean`     | 不再透传整个 `PopconfirmProps`；需要复杂确认由业务包一层 |
| `footer`                        | 删除                          | 默认操作固定，按钮通过 `actions` 配置                    |
| `onFormReady`                   | 删除                          | v2 不暴露命令式 form；自定义操作不再由组件内 footer 承担 |
| —                               | `onModeChange`                | 仅受控模式需要                                           |

## 模式决定

```
const resolvedMode = mode ?? (id === undefined || id === null ? 'create' : 'view');
```

规则：

- `id` 为空 → `create`。

- `id` 有值且没有传 `mode` → `view`。

- 传 `mode` → 完全受控，组件不自行切换，只调用 `onModeChange` 请求切换。

- 未传 `mode` → 组件内部维护当前模式：

  - 预览态点 “编辑” → 内部切到 `edit`；

  - 编辑态点 “取消” 或保存成功 → 内部切回 `view`；

  - `id` 变化 → 重新按 `id` 推导。

- 删除成功后，未受控模式内部回到 `create`，等待业务设置下一条 `id` 或保持新建。

## UI 结构

```
<Card
  data-component="antd-form-schema-crud"
  title={titleView}
  extra={extraView}
  className={...}
>
  <Spin spinning={loading}>
    {error ? <Alert ... /> : null}
    {ready ? <SchemaForm ... /> : null}
    <footer className="antd-form-schema-crud__footer">
      {actions}
    </footer>
  </Spin>
</Card>
```

### 标题

`title` 是标题主体，不是完整标题：

| mode   | 渲染           |
| ------ | -------------- |
| create | `新建${title}` |
| view   | `${title}详情` |
| edit   | `编辑${title}` |

默认 `title = '记录'`。`title={false}` 时不渲染标题栏文字，但 `extra` 仍可显示。

编辑态且表单有变化时，标题后追加一个橙色圆点：

```
<span className="antd-form-schema-crud__dirty" aria-label="有未保存修改" />
```

### 右上角

`extra` 原样渲染，然后追加返回按钮。返回按钮只在 `onBack` 存在时显示：

```
<Button size="small" icon={<ArrowLeftOutlined />} onClick={handleBack}>
  返回
</Button>
```

- 预览态、创建态点击调用 `onBack`。

- 编辑态点击等同 “取消”：未受控时回到预览，受控时调用 `onModeChange('view')`。

- `actions.cancel === false` 时，标题栏返回按钮也隐藏，避免出现两套不一致的返回入口。

### 底部操作

| 模式   | 左侧 | 右侧       |
| ------ | ---- | ---------- |
| create | 取消 | 创建       |
| edit   | 删除 | 取消、保存 |
| view   | 删除 | 返回、编辑 |

- 保存 / 创建按钮 `type="primary"`，带 `SaveOutlined`。

- 编辑 / 删除按钮带 `EditOutlined` / `DeleteOutlined`。

- 删除默认 `Popconfirm`，`confirmDelete={false}` 时直接删除。

- 创建按钮在表单 ready 后可用；编辑保存按钮还要求表单有变化。

- 提交、删除期间互斥禁用。

- 加载失败或缺少 API 时，只保留取消 / 返回。

### 未保存状态

- 编辑态记录第一次加载完成后的表单值作为基线。

- `SchemaForm` 的 `onValuesChange` 触发后，用深比较判断是否变化。

- 变化时设置 `touched=true`，显示标题圆点，并启用保存按钮。

- 保存成功、重新加载、切换到预览后重置 `touched=false`。

- 创建态不做未保存判断，创建按钮始终可用。

使用 `fast-deep-equal` 做未保存判断，与参考项目行为一致。

### 加载与错误

- 首次 `show` 加载：`Spin` 包住卡片内容，保留标题栏和底部骨架。

- 加载失败：内容区显示 `Alert`，附 “重试” 按钮；底部只保留返回。

- 提交失败：保留表单值，在表单和底部操作之间显示错误 `Alert`。

- 删除失败：保留当前记录和模式，显示错误 `Alert`。

- 所有错误继续调用 `onError(error, action)`。

## 行为

### create

1. 不调用 `show`。

2. `initialValues` 直接使用 `schema.initialValues`。

3. 提交由 `SchemaForm` 先执行 `schema.normalizeValues`，再调用 `create(values)`。

4. 成功后触发：

```
onSuccess({ action: 'create', result, values });
```

1. 组件不自动设置新 id；业务拿到 `result` 后自行更新 `id` 或跳转。

### edit

1. 要求 `id` 和 `show`。

2. 调用 `show({ id })`，数据就绪后再挂载表单。

3. 提交调用 `update({ id, ...values })`。

4. 成功后触发 `onSuccess({ action: 'update', result, values })`。

5. 未受控时内部切回 `view`；受控时调用 `onModeChange('view')`，等业务更新 `mode`。

### view

1. 要求 `id` 和 `show`。

2. 复用 `SchemaForm` 的 `viewMode`，不显示保存按钮。

3. 点 “编辑”：未受控时内部切 `edit`；受控时调用 `onModeChange('edit')`。

4. 点 “返回”：调用 `onBack`。

### delete

1. 要求 `destroy` 和 `id`。

2. 默认确认后调用 `destroy({ id })`。

3. 成功后触发 `onSuccess({ action: 'delete', result })`。

4. 未受控时内部切到 `create`；业务负责设置下一条 `id`，没有下一条就保持新建。

## 必填规则

- `resource` 和 `api` 至少有一个。

- create 需要 `create`。

- view 需要 `id` + `show`。

- edit 需要 `id` + `show` + `update`。

- delete 需要 `destroy`；缺失时不显示删除按钮。

- 当前模式缺少必需条件时渲染 `Alert`，不发请求。

## 样式

根节点仍使用 `data-component="antd-form-schema-crud"`。v2 的 class 结构：

```
.antd-form-schema-crud           Card 根节点
.antd-form-schema-crud__body     表单/错误内容
.antd-form-schema-crud__footer   底部操作
.antd-form-schema-crud__dirty    未保存圆点
```

只写布局样式：

- footer 上边距 16px，左右分布，按钮间距 8px；

- dirty 圆点 6px，橙色；

- 不覆盖 Ant Design Card、Form、Descriptions 内部样式。

## 依赖

- `antd` 保持 peer dependency。
- 新增 `@ant-design/icons` peer dependency，用于返回 / 保存 / 编辑 / 删除图标。
- 新增 `fast-deep-equal` 依赖，用于未保存判断。
- 不新增路由、请求、i18n 依赖。

## 示例改造

v1 示例页面需要同时维护 `mode`、`refresh`、三个成功回调和分段控件。v2 示例收敛为：

```
<SchemaCrud
  resource="posts"
  schema={postSchema}
  id={activeId}
  title="文章"
  extra={
    <Space>
      <Select ... />
      <Button onClick={() => setActiveId(undefined)}>新建</Button>
    </Space>
  }
  onSuccess={handleSuccess}
  onBack={() => setActiveId(records[0]?.id)}
  onError={handleError}
/>
```

`handleSuccess` 统一处理：

```
const handleSuccess = async (event: CrudSuccessEvent) => {
  const rows = await loadList();
  if (event.action === 'create') {
    setActiveId((event.result as PostRecord).id);
  }
  if (event.action === 'delete') {
    setActiveId(rows[0]?.id);
  }
  message.success(...);
};
```

页面不再需要 `mode` 状态、`Segmented`、`onCreated/onUpdated/onDeleted` 三套分支。

## 迁移

这是破坏性变更，按 `2.0.0` 发布。迁移步骤：

1. `mode` 从必填改为可选；不再在页面维护 view/edit 切换时直接删除 `mode` 和 `Segmented`。

2. `createInitialValues` 移到 `schema.initialValues`。

3. `beforeSubmit` 移到 `schema.normalizeValues`。

4. `mapRecord` 移到 `api.show` 或页面数据层。

5. `onCreated/onUpdated/onDeleted` 合并为 `onSuccess(event)`。

6. `onCancel` 改为 `onBack`；`onEdit` 删除。

7. `canEdit/canDelete` 改为 `actions.edit/delete = false`。

8. `deleteConfirm` 改为 `confirmDelete`。

9. 删除 `footer`、`onFormReady`；需要自定义操作时不再由组件 footer 承担，应把业务操作放到 Card `extra`。

## 测试计划

1. 不传 `mode` 且无 `id` 渲染创建，不调用 show。

2. 不传 `mode` 且有 `id` 渲染预览，调用 show。

3. 预览点编辑进入 edit；取消回 view；保存成功回 view。

4. 传 `mode` 时组件不自行切换，只触发 `onModeChange`。

5. `id` 从有值变为空时进入 create；从空变为有值时进入 view。

6. `schema.initialValues` 生效；`schema.normalizeValues` 在 create/update 前执行。

7. `onSuccess` 的 create/update/delete 事件 payload 正确。

8. 编辑态初始保存按钮禁用；修改后启用；保存成功回 view 后重置。

9. `actions.edit/delete/save/cancel = false` 分别隐藏按钮。

10. `confirmDelete={false}` 直接删除；默认弹确认。

11. 删除成功未受控时进入 create。

12. 加载失败显示重试；提交失败保留表单值和错误 Alert。

13. 快速切换 id 时旧响应不覆盖新数据。

14. schema 不被修改，`viewMode` 不会被永久写死。

15. Card 标题在三种模式下分别为 “新建文章 / 文章详情 / 编辑文章”。

## 待确认

1. `title` 作为标题主体（“文章” 自动拼成 “新建文章 / 文章详情 / 编辑文章”）是否符合预期，还是希望传完整标题？

2. 编辑态保存按钮 “有修改才可点” 是否作为默认行为，还是需要 `disableDirtyCheck` 之类的开关？

3. 删除成功后未受控模式自动进入 create 是否合适，还是应保持当前 view 等业务切换？

4. 已确认：新增 `@ant-design/icons` peer dependency 和 `fast-deep-equal` 依赖。

5. 受控 `mode` 是否真的需要保留，还是只保留 `defaultMode` 即可覆盖路由场景？
