# 列表操作列扩展（row actions）实施计划

日期：2026-11-22

状态：待确认

设计文档：`docs/superpowers/specs/2026-11-22-list-row-actions-design.md`

约束：确认后执行；每个节点独立 commit，节点内验证通过后再进入下一个节点。`antd-form-schema-crud` 与 `jsw-admin` 分仓库提交，不混在一个 commit。

## 提交边界

| 节点 | 内容 | commit message |
| --- | --- | --- |
| 0 | 设计与实施文档 | `docs(list): define row actions` |
| 1 | 类型与动作求值工具 | `feat(list): add row action types` |
| 2 | prepend/append 组成、业务动作渲染、confirm、loading 与失败态 | `feat(list): render custom row actions` |
| 3 | 内置动作引用与 replace 模式 | `feat(list): support builtin row action refs` |
| 4 | 整列关闭、标题、宽度与冲突告警 | `feat(list): allow action column override` |
| 5 | 导出、README、llms、版本与构建 | `feat(list): export row action types` |
| 6 | example 演示 | `feat(example): demo row actions` |
| 7 | jsw-admin 相册页接入 | `feat(albums): move preview into row actions` |

节点 2→3→4 都在 `use-crud-columns.tsx` 上迭代，但分三次提交：组成与渲染、内置引用/替换、整列关闭与列配置，便于单点回滚。

## 节点 0：文档

改动：

- `docs/superpowers/specs/2026-11-22-list-row-actions-design.md`
- `docs/superpowers/plans/2026-11-22-list-row-actions-implementation.md`

验证：

- 对象唯一写法、三种 mode、`null` 语义、内置引用、边界 14 条、场景覆盖表、测试范围、提交边界一致。
- 文档不声称已经实现。

Commit：

```text
docs(list): define row actions
```

## 节点 1：类型与动作求值工具

改动：

- `packages/lib/src/types.ts`
- 新增 `packages/lib/src/components/list/row-action.ts`
- 新增 `packages/lib/__tests__/07-row-actions.spec.tsx`（只覆盖求值工具与类型守卫）

类型：

```ts
export interface CrudRowActionConfirm { title?: ReactNode; okText?: ReactNode; cancelText?: ReactNode; }

export interface CrudRowActionHandlerContext {
  index: number;
  reload: () => void;
}

export interface CrudRowActionContext<TRecord extends CrudRecord = CrudRecord> {
  record: TRecord;
  index: number;
  loading: boolean;
  reload: () => void;
  run: () => void | Promise<void>;
}

export interface CrudRowAction<TRecord extends CrudRecord = CrudRecord> {
  key: string;
  text?: ReactNode;
  href?: string | ((record: TRecord) => string | null | undefined);
  target?: '_blank' | '_self';
  render?: (context: CrudRowActionContext<TRecord>) => ReactNode;
  onClick?: (record: TRecord, context: CrudRowActionHandlerContext) => void | Promise<void>;
  tooltip?: ReactNode;
  danger?: boolean;
  disabled?: boolean | ((record: TRecord) => boolean);
  hidden?: boolean | ((record: TRecord) => boolean);
  confirm?: boolean | CrudRowActionConfirm;
  props?: ButtonProps;
}

export interface CrudBuiltinRowAction<TRecord extends CrudRecord = CrudRecord> {
  builtin: 'edit' | 'delete';
  hidden?: boolean | ((record: TRecord) => boolean);
  disabled?: boolean | ((record: TRecord) => boolean);
  text?: ReactNode;
  tooltip?: ReactNode;
  props?: ButtonProps;
}

export type CrudRowActionItem<TRecord extends CrudRecord = CrudRecord> =
  | CrudRowAction<TRecord>
  | CrudBuiltinRowAction<TRecord>;

export type CrudRowActionsMode = 'append' | 'prepend' | 'replace';

export interface CrudRowActionsConfig<TRecord extends CrudRecord = CrudRecord> {
  /** 缺省 `prepend`。 */
  mode?: CrudRowActionsMode;
  items: readonly CrudRowActionItem<TRecord>[];
}

export interface CrudListActionColumn {
  title?: ReactNode;
  width?: number | string;
}
```

求值工具：

```ts
interface ResolvedRowAction<TRecord> {
  action: CrudRowAction<TRecord>;
  index: number;
  href?: string;
}

function resolveRowAction(action, record, index): ResolvedRowAction | null;
function isBuiltinRowAction(item): item is CrudBuiltinRowAction<any>;
```

实现要点：

- `hidden` 为函数时只调用一次，`true` 直接返回 `null`，不再求值 `disabled`。
- `href` 为函数时求值，`null` / `undefined` / `''` 返回 `null`。
- `disabled` 不在求值阶段处理，交给渲染层。
- 纯函数，不读 React 状态，不依赖 antd。
- `SchemaCrudListProps` 增加 `rowActions?: CrudRowActionsConfig<TRecord> | null` 与 `actionColumn?: CrudListActionColumn`。
- 本节点不做渲染，不改 `use-crud-columns.tsx`。

测试：

- `hidden: true` 隐藏；函数形式按 record 变化。
- `href` 三种空值都隐藏，非空保留。
- `isBuiltinRowAction` 正确区分业务项与引用项。

验证：

```bash
cd packages/lib
./node_modules/.bin/vitest run __tests__/07-row-actions.spec.tsx
./node_modules/.bin/tsc --noEmit -p tsconfig.json
```

Commit：

```text
feat(list): add row action types
```

## 节点 2：prepend/append 组成、业务动作渲染、confirm、loading 与失败态

改动：

- 新增 `packages/lib/src/components/list/row-action.tsx`
- `packages/lib/src/hooks/use-crud-columns.tsx`
- `packages/lib/src/components/list/use-schema-crud-list-state.ts`
- `packages/lib/src/components/list/schema-crud-list-render.tsx`（若需透传）
- `packages/lib/__tests__/07-row-actions.spec.tsx`

实现要点：

- `mode` 归一化：缺省 `prepend`；非法值回退 `prepend` 并告警；本节点支持 `prepend` / `append`，`replace` 在节点 3 打开。
- 组成：`prepend` = items → 编辑 → 删除；`append` = 编辑 → 删除 → items。
- 渲染分支：`render` > `href` > `onClick`。
  - `render`：原样输出，不包 Button / Popconfirm；`context` 提供 `run` / `loading` / `reload`。
  - `href`：`Button type="link" size="small" href target`，不绑 `onClick`；`target === '_blank'` 时补 `rel="noreferrer"`，`props.rel` 优先。
  - `onClick`：渲染链接按钮，调用 `onClick(record, { index, reload })`；`reload` 直接复用 `state.reload`。
- `tooltip` 存在时包 `Tooltip`；`disabled` 时外层再套 `span`（`display: inline-block`），保证提示能触发；`render` 项不自动包。
- 四者全无（无 `text` / `render` / `href` / `onClick`）：告警并跳过。
- `href` 与 `onClick` 同时存在：`href` 生效，`onClick` 忽略并告警。
- `confirm` 用 Popconfirm 包裹，`true` 时标题为“确定执行该操作吗？”；确定后立即关闭，执行态由按钮 loading 表达。
- loading：`useSchemaCrudListState` 维护 `pendingRowActions`，key 为 `${String(getRecordKey(record, rowKey))}::${action.key}`；
  `rowKey` 求值缺失时退回 `#${index}` 并告警一次。
- `handleRunRowAction`：Promise 置位 loading、`finally` 复位；同步抛错与 reject 都 `console.error`，不弹 message、不调列表 `onError`；卸载后不 setState（mounted ref / cleanup）。
- 重复 `key`：开发 `console.error`，保留第一个。
- 内置编辑/删除仍用原 handler、`confirmDelete`、`deletingKey`，样式不变。
- `SchemaCrudListRoute` 不改。

测试：

- `prepend` / `append` 两种顺序；不写 `mode` 时按 `prepend`。
- 外链项 `href`、`target`、`rel`、为空不渲染。
- 异步 `onClick` 的 loading 与去重点击；同步抛错与 reject 的复位。
- `onClick` 第二参拿到 `{ index, reload }`，`reload` 触发一次当前页请求且页码不变。
- `tooltip` hover 显示；`disabled` + `tooltip` 仍可见。
- `confirm` 确认与取消两条路径。
- `render` 项 `context.run` / `context.loading` / `context.reload`。
- `rowKey` 缺失时 loading key 退回下标。

验证：

```bash
cd packages/lib
./node_modules/.bin/vitest run __tests__/07-row-actions.spec.tsx
./node_modules/.bin/vitest run
```

Commit：

```text
feat(list): render custom row actions
```

## 节点 3：内置动作引用与 replace 模式

改动：

- `packages/lib/src/components/list/row-action.tsx`
- `packages/lib/src/hooks/use-crud-columns.tsx`
- `packages/lib/src/components/list/use-schema-crud-list-state.ts`
- `packages/lib/__tests__/07-row-actions.spec.tsx`

实现要点：

- `mode: 'replace'` 打开：列只由 `items` 组成，顺序即数组顺序，内置必须显式引用。
- `{ builtin: 'edit' }` 复用 `onEdit`（Router 分支即默认导航）；非 Router 且无 `onEdit` 时不渲染并告警。
- `{ builtin: 'delete' }` 复用 `handleDelete` + `confirmDelete` + `deletingKey`；缺 `destroy` 时不渲染并告警。
- 引用项仍受 `actions.edit / delete === false` 约束。
- 引用项支持 `hidden` / `disabled` / `text` / `props` / `tooltip`；`text` 缺省仍是“编辑”“删除”。
- 引用项写了 `href` / `onClick` / `confirm` / `render` → 告警并按纯引用处理。
- `append` / `prepend` 出现 `builtin` 项 → 告警并忽略。
- 同一 `builtin` 重复 → 保留第一个，第二个告警忽略。
- `append` / `prepend` 下内置按钮仍保持现有硬编码文案，不对齐 `actions.edit.text`。

测试：

- `replace` 模式不写 `builtin` 时内置编辑/删除不出现。
- `{ builtin: 'edit', hidden }` 按行生效。
- `builtin: 'delete'` 仍弹确认并显示 `deletingKey` loading。
- `actions.delete === false` 时引用项不渲染。
- 非 Router 无 `onEdit` 时 `builtin: 'edit'` 不渲染。
- `append` / `prepend` 混入 `builtin` 被忽略；重复 `builtin` 保留第一个。

验证：

```bash
cd packages/lib
./node_modules/.bin/vitest run
./node_modules/.bin/tsc --noEmit -p tsconfig.json
```

Commit：

```text
feat(list): support builtin row action refs
```

## 节点 4：整列关闭、标题、宽度与冲突告警

改动：

- `packages/lib/src/hooks/use-crud-columns.tsx`
- `packages/lib/src/components/list/use-schema-crud-list-state.ts`
- `packages/lib/__tests__/07-row-actions.spec.tsx`

实现要点：

- `rowActions === null` → 直接返回 `null`，优先于一切可见性判断。
- 自动宽度：`Math.max(76, 可渲染项数 * 48 + 16)`。
- 可渲染项数：`prepend` / `append` = 内置可见数 + 静态可见 items；`replace` = 静态可见 items（含有效引用）。
- `actionColumn.width` 覆盖（数字与字符串）；`actionColumn.title` 覆盖“操作”。
- 可渲染项数为 0 时不渲染列。
- 显式 `columns` 含 `key: '__schema_crud_actions'` → 告警，仍追加内置操作列。
- 不引入 `fixed`，不做逐行宽度补偿。

测试：

- `rowActions={null}` 整列消失，内置按钮也不渲染。
- 三个可见项宽度为 `160`。
- `actionColumn: { title: '更多', width: 200 }` 生效。
- 不传时保持现状（92 / 76）。
- 全部项隐藏时不渲染列。
- 显式 columns 冲突触发告警。

验证：

```bash
cd packages/lib
./node_modules/.bin/vitest run
./node_modules/.bin/tsc --noEmit -p tsconfig.json
```

Commit：

```text
feat(list): allow action column override
```

## 节点 5：导出、文档、版本与构建

改动：

- `packages/lib/src/index.tsx`：导出 `CrudRowAction`、`CrudRowActionConfirm`、`CrudRowActionContext`、`CrudBuiltinRowAction`、`CrudRowActionItem`、`CrudRowActionsMode`、`CrudRowActionsConfig`、`CrudListActionColumn`。
- `packages/lib/README.md`：列表操作列章节补 `rowActions` 三种 mode、`null`、内置引用、`actionColumn`、场景覆盖表、边界规则。
- `packages/lib/llms.txt`：机器可读说明同步（行内动作矩阵、内置引用、整列关闭、confirm、loading、`rel`）。
- `packages/lib/package.json`：`1.0.9` → `1.1.0`（新增公开 API）。

验证：

```bash
cd packages/lib
./node_modules/.bin/vitest run
./node_modules/.bin/tsc --noEmit -p tsconfig.json
./node_modules/.bin/tsup
```

提交前确认：

- 产物 `dist/index.d.ts` 存在全部新类型和新 props。
- README 只演示 `rowActions` 对象写法与 `actionColumn`，不提供数组简写。
- 全量测试通过（现有 87 项 + 新增）。

Commit：

```text
feat(list): export row action types
```

## 节点 6：example 演示

改动：

- `packages/example/src/pages/posts/list.tsx`

内容：

- 一个对象配置覆盖两种分支：
  - `detail`：`href: (record) => \`/posts/${record.id}\``，`target: '_blank'`。
  - `copy`：`onClick` 异步写剪贴板后 `message.success`，演示 loading。
- `mode: 'prepend'`，预览与复制排在编辑之前。
- 不删除现有 `onEdit`、`onCreate`、`query` 配置。
- 不改 example 路由。

验证：

```bash
cd packages/example
./node_modules/.bin/tsc --noEmit -p tsconfig.json
./node_modules/.bin/vite build
```

浏览器检查：

- 操作列顺序为 预览 / 复制 / 编辑 / 删除。
- 复制点击后按钮短暂 loading，成功提示出现。
- 预览在新标签页打开详情。

Commit：

```text
feat(example): demo row actions
```

## 节点 7：jsw-admin 相册页接入

前置：节点 5 已执行 `tsup`；`jsw-admin` 的 `file:` 依赖是硬链接，`dist` 更新后重启 vite 即可，必要时 `pnpm install --force`。

改动：

- `src/pages/admin/albums/_config.tsx`：删除“预览”列，`albumListColumns` 只保留标题与简介。
- `src/pages/admin/albums/index.tsx`：增加 `rowActions`，`slug` 为空时隐藏预览。

目标代码：

```tsx
<SchemaCrudList<AlbumRecord>
  resource={albumPageConfig.resource}
  schema={albumPageConfig.schema}
  title={albumPageConfig.title}
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

验证：

```bash
pnpm ts-check
```

浏览器检查（`http://localhost:5076/#/admin/albums`）：

- 操作列顺序：预览 / 编辑 / 删除，删除仍在最后。
- `slug` 为空的记录不显示预览。
- 预览在新标签页打开前台相册页。
- 编辑、删除行为与改动前一致。

已知基线：`ts-check` 目前有既存 `src/pages/_app.tsx` PWA 类型错误；若仍存在只报告，不在本节点顺手修。

Commit：

```text
feat(albums): move preview into row actions
```

## 不纳入本次提交

- `ListActions.edit/delete` 的 `text` / `props` 对齐（`append` / `prepend` 模式保持现状）。
- 批量选择 / 批量操作、下拉“更多”、图标模式、右键菜单。
- 操作列 `fixed`、逐行动态宽度。
- `useCrudListActions` 新增 `run(key, record)`。
- `jsw-admin` 其它页面的行内动作迁移。
- `packages/example/dist` 等构建产物以外的历史改动。

## 停止条件

出现以下情况立即停止并等待确认：

- 需要恢复数组简写、每项 `position` 或第二种写法。
- 需要改 `onEdit` / Router 默认导航语义。
- 需要把 `rowActions` 做成异步加载或依赖请求。
- 需要逐行宽度计算或 `fixed` 吸顶。
- 某个节点验证失败且无法在不扩大范围的情况下修复。
