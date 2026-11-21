# SchemaCrud v2 实施计划

日期：2026-11-21
依据：`docs/superpowers/specs/2026-11-21-schema-crud-v2-design.md`
状态：已完成

## 实施原则

- 先改公共类型，再改组件，最后改测试和示例；每步保持可编译。
- 不保留 v1 prop 的兼容层。这是 `2.0.0` 破坏性变更，旧 prop 直接移除，避免两套 API 并存。
- 能从 schema 推导的配置不再新增组件 prop：`schema.initialValues`、`schema.normalizeValues` 直接交给 `SchemaForm`。
- 组件只生成 schema 浅副本，绝不改写传入对象。
- 不引入路由、请求库、i18n、热键和全局事件。
- 每阶段结束跑 `tsc`；全部完成后跑 `vitest`、`tsup` 和 example 构建。

## 阶段 1：类型与模式

文件：

- `packages/lib/src/types.ts`
- `packages/lib/src/index.tsx`

任务：

1. 删除 v1 的 `createInitialValues`、`mapRecord`、`beforeSubmit`、`canEdit`、`canDelete`、`deleteConfirm`、`onEdit`、`onCreated`、`onUpdated`、`onDeleted`、`onFormReady`、`footer`。
2. 新增 `CrudSuccessEvent`，区分 create/update/delete。
3. `actions` 的按钮键改为 `save | cancel | edit | delete`。
4. `SchemaCrudProps.mode` 改为可选；新增 `onBack`、`onModeChange`、`confirmDelete`。
5. `title` 定义为标题主体，支持 `false`。
6. 导出 `CrudSuccessEvent`。

验收：

- `tsc --noEmit` 通过。
- 公共导出不残留 v1 类型名。

## 阶段 2：模式与未保存状态

新增：

- `packages/lib/src/hooks/use-crud-mode.ts`
- `packages/lib/src/hooks/use-dirty-state.ts`
- `packages/lib/src/utils/deep-equal.ts`

任务：

1. `useCrudMode`：
   - 受控时直接使用传入 `mode`；
   - 非受控时按 `id` 推导 create/view；
   - 暴露 `setMode`，在非受控时写内部状态，在受控时调用 `onModeChange`；
   - `id` 变化时，非受控模式重新推导。
2. `useDirtyState`：
   - 接收 `enabled`、`initialValues`、`values`；
   - 只处理 JSON 可序列化表单值；
   - 返回 `dirty`，并提供快照重置能力。
3. `deepEqual` 处理数组、对象、原始值，不引入 `fast-deep-equal`。

验收：

- 单测覆盖 create/view 推导、受控不切换、id 变化、dirty 判断。

## 阶段 3：UI 与操作

文件：

- `packages/lib/src/components/schema-crud.tsx`
- `packages/lib/src/components/schema-footer.tsx`
- `packages/lib/src/components/schema-header.tsx`（删除）
- `packages/lib/src/styles/index.css`

任务：

1. 根节点改为 `Card`，`title` 自动拼接“新建/详情/编辑”，`extra` 后追加返回按钮。
2. 编辑态有修改时标题后显示橙色圆点。
3. 初始化直接使用 `Card.loading`，不再额外包 `Spin`，也不用单独的 loading 占位块替换卡片。
4. 底部按钮改为 v2 的 `save/cancel/edit/delete`：
   - create：取消 / 创建；
   - edit：删除 / 取消 / 保存；
   - view：删除 / 返回 / 编辑。
5. 保存按钮：
   - create 在 form ready 后可用；
   - edit 还要求 dirty；
   - 提交和删除互斥 loading。
6. 删除使用 `confirmDelete` 布尔值；false 直接调用 destroy。
7. 删除成功：未受控模式进入 create，并触发 `onSuccess`。
8. 编辑保存成功：未受控回 view；受控调用 `onModeChange('view')`。
9. 预览点编辑：未受控进 edit；受控调用 `onModeChange('edit')`。
10. 返回按钮：view/create 调 `onBack`；edit 等同取消回 view。
11. 错误 Alert 保留，所有错误继续调 `onError`。
12. 样式改为 Card 内布局，移除旧 `__header`、`__loading`。

验收：

- 组件不再 import `SchemaHeader`。
- 根节点有 `data-component`、Card class、`aria-busy`。
- 没有 footer 自定义入口。

## 阶段 4：测试重写

文件：

- `packages/lib/__tests__/01-basic.spec.tsx`

任务：

1. 按 v2 API 重写测试，不保留 v1 prop 测试。
2. 覆盖：
   - 无 id 自动 create，不调用 show；
   - 有 id 自动 view，调用 show；
   - view 点编辑进 edit；取消回 view；保存成功回 view；
   - 受控 mode 不内部切换，只调 `onModeChange`；
   - `onSuccess` 三种事件；
   - `schema.initialValues`、`schema.normalizeValues`；
   - dirty 控制保存按钮；
   - actions 隐藏按钮；
   - confirmDelete；
   - 加载失败重试、提交失败保留值；
   - 快速切 id 丢弃旧响应；
   - schema 不被修改；
   - Card 标题三种模式；
   - API 解析和 requirement 保持。

验收：

- `vitest run` 全部通过。

## 阶段 5：示例迁移

文件：

- `packages/example/src/pages/posts/index.tsx`
- `packages/example/src/pages/posts/components/post-schema-crud.tsx`（删除）
- `packages/example/src/pages/posts/components/post-toolbar.tsx`（删除）
- `packages/example/src/pages/posts/schema.ts`
- `packages/example/README.md`

任务：

1. 删除页面里的 `mode` 状态、`Segmented`、三个成功回调。
2. `postSchema` 增加 `initialValues` 和 `normalizeValues`。
3. 页面只保留：
   - 文章选择器；
   - “新建”按钮；
   - `<SchemaCrud resource="posts" id={activeId} title="文章" ...>`；
   - 统一 `handleSuccess(event)`；
   - `onBack` 回到第一条或新建。
4. `handleSuccess` 按 `event.action` 更新 `activeId`、刷新列表、提示。
5. README 更新为 v2 用法。

验收：

- example `tsc` 和 `vite build` 通过。

## 阶段 6：构建与提交

任务：

1. `packages/lib`：
   - `./node_modules/.bin/vitest run`
   - `./node_modules/.bin/tsc --noEmit -p tsconfig.json`
   - `./node_modules/.bin/tsup`
2. `packages/example`：
   - `../../node_modules/.bin/tsc --noEmit -p tsconfig.json`
   - `../../node_modules/.bin/vite build`
3. 检查 dist 的 `style.css` 与 d.ts 导出。
4. 按阶段拆 commit，英文 message，不 push。

## 风险

- `Card` 作为根节点会改变外部页面既有包裹结构；example 同步去掉外层 Card。
- 编辑态 dirty 判断依赖表单值快照，异步 `show` 完成后的基线必须准确，否则保存按钮会误禁用。
- 受控 `mode` 下保存成功不会自动切回 view，必须由业务响应 `onModeChange`；文档和示例要明确。
- 删除成功后 `id` 仍由业务控制，组件内部只切 create；若业务马上设置下一条 id，`id` 变化会重新进入 view。
- 新增 `@ant-design/icons` 作为 peer dependency；当前工作区由 antd 间接提供，发布时要声明清楚。
