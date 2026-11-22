# CrudList Query Slots 实施计划

日期：2026-11-22

依据：`docs/superpowers/specs/2026-11-22-crud-list-query-design.md`

状态：已完成（2026-11-22）

## 实施原则

- 只实现 `query.slots` 一种查询区接入方式。
- 查询值、默认值、URL 同步、页码回退都由库内部处理。
- `params` 保持固定参数语义；请求合并时 `params` 覆盖同名查询值。
- 不引入 registry、Provider、内置 controls 或受控查询状态。
- 每阶段保持 `tsc` 与现有测试可运行。

## 阶段 1：类型

文件：

- `packages/lib/src/types.ts`
- `packages/lib/src/index.tsx`

任务：

1. 新增 `CrudListQueryContext`、`CrudListQuerySlot`、`CrudListQuerySlots`。
2. 新增 `CrudListQueryDefaults`、`CrudListQuerySourceContext`、`CrudListQueryUrlKeys`、`CrudListQueryConfig`。
3. `SchemaCrudListProps` 增加 `query?: CrudListQueryConfig`。
4. 从包根导出全部公开类型。

验收：

- 公开类型完整，`tsc` 通过。

## 阶段 2：查询状态

新增：

- `packages/lib/src/hooks/use-crud-list-query.ts`
- `packages/lib/src/utils/query.ts`

任务：

1. 挂载时同步计算初始值：URL > `defaultValues` > 空对象。
2. 惰性 `defaultValues` 只执行一次，函数异常降级为空对象并警告。
3. 统一移除 `undefined` / `null`，保留空字符串。
4. `setValues` 支持对象与函数 patch，stable 比较去重。
5. `reset()` 恢复默认基线，`reset({})` 清空，`reset(values)` 使用指定值。
6. 返回 `values` / `setValues` / `reset`。
7. `utils/query` 提供 URL 读取、URL 写入和请求参数合并。
8. 查询值变化时通过内部 ref 标记是否重置页码。

验收：

- 初始值、重置、清空、函数 patch 和 stable 去重有单测。

## 阶段 3：分页配合

文件：

- `packages/lib/src/hooks/use-crud-list.ts`
- `packages/lib/src/components/list/use-schema-crud-list-state.ts`

任务：

1. `useCrudList` 接收 `paramsResetPageRef`，`params` 变化时默认回第 1 页。
2. `setValues(..., { resetPage: false })` 时保留当前页。
3. 列表 state 接收合并后的查询参数，请求 payload 为 `{ ...query.values, ...params, page, size }`。
4. `params` 与查询值同名时 `params` 覆盖，并只警告一次。

验收：

- 查询变化回第 1 页、保留页码和请求合并有单测。

## 阶段 4：Slots UI

新增：

- `packages/lib/src/components/query/query-slots.tsx`
- `packages/lib/src/components/list/schema-crud-list-query.tsx`

修改：

- `packages/lib/src/components/list/list-toolbar.tsx`
- `packages/lib/src/components/list/schema-crud-list-render.tsx`
- `packages/lib/src/styles/index.css`

任务：

1. 解析 `before` / `headerStart` / `headerEnd` / `body` 四个 slot。
2. slot 函数接收同一份 `values` / `setValues` / `reset` / `loading`。
3. `before` 在 Card 之前；header 进入 Card extra；`body` 在 Alert 和表格之前。
4. toolbar 增加 `queryStart` / `queryEnd`，没有动作但有查询 slot 时仍渲染。
5. 未配置 `query` 时 DOM 不变。

验收：

- 四个位置和顺序有渲染测试。
- 空 slot 不产生占位。

## 阶段 5：Router URL 同步

文件：

- `packages/lib/src/components/list/schema-crud-list-route.tsx`
- `packages/lib/src/utils/query.ts`

任务：

1. route 模式提供 `searchParams` / `location` 给查询初始化。
2. 查询变化时用一次 `setSearchParams` 写入查询 key 和 `page=1`。
3. 查询值删除时移除对应 URL key。
4. `urlKeys` 支持数组和 `{ 查询 key: URL key }`。
5. `params`、`page`、`size` 不进入查询 URL；冲突时分页优先。
6. 无 Router 或 `url: false` 时只保留内存状态。
7. 初始默认值写回 URL，只写已定义值，不额外发请求。

验收：

- URL 读取、写回、replace、key 映射和编辑页返回保留有单测。

## 阶段 6：测试与收尾

任务：

1. 新增 `packages/lib/__tests__/05-query.spec.tsx`。
2. 覆盖默认值、reset、URL、slot 位置、请求合并、页码回退。
3. 运行 `vitest run`、`tsc --noEmit`、`tsup`。
4. 更新 README / llms 中列表 API 说明（如存在）。
5. 版本从 `1.0.4` 升到 `1.0.5`。
6. 计划状态更新为已完成。
</content>
