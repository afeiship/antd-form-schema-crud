# SchemaCrudList 实施计划

日期：2026-11-21

依据：`docs/superpowers/specs/2026-11-21-schema-resource-list-design.md`

状态：已完成（2026-11-21）

## 实施原则

- 先做 `SchemaCrud -> SchemaCrudForm` 重命名，再增加列表；每步保持可编译。
- 版本保持 `2.0.0`，不保留 `SchemaCrud` 旧名别名。
- 列表只负责 `index`、分页、列、删除和动作回调；不引入路由依赖。
- 示例用 `react-router-dom` 把列表、新建、详情、编辑拆成四个页面。
- 不引入 `@jswork/antd-components`、全局事件、i18n、Drawer/Modal、请求缓存。

## 阶段 1：重命名

文件：

- `packages/lib/src/components/schema-crud.tsx` → `schema-crud-form.tsx`
- `packages/lib/src/defaults.ts`
- `packages/lib/src/types.ts`
- `packages/lib/src/index.tsx`
- `packages/lib/__tests__/01-basic.spec.tsx`
- `packages/lib/README.md`
- `packages/example/**`
- 根 `README.md`

任务：

1. `SchemaCrud` → `SchemaCrudForm`。
2. `AntdFormSchemaCrud` → `AntdFormSchemaCrudForm`。
3. `SchemaCrudProps` → `SchemaCrudFormProps`。
4. `SchemaCrudDefaults` → `SchemaCrudFormDefaults`。
5. `configureSchemaCrud` → `configureSchemaCrudForm`。
6. `getSchemaCrudDefaults` → `getSchemaCrudFormDefaults`。
7. `resetSchemaCrudDefaults` → `resetSchemaCrudFormDefaults`。
8. 不保留兼容别名。

验收：

- `tsc --noEmit` 通过。
- 全仓非文档代码不再出现旧 API 名。

## 阶段 2：类型与接口

文件：

- `packages/lib/src/types.ts`
- `packages/lib/src/api/resolve-api.ts`
- `packages/lib/src/api/requirement.ts`
- `packages/lib/src/index.tsx`

任务：

1. `CrudApi` 增加可选 `index`。
2. 新增 `CrudListParams`、`CrudListResult`、`ListActions`、`ListPresetField`、`ListPresetsInput`、`ListPresets`、`SchemaCrudListProps`。
3. `resolveApi` 解析 `${resource}_index`。
4. 新增列表接口检查，缺少 `index` 时给出可读错误。
5. 导出列表组件和全部公开类型。

验收：

- 类型导出完整。
- `resolveApi` 单测覆盖 `index`。

## 阶段 3：列表状态与列

新增：

- `packages/lib/src/hooks/use-crud-list.ts`
- `packages/lib/src/hooks/use-crud-columns.ts`
- `packages/lib/src/utils/list.ts`

任务：

1. `useCrudList`：
   - 初始 `page=1`，`pageSize` 默认 10；
   - 请求 payload 固定 `{ page, size, ...params }`；
   - 校验 `{ rows, total }`；
   - 丢弃旧响应；
   - `params` 变化回第 1 页；
   - 删除后刷新，空页自动回退；
   - 删除成功触发 `onSuccess`，失败触发 `onError`。
2. `useCrudColumns`：
   - 显式 columns 优先；
   - presets 补 `title/width/align/ellipsis/fixed`；
   - 无 columns 时从 schema 推导；
   - `options` 映射为 label；
   - 追加编辑、删除操作列。
3. `utils/list`：
   - 响应校验；
   - 稳定 params key；
   - option label 映射；
   - row key 读取。

验收：

- 单元测试覆盖分页、竞态、删除回退、presets 合并、schema 推导。

## 阶段 4：列表组件

新增：

- `packages/lib/src/components/schema-crud-list.tsx`

任务：

1. `Card` 根，标题 `${title}列表`。
2. `Card.extra` 放新建、刷新、返回。
3. 首次加载用 `Card.loading`，后续请求用 Table 自身 `loading`，默认 `bordered`、`size="small"`。
4. 服务端分页。
5. 加载失败 `Alert + 重试`。
6. 编辑、删除动作按 `actions` 开关。
7. 删除默认 `Popconfirm`。
8. 样式只加列表必要的类。

验收：

- `tsc` 通过。
- 组件可从包根导入。

## 阶段 5：测试

文件：

- `packages/lib/__tests__/01-basic.spec.tsx`
- `packages/lib/__tests__/02-list.spec.tsx`

任务：

1. 现有测试改用 `SchemaCrudForm` 和新全局配置名。
2. 新增列表测试：
   - 初始请求；
   - 翻页与 pageSize；
   - params 重置页码；
   - 旧响应丢弃；
   - 加载失败重试；
   - 非法响应结构；
   - 自动列和 presets；
   - 行内编辑；
   - 删除确认与刷新；
   - 删除当前页最后一条回退；
   - actions 隐藏。

验收：

- `vitest run` 全部通过。

## 阶段 6：示例与路由

文件：

- `packages/example/package.json`
- `packages/example/src/app.tsx`
- `packages/example/src/pages/posts/index.tsx`
- `packages/example/src/pages/posts/create.tsx`
- `packages/example/src/pages/posts/detail.tsx`
- `packages/example/src/pages/posts/edit.tsx`
- `packages/example/src/pages/posts/list-presets.ts`
- 删除 `use-post-list.ts`、`post-summary.tsx`

任务：

1. 安装 `react-router-dom`。
2. 四个路由：`/posts`、`/posts/new`、`/posts/:id`、`/posts/:id/edit`。
3. 列表页用 `SchemaCrudList` 和 `postListPresets`。
4. 新建、详情、编辑用 `SchemaCrudForm`。
5. 删除旧的手写列表逻辑。

验收：

- example `tsc`、`vite build` 通过。
- 路由跳转路径与 spec 一致。

## 阶段 6.1：路由页码

- `SchemaCrudList` 增加受控 `page` 和 `onPageChange(page, pageSize)`。
- 示例用 `useSearchParams` 把 `page`、`size` 写进 URL。
- 覆盖刷新保留页码、外部 page 变化和翻页回调测试。

## 阶段 6.2：移除列表查看入口

- 删除列表 `onView`、`actions.view`、整行点击跳转和查看按钮。
- 列表操作列只保留编辑、删除。

## 阶段 6.3：修正表单按钮与布局

- 修复 Lightning CSS 不支持 `&__x` 导致的样式失效。
- 底部按钮恢复左右分布，移除标题栏重复返回。
- 表单默认横向，标签列固定 120px。

## 阶段 6.4：列隐藏

- 增加 `ListPresetField.hidden`，只影响 schema 推导列。
- 示例用 `is_sticky: { hidden: true }` 去掉置顶列。

## 阶段 6.5：底部工具栏

- footer 改为独立工具栏：上边框、浅灰背景、贴合 Card 底部。
- create 的取消与创建统一靠右；删除保持左侧。

## 阶段 6.6：标题返回图标

- 标题左侧增加图标返回，`onBack` 存在时显示。
- 底部取消/返回文本按钮保留。

## 阶段 6.7：删除并入右侧操作组

- 删除从左侧移到右侧操作组最前。
- footer 只保留一个右对齐动作组。

## 阶段 7：收尾

任务：

1. 更新 `packages/lib/README.md`、`llms.txt`、根 README。
2. 运行 `tsc`、`vitest`、`tsup`、example 构建。
3. 更新设计文档状态和计划状态。
4. 提交代码与文档。

验收：

- 无旧 API 名残留。
- 构建产物可发布。
