# 查询插件（query plugins）实施计划

日期：2026-11-22

状态：执行中

设计文档：`docs/superpowers/specs/2026-11-22-query-plugins-design.md`

约束：确认后执行；每个节点独立 commit，节点内测试通过后再进入下一个节点。

## 提交边界

| 节点 | 内容 | commit message |
| --- | --- | --- |
| 0 | 设计与实施文档 | `docs(query): define query plugins` |
| 1 | 外部 plugin 定义 API | `feat(query): add defineQueryPlugin` |
| 2 | keywords plugin | `feat(query): add keywords plugin` |
| 3 | status plugin | `feat(query): add status plugin` |
| 4 | 导出、文档、版本与构建 | `feat(query): export query plugins` |
| 5 | example 演示 | `feat(example): demo query plugins` |
| 6 | jsw-admin trade-notes 接入 | `feat(trade-notes): use keywords query plugin` |

跨仓库提交分别执行，不把两个仓库的改动放进同一个 commit。

## 节点 0：文档

改动：

- `docs/superpowers/specs/2026-11-22-query-plugins-design.md`
- `docs/superpowers/plans/2026-11-22-query-plugins-implementation.md`

验证：

- 文档中的内置 plugin、外部 plugin、slot 约束、测试范围和提交边界一致。

Commit：

```text
docs(query): define query plugins
```

## 节点 1：外部 plugin 定义 API

改动：

- `packages/lib/src/components/query/plugins/types.ts`
- `packages/lib/src/components/query/plugins/define.ts`
- `packages/lib/src/components/query/plugins/index.ts`
- `packages/lib/__tests__/06-query-plugins.spec.tsx`（先覆盖外部 plugin）

公开类型：

```ts
export type CrudQueryPlugin<TValues, TConfig = void> =
  (config: TConfig) => CrudListQuerySlot<TValues>;

export interface CrudQueryPluginDefinition<TValues, TConfig = void> {
  name: string;
  create: (config: TConfig) => CrudListQuerySlot<TValues>;
}

export function defineQueryPlugin<TValues, TConfig = void>(
  definition: CrudQueryPluginDefinition<TValues, TConfig>
): CrudQueryPlugin<TValues, TConfig>;
```

实现要点：

- `defineQueryPlugin` 只做参数校验和 factory 包装，不维护全局注册表。
- `name` 作为调试名保留，不要求全局唯一。
- `create(config)` 返回标准 slot，禁止库内尝试持有额外状态。
- 测试一个外部 plugin 渲染、读取 context、调用 `setValues` 并触发请求。

测试：

```bash
cd packages/lib
./node_modules/.bin/vitest run __tests__/06-query-plugins.spec.tsx
```

Commit：

```text
feat(query): add defineQueryPlugin
```

## 节点 2：keywords plugin

改动：

- `packages/lib/src/components/query/plugins/keywords.tsx`
- `packages/lib/src/components/query/plugins/index.ts`
- `packages/lib/__tests__/06-query-plugins.spec.tsx`

实现要点：

- `queryPlugins.keywords<TValues>()` 通过 `defineQueryPlugin()` 创建。
- 返回 `CrudListQuerySlot<TValues>`。
- 输入时只更新本地草稿，不调用 `setValues`。
- 回车 / 搜索提交 `trim()` 后的值；空值写 `undefined`。
- 清空立即提交 `undefined`。
- 外部 `values` 变化和 `reset()` 同步草稿。
- 初始值只来自 `query.defaultValues` / URL。

测试：

- `defaultValues` 首请求。
- 输入不请求。
- 回车 trim 后请求。
- 清空移除 query 和 URL。
- URL 回填。
- `reset()` 同步输入框。

Commit：

```text
feat(query): add keywords plugin
```

## 节点 3：status plugin

改动：

- `packages/lib/src/components/query/plugins/status.tsx`
- `packages/lib/src/components/query/plugins/index.ts`
- `packages/lib/__tests__/06-query-plugins.spec.tsx`

实现要点：

- `queryPlugins.status<TValues, TValue>()` 通过 `defineQueryPlugin()` 创建。
- 选择立即 `setValues`，默认回第 1 页。
- 清空写 `undefined`。
- 选项支持 `string | number`，`label` 由业务传入。
- 不内置状态字典和颜色。
- `status + keywords` 同页共存，不同 queryKey 互不覆盖。
- 外部 plugin 和内置 plugin 可同时使用。

Commit：

```text
feat(query): add status plugin
```

## 节点 4：导出、文档、版本与构建

改动：

- `packages/lib/src/index.tsx`：导出 `queryPlugins`、`defineQueryPlugin` 与 plugin 类型。
- `packages/lib/README.md`：内置 plugin 和外部 plugin 用法。
- `packages/lib/llms.txt`：机器可读说明。
- `packages/lib/package.json`：版本从 `1.0.7` 升到 `1.0.8`。

验证：

```bash
cd packages/lib
./node_modules/.bin/vitest run
./node_modules/.bin/tsc --noEmit -p tsconfig.json
./node_modules/.bin/tsup
```

提交前确认：

- 全部测试通过。
- 产物中存在 `queryPlugins`、`defineQueryPlugin` 和对应类型。
- `README` 示例只用 `query.slots`。

Commit：

```text
feat(query): export query plugins
```

## 节点 5：example 演示

改动：

- `packages/example/src/pages/posts/list.tsx`
- 必要时更新 `packages/example/README.md`

内容：

- `headerStart` 使用 `queryPlugins.status()`。
- `headerEnd` 使用 `queryPlugins.keywords()`。
- 保留当前 `urlKeys`、`defaultValues` 和 URL 行为。
- 不保留手写 `Input.Search` / `Select` 查询逻辑。

验证：

```bash
cd packages/example
./node_modules/.bin/tsc --noEmit -p tsconfig.json
./node_modules/.bin/vite build
```

浏览器检查：

- 搜索回车后 URL 带 `q`。
- 状态选择后 URL 带 `status`，并回到第 1 页。
- 清空和刷新后回填正常。

Commit：

```text
feat(example): demo query plugins
```

## 节点 6：jsw-admin trade-notes 接入

前置：库包 `1.0.8` 已发布并在 `jsw-admin` 安装。

改动：

- `src/pages/admin/trade-notes/index.tsx`
- `src/pages/admin/trade-notes/_config.tsx`（仅保留需要的查询类型）
- 删除 `src/shared/components/list-search/index.tsx`，前提是确认没有其他引用。
- 如升级依赖，只把 `package.json` / `pnpm-lock.yaml` 中与本次相关的版本改动纳入提交。

目标代码：

```tsx
query={{
  defaultValues: { keywords: undefined },
  slots: {
    headerEnd: queryPlugins.keywords<TradeNoteQuery>({
      autoFocus: true,
    }),
  },
}}
```

验证：

```bash
pnpm eslint src/pages/admin/trade-notes/index.tsx --ext ts,tsx
pnpm ts-check
```

浏览器检查：

- 搜索框位置按最终 slot 选择确认。
- `?keywords=测试` 写入 URL。
- 刷新回填。
- 清空移除 URL 参数。
- 不产生重复请求。

已知基线：项目全量 `ts-check` 目前有既存 `src/pages/_app.tsx` PWA 类型错误；若仍存在，只报告，不在本节点顺手修。

Commit：

```text
feat(trade-notes): use keywords query plugin
```

## 不纳入本次提交

- `jsw-admin` 中用户已有的 `package.json` / `pnpm-lock.yaml` 版本改动，除非确认与本节点直接相关。
- `src/assets/styles/index.scss` 中历史 CKEditor 宽度调整。
- `src/pages/_app.tsx` 的 PWA 类型错误。

## 停止条件

出现以下情况立即停止，等待确认：

- 需要新增 `query.plugins` 或其他第二套查询入口。
- 需要全局 plugin 注册表或字符串引用。
- 需要修改现有 `query.defaultValues` / URL / 分页语义。
- 某个节点测试失败且无法在不扩大范围的情况下修复。
