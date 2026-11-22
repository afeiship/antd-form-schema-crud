# 列表操作列扩展（row actions）

日期：2026-11-22

状态：设计已确认（2026-11-22），待执行

关系：在 `2026-11-21-schema-resource-list-design.md`、`2026-11-22-crud-list-query-design.md` 与 `2026-11-22-crud-action-hook-design.md` 之上，只扩展操作列的组成方式。不改变请求流程、分页、路由导航、删除确认、`query.slots` 和 action hook 的语义。

## 结论

操作列从“写死两个按钮”变成“一组可声明的动作”，只有一种写法：

```tsx
<SchemaCrudList<AlbumRecord>
  resource="albums"
  schema={albumPageConfig.schema}
  columns={albumPageConfig.list.columns}
  rowActions={{
    mode: 'prepend',
    items: [
      {
        key: 'preview',
        text: '预览',
        target: '_blank',
        href: (record) => (record.slug ? `${FRONTEND_URL}/albums/${record.slug}` : null),
      },
    ],
  }}
/>
```

- `mode` 三选一：`prepend` / `append` / `replace`，缺省 `prepend`。
- 只接受对象形态，不提供数组简写，避免同一件事有两种表达。
- `rowActions={null}` 表示整个操作列不显示。
- 单个内置按钮的显隐继续由 `actions.edit` / `actions.delete` 控制，不新增开关。

## 现状

`src/hooks/use-crud-columns.tsx` 里操作列是硬编码的：

- 只有 `编辑` 和 `删除` 两个按钮，文案固定。
- 列宽固定为 `92`（两个按钮）或 `76`（一个按钮），`title` 固定为“操作”。
- 整列是否存在只由 `canEdit && canDelete` 推导，不能显式关掉。
- 业务想加“预览”，只能在 `columns` 里另起一列。

`jsw-admin` 的 `src/pages/admin/albums/_config.tsx` 现在就是这么写的：`预览` 是第三个数据列，`slug` 为空时该单元格返回 `null`。代价是：

- 预览和编辑/删除在两张不同的列里，视觉上不像同一组行内操作。
- 每多一个动作就多一列，列宽和顺序和操作列无关。
- 按行隐藏只能靠列 `render` 返回 `null`，单元格仍然占位。

列表已有的扩展点都不能覆盖这个场景：

| 现有能力 | 为什么不够 |
| --- | --- |
| `columns` 显式列 | 只能加列，不能进操作列，也不会继承操作列的宽度和按钮样式 |
| `presets` | 只改 schema 推导列的展示，明确不作用于操作列 |
| `query.slots` | 是 Card 级、Card extra 级的插槽，不在表格行内 |
| `useCrudListActions` | 只能触发已挂载实例已有的动作，不能新增行内按钮 |
| `actions.edit / delete` | 只能关掉单个内置按钮，不能加动作、不能重排、不能按行控制 |

## 关掉按钮 / 关掉整列

三种诉求都有唯一入口，都不需要改 `columns`，也不需要改组件源码。

| 诉求 | 写法 |
| --- | --- |
| 不要编辑 | `actions={{ edit: false }}` |
| 不要删除 | `actions={{ delete: false }}` |
| 两个都不要 | `actions={{ edit: false, delete: false }}` |
| 整列都不要 | `rowActions={null}` |
| 重排 / 替换 / 按行控制内置按钮 | `rowActions={{ mode: 'replace', items: [...] }}` |

两个容易踩的坑，文档里写明：

1. Router 分支会给 `onEdit` 兜一个默认导航，所以“不传 `onEdit`”在路由页面里并不等于“没有编辑”，必须显式 `edit: false`。
2. 传 `resource` 时删除按钮取决于解析后的 `destroy`，只要 `nx.$api` 里有 `albums_destroy` 就会出现；想让某个列表页不删除，同样要显式 `delete: false`。

`rowActions` 的三态：

| 值 | 含义 |
| --- | --- |
| 不传（`undefined`） | 保持现状：内置编辑/删除按各自规则出现 |
| `null` | 整列不显示，内置按钮也不出现；优先级最高 |
| 对象 | 按 `mode` 与 `items` 组成操作列 |

## 方案对比

| 方案 | 做法 | 问题 |
| --- | --- | --- |
| 显式 `columns` 自拼（现状） | 在 `columns` 里加一列 | 动作被拆到两列，宽度/顺序/按行隐藏各写一套 |
| `actions.view` + `onView` | 给 `ListActions` 加 `view`，Router 默认导航 `${pathname}/${id}` | 预览目标经常是外链或非详情路由（相册预览走前台 `slug`），默认语义不成立；每加一种动作就要新增一个内置 key，无法收敛 |
| `renderRowActions` 回调 | 业务整列自己渲染 | 按钮样式、间距、内置编辑/删除、删除 loading 全部要重写，行为和组件分叉 |
| **`rowActions` 声明式（推荐）** | 动作描述成数据，内置按钮变成可引用项 | 新增一层类型和渲染逻辑；能覆盖外链、自定义点击、确认、loading、按行显隐、替换与重排 |

选声明式的理由：动作的位置固定（都在操作列），变化的只是“有哪些动作、每个动作做什么”。这类差异适合用数据描述，不适合用回调整列接管。

## 公开 API

### 业务动作

```ts
export interface CrudRowActionConfirm {
  title?: ReactNode;
  okText?: ReactNode;
  cancelText?: ReactNode;
}

export interface CrudRowActionHandlerContext {
  /** 该行在本次请求结果中的下标。 */
  index: number;
  /** 重新请求当前页，保留 page / size / params；不跳页、不写 URL。 */
  reload: () => void;
}

export interface CrudRowActionContext<TRecord extends CrudRecord = CrudRecord> {
  record: TRecord;
  index: number;
  /** 该动作当前是否在执行（onClick 的 Promise 未结束）。`render` 用来画自己的 loading。 */
  loading: boolean;
  /** 同 onClick 的第二参，供 `render` 自绘按钮使用。 */
  reload: () => void;
  /** 执行本项的 onClick（有 confirm 时先走确认）；外链项调用等同于点击链接。 */
  run: () => void | Promise<void>;
}

export interface CrudRowAction<TRecord extends CrudRecord = CrudRecord> {
  /** 列内唯一 key，同时作为 loading 与告警的标识。 */
  key: string;
  /** 按钮文案；`render` 存在时不使用。 */
  text?: ReactNode;
  /** 外链地址；返回空值时整项不渲染。与 onClick 互斥，href 优先。 */
  href?: string | ((record: TRecord) => string | null | undefined);
  /** 外链打开方式，仅在 `href` 生效时透传；默认 `_self`。 */
  target?: '_blank' | '_self';
  /** 完全自定义渲染，结果原样输出，不再包 Button。 */
  render?: (context: CrudRowActionContext<TRecord>) => ReactNode;
  /** 点击回调；返回 Promise 时该项进入 loading。第二参可拿到 refresh 用的 reload。 */
  onClick?: (record: TRecord, context: CrudRowActionHandlerContext) => void | Promise<void>;
  /** 说明文案，用 Tooltip 展示；置灰时同样生效。 */
  tooltip?: ReactNode;
  danger?: boolean;
  disabled?: boolean | ((record: TRecord) => boolean);
  hidden?: boolean | ((record: TRecord) => boolean);
  /** 二次确认；`true` 使用默认文案。外链项不使用。 */
  confirm?: boolean | CrudRowActionConfirm;
  /** 透传给 antd Button（size / type 会被组件默认值补位）。 */
  props?: ButtonProps;
}
```

### 内置动作引用

```ts
export interface CrudBuiltinRowAction<TRecord extends CrudRecord = CrudRecord> {
  /** 引用内置动作，复用原 handler、Router 导航、删除确认与 deletingKey loading。 */
  builtin: 'edit' | 'delete';
  /** 按行显示，第一次让内置按钮支持行级控制。 */
  hidden?: boolean | ((record: TRecord) => boolean);
  disabled?: boolean | ((record: TRecord) => boolean);
  text?: ReactNode;
  /** 说明文案，用 Tooltip 展示；置灰时同样生效。 */
  tooltip?: ReactNode;
  props?: ButtonProps;
}

export type CrudRowActionItem<TRecord extends CrudRecord = CrudRecord> =
  | CrudRowAction<TRecord>
  | CrudBuiltinRowAction<TRecord>;
```

### 组成配置与 Props

```ts
export type CrudRowActionsMode = 'append' | 'prepend' | 'replace';

export interface CrudRowActionsConfig<TRecord extends CrudRecord = CrudRecord> {
  /** 缺省 `prepend`：items 排在内置动作之前。 */
  mode?: CrudRowActionsMode;
  items: readonly CrudRowActionItem<TRecord>[];
}

export interface CrudListActionColumn {
  /** 列标题；默认“操作”。 */
  title?: ReactNode;
  /** 覆盖自动计算宽度。 */
  width?: number | string;
}

export interface SchemaCrudListProps<TRecord, TQuery> {
  // ...existing
  /** 三种 mode 组成操作列；`null` 表示整列不显示。 */
  rowActions?: CrudRowActionsConfig<TRecord> | null;
  /** 列标题与宽度覆盖。 */
  actionColumn?: CrudListActionColumn;
}
```

两个属性都只作用于列表；表单底部工具栏不读它们。项目级 `configureSchemaCrudList` 不新增默认项，`rowActions` 是实例级配置。

## 场景覆盖表

常见行内动作都能落到现有字段上，不需要再加新的动作类型：

| 业务动作 | 写法 |
| --- | --- |
| 外链预览 / 打开前台页面 | `href` + `target: '_blank'`，地址为空自动隐藏整项 |
| 应用内详情弹层 | `onClick` 打开 Modal，`record` 直接传入；需要刷新时用第二参 `reload` |
| 路由详情页 | `href: (r) => \`${base}/${r.id}\``，或 `onClick` + `navigate` |
| 上架 / 下架 / 标记状态 | `onClick` 异步请求 + `confirm`，成功后 `context.reload()` |
| 复制某字段 | `onClick` 写剪贴板，按钮自带 loading 与去重 |
| 单行下载 / 导出 | `onClick` 触发下载，或 `href` 直链 |
| 按权限隐藏 | `hidden: (r) => !r.permissions?.edit` |
| 按状态禁用（置灰保留位置） | `disabled: (r) => r.status === 'archived'`，配 `tooltip` 说明原因 |
| 只要图标按钮 | `text` 传图标，`props` 调 `size` / `type`；不提供 icon-only 专用字段 |
| 业务自己的危险操作 | `confirm: { title: '...' }` + `danger` + `onClick` |
| 内置按钮换文案 / 换位置 / 按行隐藏 | `replace` 模式 + `{ builtin: 'edit' | 'delete', text, hidden }` |

## 行为语义

### 列是否存在

按顺序判断，命中即停止：

1. `rowActions === null` → 不渲染操作列。
2. 解析后的可渲染项数为 0 → 不渲染操作列。
3. 其余情况渲染操作列。

可渲染项数：

| mode | 组成 |
| --- | --- |
| `prepend`（缺省） | `items` → 内置编辑 → 内置删除 |
| `append` | 内置编辑 → 内置删除 → `items` |
| `replace` | 只有 `items`，内置按钮必须显式引用才出现 |

预置项与内置按钮都先做可见性求值，全部不可见即 0 项、不出列。

### 顺序规则

- 三种 mode 都是整体分段，不做单条排序；`items` 内部严格按数组顺序。
- `append` / `prepend` 中内置按钮的相对位置固定：编辑在删除之前。
- `replace` 中顺序完全由 `items` 决定，可以把删除放最前，也可以只留预览。
- 不提供每项的 `position` 字段，避免和 `mode` 两套排序混用。
- 缺省是 `prepend`：不写 `mode` 时业务动作默认排在编辑之前。

```tsx
// 预览在编辑/删除之前
rowActions={{ mode: 'prepend', items: [preview] }}

// 预览在编辑/删除之后
rowActions={{ mode: 'append', items: [preview] }}

// 只要预览 + 编辑，删除不要
rowActions={{ mode: 'replace', items: [preview, { builtin: 'edit' }] }}
```

### 内置引用规则

- 引用项只在 `replace` 模式有效；`append` / `prepend` 出现 `builtin` 字段时开发环境告警并忽略该项。
- 引用项不写 `href` / `onClick` / `confirm` / `render`；写了视为配置错误，告警后按纯引用处理。
- 仍然受 `actions.edit === false` / `actions.delete === false` 约束：引用不等于绕过开关。
- `{ builtin: 'edit' }` 还需要 `onEdit` 存在；非 Router 场景没有 `onEdit` 时不渲染并告警。
- `builtin: 'delete'` 仍要求解析到 `destroy`；缺失时不渲染并告警。
- `builtin: 'delete'` 继续走 `confirmDelete` 与 `deletingKey`，删除 loading 与现状一致。
- `builtin: 'edit'` 继续走 `onEdit`（Router 分支为默认导航）。
- `hidden` / `disabled` / `text` / `props` 覆盖引用项；`text` 缺省仍是“编辑”“删除”。
- 同一个 `builtin` 在 `items` 里出现两次：保留第一个，第二个告警忽略。

### 单项渲染

| 条件 | 行为 |
| --- | --- |
| `hidden` 为 `true` 或按行返回 `true` | 该项不渲染，且不再求值 `disabled` |
| `href` 存在但求值为 `null` / `undefined` / `''` | 该项不渲染（相册没有 `slug` 时正是这个场景） |
| `render` 存在 | 直接输出 `render(context)`，不包 Button、不套 Popconfirm；`context.run` 可触发 `onClick`，`context.loading` 反映执行态 |
| `href` 存在且有效 | 渲染 antd 链接按钮，落到原生 `<a href>`，透传 `target`，不触发 `onClick` |
| `onClick` 存在 | 渲染链接按钮，点击调用 `onClick(record, { index, reload })` |
| `confirm` 为 `true` / 对象 | 用 Popconfirm 包裹按钮；确认后才执行；`true` 时标题为“确定执行该操作吗？” |
| `disabled` 为 `true` 或按行返回 `true` | 按钮 `disabled`，不触发任何回调 |

`key`、`hidden`、`disabled`、`href` 允许函数形式，函数只接收 `record`，每行独立求值。

## 边界与失败态

1. `_blank` 外链自动补 `rel="noreferrer"`；`props.rel` 显式给出时不覆盖。
2. `hidden` 优先于 `disabled`：隐藏命中即跳过，不执行 `disabled` 求值。
3. loading key 为 `${String(getRecordKey(record, rowKey))}::${action.key}`；`rowKey` 求值为 `undefined` / `null` 时退回 `#${index}`，并在开发环境按列告警一次。
4. `onClick` 同步抛错与 Promise reject 一样处理：加载态复位、`console.error` 记录、不弹内置提示、不调用列表的 `onError`。
5. 组件卸载后 Promise 才结束：不再 setState（mounted refguard）；pending 条目随 Promise 结束自然清理，不做全局清空。
6. 翻页 / 重新请求后：pending 只对当前存在的行 key 生效，旧 key 不显示、也不阻塞新数据。
7. `href` 与 `onClick` 同时存在：`href` 生效，`onClick` 忽略并告警。
8. `render` 与 `onClick` 同时存在：`render` 接管外观，`context.run()` 调用 `onClick`，`context.loading` 供自绘 loading。
9. `text`、`render`、`href`、`onClick` 四者全无：告警并跳过该项。
10. `mode` 非法值：回退 `prepend` 并告警，不抛异常。
11. 重复 `key`：开发环境 `console.error` 一次，保留第一个。
12. 显式 `columns` 里已存在 `key: '__schema_crud_actions'`：开发环境告警，仍会追加内置操作列，不静默合并。
13. `confirm` 点击确定后确认框立即关闭，执行态由按钮 `loading` 表达；不阻塞其它行、不阻塞其它动作。
14. `items` 建议模块级常量或 `useMemo`：内联对象每次 render 会重建列，表格会重渲染（不重新请求）。
15. `onClick` 第二参 `{ index, reload }`：`reload` 只重新请求当前页，保留 page / size / params，不重置页码、不写 URL；与 `useCrudListActions().reload` 语义一致。
16. `tooltip` 存在时按钮外层包 `Tooltip`；`disabled` 状态下按钮不触发 hover，需要用 `span` 包裹（`display: inline-block`）才能显示提示。
17. `tooltip` 只影响展示，不影响点击与 loading；`render` 项不自动包 Tooltip。

## 列宽与隐藏

- 自动宽度：`Math.max(76, 可渲染项数 * 48 + 16)`。
- `actionColumn.width` 存在时直接使用，不再计算。
- 列标题默认“操作”，`actionColumn.title` 覆盖。
- 宽度是列级属性，按行 `hidden` 导致的空位由 antd 自行排布，不做逐行宽度补偿。
- 文案明显更长（“查看详情”“复制到剪贴板”）或动作超过 3 个时，显式给 `actionColumn.width`，必要时配合 `tableProps.scroll={{ x }}`。
- 操作列仍然不受 `presets` 影响，也仍然追加在显式 `columns` 之后。

## 与现有能力的关系

| 能力 | 关系 |
| --- | --- |
| `actions.edit` / `actions.delete` | 继续决定内置按钮是否存在；`replace` 模式的引用项也受它们约束 |
| `confirmDelete` | 只作用于内置删除，不影响 `rowActions[].confirm` |
| `onEdit` / Router 默认导航 | 内置编辑仍是唯一的行内编辑入口；`rowActions` 不自动生成编辑/详情跳转 |
| `useCrudListActions` | 不新增 `run(key, record)`；hook 仍只暴露实例已有动作，避免两套入口 |
| `columns` / `fields` / `presets` | 数据列逻辑不变，操作列依旧追加在末尾 |
| `query.slots` | 不涉及 |

## 非目标

| 不做 | 理由 |
| --- | --- |
| `actions.view` / `onView` | 预览目标多为外链或非详情路由，内置默认导航不成立；每加一种动作要新增一个 key，收敛不了 |
| 批量选择 / 批量操作 | 需要 `rowSelection` 与批量请求语义，和“行内动作”是两件事 |
| 下拉“更多”、图标模式、右键菜单 | 交互形态未定；`text` + `render` 已能拼出，先不固化 API |
| 操作列 `fixed: 'right'` | 宽度随动作数变化，`fixed` 需要与 `tableProps.scroll.x` 一起调；本次用 `scroll` + `actionColumn.width` 兜底 |
| 逐行动态宽度 | 列宽是列级属性，逐行补偿会让表格抖动 |
| `rowActions` 异步加载（按行再取数据） | 会把动作渲染塞进请求生命周期，超出边界 |
| `useCrudListActions` 新增 `run(key, record)` | 声明式动作与外部命令是两套入口，先只留声明式 |
| `actions.edit/delete` 的 `text` / `props` 对齐（`append` / `prepend` 模式） | 属于既有不一致，单独节点修，不混在本次 |

## 已知不一致（本次不修）

`ListActions` 的类型里 `edit` / `delete` 支持 `{ text, props }`，但操作列渲染时只用固定文案，`text` 与 `props` 在列表里并未生效（表单底部按钮是另一套实现）。本次不顺手修，避免在“新增扩展点”的提交里混入行为变更。需要对齐时单独开节点；`replace` 模式的引用项可以先行支持 `text` / `props`，因为那是新路径。

## 实现要点

1. `src/types.ts`：新增 `CrudRowActionConfirm`、`CrudRowActionContext`、`CrudRowAction`、`CrudBuiltinRowAction`、`CrudRowActionItem`、`CrudRowActionsMode`、`CrudRowActionsConfig`、`CrudListActionColumn`；`SchemaCrudListProps` 增加 `rowActions?: CrudRowActionsConfig<TRecord> | null`、`actionColumn?: CrudListActionColumn`。
2. 新增 `src/components/list/row-action.tsx`：
   - `resolveRowAction(action, record, index)`：求值 `hidden` / `href`，返回可渲染项或 `null`。
   - `isBuiltinRowAction(item)` 类型守卫。
   - `SchemaRowActionItem`：按 render / href / onClick 三个分支渲染，处理 confirm、loading 与 tooltip，`_blank` 补 `rel`。
   - `onClick(record, { index, reload })`；`render` 的 context 同时提供 `run` / `loading` / `reload`。
3. 内置引用项归一化为同一渲染描述，复用 `onEdit`、`handleDelete`、`deletingKey`。
4. `src/hooks/use-crud-columns.tsx`：
   - 接收 `rowActions`、`actionColumn`。
   - `rowActions === null` 直接返回 `null`。
   - 按 `mode` 组装：`prepend`（缺省）/ `append` / `replace`；非法 mode 回退 `prepend`。
   - 宽度按可渲染项数计算，`actionColumn` 覆盖。
   - 重复 key、重复 builtin、显式 columns 冲突在开发环境告警。
5. `src/components/list/use-schema-crud-list-state.ts`：维护 `pendingRowActions` 与 `handleRunRowAction(record, action)`，处理 Promise、同步异常、loading 复位、卸载 guard。
6. `src/index.tsx` 导出新增类型。
7. 不修改 `SchemaCrudListRoute`：路由分支只透传 props。

## 测试计划

新增 `packages/lib/__tests__/07-row-actions.spec.tsx`：

1. 不传 `rowActions` / `actionColumn`：表头仍为 `['姓名', '操作']`，列宽与按钮和现状一致。
2. `actions={{ edit: false }}` 只剩删除；`actions={{ delete: false }}` 只剩编辑；两者都 false 时无操作列。
3. `rowActions={null}`：整列消失，内置按钮也不渲染。
4. 缺省 `mode: 'prepend'`：预览在编辑之前；显式 `mode: 'append'`：预览在删除之后。
5. 外链动作：`href`、`target` 生效；`_blank` 自动带 `rel="noreferrer"`；`href` 为空不渲染。
6. `onClick` 返回 Promise：点击后 `loading`，resolve 前重复点击只调用一次，resolve 后复位；第二参拿到 `{ index, reload }`，`reload` 触发一次当前页请求且不改页码。
7. `confirm: true`：确认后调用；取消不调用。
8. `hidden` / `disabled` 函数形式按行求值；`hidden` 命中时 `disabled` 不求值。
9. `render` 自定义节点：原样输出；`context.run()` 触发 `onClick`，`context.loading` 随 Promise 变化。
10. `replace` 模式：不写 `builtin` 时内置编辑/删除不出现；`{ builtin: 'edit', hidden }` 按行生效。
11. `replace` 模式 `builtin: 'delete'`：仍弹确认、仍显示 `deletingKey` loading；`actions.delete === false` 时不渲染。
12. `{ builtin: 'edit' }` 在非 Router 且无 `onEdit` 时不渲染。
13. `append` / `prepend` 混入 `builtin` 项：告警并忽略，列组成不变；重复 `builtin` 保留第一个。
14. 非法 `mode` 回退 `prepend`，不抛异常。
15. 同步抛错与 Promise reject：`loading` 复位，`console.error` 被调用，不弹 message。
16. `rowKey` 求值缺失时 loading key 退回下标，不串行。
17. `actionColumn: { title: '更多', width: 200 }` 覆盖表头与宽度；三个可见项默认宽度 `160`。
18. `tooltip`：hover 出现提示；`disabled` + `tooltip` 仍能显示；`render` 项不自动包 Tooltip。
19. 回归：`02-list`、`04-actions` 全量通过。

## 已确认

1. 只有对象写法 `rowActions={{ mode, items }}`，不提供数组简写。
2. `mode` 为 `prepend`（缺省）/ `append` / `replace` 三选一。
3. `rowActions={null}` 表示整列不显示；不传表示保持现状。
4. 内置按钮显隐继续走 `actions.edit` / `actions.delete`，不新增开关。
5. 内置按钮用 `{ builtin: 'edit' | 'delete' }` 引用，保留原 handler、确认与 loading；只在 `replace` 模式有效。
6. 不提供每项 `position`，顺序由 `mode` + `items` 数组决定。
7. 外链用 `href` + `target`，求值为空即隐藏；不提供 `onView`。
8. 宽度 `可渲染项数 * 48 + 16`，下限 76，`actionColumn.width` 覆盖。
9. `ListActions` 里 `edit/delete` 的 `text` / `props` 在 `prepend` / `append` 模式仍不生效，本次不修；`replace` 引用项先行支持。
10. 相册页接入：删除独立“预览”列，改 `rowActions`（`mode: 'prepend'`），`slug` 为空不显示预览。
11. 缺省 `mode` 取 `prepend`：业务动作默认排在编辑之前，与“查看/预览在最前”的常见排布一致。
12. `onClick` 增加第二参 `{ index, reload }`：操作成功后可直接刷新当前页，不必再让业务接 hook。
13. `disabled` 支持 `tooltip`：置灰的按钮能说明原因，`disabled` 状态用 `span` 包裹保证提示可见。
14. 操作列本次仍不做 `fixed: 'right'`：宽度随动作数变化，`fixed` 要与 `tableProps.scroll.x` 联动，先用 `actionColumn.width` + `scroll` 兜底，需要时单独开节点。
