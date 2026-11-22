# 查询插件（query plugins）

日期：2026-11-22

状态：已确认

关系：在 `2026-11-22-crud-list-query-design.md` 之上增加内置查询 UI。`query.slots` 仍是查询区的唯一公开入口；plugin 只是生成 slot 的工厂，不是第二套查询配置 API。

## 结论

新增 `queryPlugins`，先内置两个插件：

- `queryPlugins.keywords()`：关键词搜索。
- `queryPlugins.status()`：状态选择。

同时提供公开的 `defineQueryPlugin()`，外部项目可以按同一契约定义自己的 plugin。内置和外部 plugin 最终都返回 `CrudListQuerySlot<TValues>`，业务仍然只写 `query.slots`。

```tsx
import { queryPlugins } from '@jswork/antd-form-schema-crud';

<SchemaCrudList<TradeNoteRecord, TradeNoteQuery>
  resource="trade_notes"
  query={{
    defaultValues: { keywords: undefined, status: undefined },
    slots: {
      headerStart: queryPlugins.status<TradeNoteQuery>({
        options: [
          { value: 'open', label: '进行中' },
          { value: 'done', label: '已完成' },
        ],
      }),
      headerEnd: queryPlugins.keywords<TradeNoteQuery>({
        placeholder: '搜索标题',
        autoFocus: true,
      }),
    },
  }}
/>;
```

不新增 `query.plugins`、`query.controls`、`query.render` 或 `position` 字段。

## 问题

`query.slots` 已经能承载任意 UI，但常见查询控件会在多个业务里重复实现：

- `Input.Search` 的草稿值、回车提交、清空、URL 回填。
- `Select` 的状态选项、清空、URL 回填、页码回退。
- 查询值变化后统一回第 1 页。
- 外部 `reset()` 后控件显示同步。

当前 `trade-notes` 已经在项目内实现了一个共享搜索组件，但这类通用能力更适合内置到库包，避免每个宿主项目再维护一份。

## 目标

- 提供可直接放进 `query.slots` 的内置查询 UI。
- 提供统一的 `defineQueryPlugin()`，外部项目可以定义自己的插件。
- 保持查询值和 URL 同步逻辑只由 `SchemaCrudList` 负责。
- 关键词和状态的行为、默认值、清空语义一致。
- 内置 plugin 与外部 plugin 共用同一套 factory / slot 契约。
- plugin 可以与业务自写 slot、其他 plugin 混用。
- plugin 不读取、不缓存、不复制 query 状态。
- 不改变现有 `query.slots`、`defaultValues`、`params`、分页和 URL 语义。

## 非目标

- 不新增 `query.plugins` 字段。
- 不新增查询控件注册表或动态 plugin 注册。
- 不提供完整筛选表单、栅格布局、字段联动。
- 不支持嵌套对象查询值。
- 不内置日期范围、多选标签等额外插件。
- 不改变 `SchemaCrudForm`。
- 不把 plugin 做成独立 npm 子包。

## 公开 API

```ts
import type { ReactNode } from 'react';
import type { SizeType } from 'antd/es/config-provider/SizeContext';
import type { CrudListQuerySlot } from './types';

export interface CrudQueryKeywordsPluginConfig {
  /** 查询值 key，默认 keywords。 */
  queryKey?: string;
  placeholder?: string;
  /** 输入框宽度，默认 240。 */
  width?: number | string;
  size?: SizeType;
  allowClear?: boolean;
  enterButton?: boolean | ReactNode;
  /** 页面进入时聚焦，默认 false。 */
  autoFocus?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export interface CrudQueryStatusOption<TValue extends string | number = string> {
  value: TValue;
  label: ReactNode;
}

export interface CrudQueryStatusPluginConfig<
  TValue extends string | number = string
> {
  /** 查询值 key，默认 status。 */
  queryKey?: string;
  options: readonly CrudQueryStatusOption<TValue>[];
  placeholder?: ReactNode;
  /** 选择框宽度，默认 120。 */
  width?: number | string;
  size?: SizeType;
  allowClear?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export interface CrudQueryPlugins {
  keywords<TValues extends Record<string, any>>(
    config?: CrudQueryKeywordsPluginConfig
  ): CrudListQuerySlot<TValues>;

  status<
    TValues extends Record<string, any>,
    TValue extends string | number = string
  >(
    config: CrudQueryStatusPluginConfig<TValue>
  ): CrudListQuerySlot<TValues>;
}

export const queryPlugins: CrudQueryPlugins;

/** 外部 plugin factory 的统一签名。 */
export type CrudQueryPlugin<
  TValues extends Record<string, any>,
  TConfig = void
> = (config: TConfig) => CrudListQuerySlot<TValues>;

export interface CrudQueryPluginDefinition<
  TValues extends Record<string, any>,
  TConfig = void
> {
  /** 调试名，只用于文档和错误信息，不做全局注册。 */
  name: string;
  create: (config: TConfig) => CrudListQuerySlot<TValues>;
}

export function defineQueryPlugin<
  TValues extends Record<string, any>,
  TConfig = void
>(
  definition: CrudQueryPluginDefinition<TValues, TConfig>
): CrudQueryPlugin<TValues, TConfig>;
```

类型导出：

- `CrudQueryKeywordsPluginConfig`
- `CrudQueryStatusPluginConfig`
- `CrudQueryStatusOption`
- `CrudQueryPlugins`
- `CrudQueryPlugin`
- `CrudQueryPluginDefinition`
- `defineQueryPlugin`

## keywords plugin

默认配置：

```ts
{
  queryKey: 'keywords',
  placeholder: '搜索',
  width: 240,
  size: 'small',
  allowClear: true,
  enterButton: true,
  autoFocus: false,
}
```

行为：

- 输入时只更新组件内部草稿，不发请求。
- 按 Enter 或点击搜索按钮时提交。
- 提交前 `trim()`；空字符串转为 `undefined`，从查询值和请求中移除。
- `allowClear` 清空时立即提交 `undefined`，并回第 1 页。
- 外部查询值变化时，草稿同步：
  - URL 初始读取。
  - `reset()`。
  - 其他 slot 修改同一个 key。
- 不使用 `defaultValue`；初始值只来自 `query.defaultValues` 和 URL。
- 查询值变化导致的页码回退由 `context.setValues` 统一处理，plugin 不直接改 URL。

## status plugin

默认配置：

```ts
{
  queryKey: 'status',
  placeholder: '全部状态',
  width: 120,
  size: 'small',
  allowClear: true,
}
```

行为：

- 选择后立即 `setValues({ status })`，默认回第 1 页。
- 清空时提交 `undefined`。
- 选项值支持 `string | number`。
- 不内置颜色、图标、状态字典；`label` 由业务提供。
- 查询值 key 默认 `status`，允许通过 `queryKey` 映射到其他字段。
- 初始值只来自 `query.defaultValues` 和 URL。

## 使用位置

plugin 返回的是 slot 函数，位置完全由业务选择：

```tsx
query={{
  defaultValues: { keywords: undefined, status: undefined },
  slots: {
    headerStart: queryPlugins.status<TradeNoteQuery>({ options }),
    headerEnd: queryPlugins.keywords<TradeNoteQuery>(),
    body: ({ values }) => values.status === 'unknown' ? <Alert /> : null,
  },
}}
```

- `headerStart`：位于内置动作之前。
- `headerEnd`：位于内置动作之后。
- `body`：位于 Card body 顶部、表格之前。
- 一个 slot 可以同时放多个 plugin；多个 slot 也可以各自放 plugin。
- plugin 和普通 slot 可以共存。

## 多 plugin 共存

允许同一页面同时使用任意多个 plugin。所有实例共享同一个 `query.values` / `setValues` / `reset`，不会创建第二份查询状态。

不同 slot：

```tsx
slots: {
  headerStart: queryPlugins.status<TradeNoteQuery>({ options }),
  headerEnd: queryPlugins.keywords<TradeNoteQuery>(),
}
```

同一个 slot：

```tsx
slots: {
  headerStart: (context) => (
    <>
      {queryPlugins.status<TradeNoteQuery>({ options })(context)}
      {queryPlugins.keywords<TradeNoteQuery>()(context)}
    </>
  ),
}
```

约束：

- 每个 plugin 必须使用不同的 `queryKey`；同一 key 的多个控件会读写同一个值，后写入覆盖先写入。
- 不做运行时重复 key 拦截；`defaultValues`、`urlKeys` 由业务保证覆盖所有 plugin 的 key。
- 多个 plugin 的顺序由业务在 slot 中决定，库不规定固定顺序。
- 不提供 `queryPlugins.compose()` 等额外组合 API；需要同 slot 多控件时直接用 Fragment。

## 外部 plugin

外部项目通过 `defineQueryPlugin()` 定义，和内置 plugin 使用同一契约：

```tsx
import { defineQueryPlugin } from '@jswork/antd-form-schema-crud';
import { Select } from 'antd';

interface ReportQuery {
  level?: number;
}

interface LevelPluginConfig {
  queryKey?: string;
  options: readonly { value: number; label: React.ReactNode }[];
}

const levelPlugin = defineQueryPlugin<ReportQuery, LevelPluginConfig>({
  name: 'level',
  create: ({ queryKey = 'level', options }) =>
    (context) => (
      <Select
        allowClear
        size="small"
        style={{ width: 120 }}
        value={context.values[queryKey]}
        options={options}
        onChange={(value) =>
          context.setValues({ [queryKey]: value } as Partial<ReportQuery>)
        }
      />
    ),
});
```

使用：

```tsx
slots: {
  headerStart: levelPlugin({
    options: [
      { value: 1, label: '低' },
      { value: 2, label: '中' },
      { value: 3, label: '高' },
    ],
  }),
}
```

规则：

- `name` 只是调试名，不做全局注册，也不要求全局唯一。
- `create(config)` 必须返回 `CrudListQuerySlot<TValues>`。
- plugin 只通过 `context.values` / `context.setValues` / `context.reset` / `context.loading` 访问列表。
- `create()` 在渲染阶段执行，不应直接在 `create()` 里调用 React hooks。需要 hooks 时，返回一个自有组件：`create: (config) => (context) => <LevelControl ... />`，hooks 放在 `LevelControl` 内。
- 外部 plugin 不获得列表实例、不直接写 URL、不直接调用 API。
- 默认值仍然只能由 `query.defaultValues` 提供，plugin 不持有默认值。

## defaultValues 与 reset

plugin 不拥有默认值。`query.defaultValues` 仍是唯一基线：

- 所有 plugin 读同一份 `context.values`。
- `reset()` 后所有 plugin 自动显示基线值。
- `reset({})` 后关键词输入框清空、状态选择框为空。
- plugin 不保存额外本地状态作为真实查询值；keywords 的本地状态只用于编辑中的草稿。

## URL

沿用现有规则：

- 默认同步到 URL。
- `urlKeys` 可把 `keywords` 映射为 `q`。
- `url: false` 时 plugin 仍正常工作，只是不读写 URL。
- 清空 plugin 值会从 URL 移除对应 key。
- plugin 不自行调用 `setSearchParams`。

## 实现结构

新增目录：

```text
packages/lib/src/components/query/plugins/
├── index.ts
├── define.ts
├── keywords.tsx
├── status.tsx
└── types.ts
```

职责：

- `types.ts`：plugin config、`CrudQueryPlugin`、`CrudQueryPluginDefinition` 类型。
- `define.ts`：`defineQueryPlugin()` 运行时包装。
- `keywords.tsx`：内部 `KeywordsPlugin` 展示组件和 `queryPlugins.keywords()`。
- `status.tsx`：内部 `StatusPlugin` 展示组件和 `queryPlugins.status()`。
- `index.ts`：导出 `queryPlugins`、`defineQueryPlugin` 和类型。

内置 plugin 也通过 `defineQueryPlugin()` 定义，保证和外部 plugin 使用同一条创建路径。

入口 `src/index.tsx` 增加：

```ts
export { queryPlugins } from './components/query/plugins';
export type {
  CrudQueryKeywordsPluginConfig,
  CrudQueryStatusPluginConfig,
  CrudQueryStatusOption,
  CrudQueryPlugins,
} from './components/query/plugins';
```

## 测试

新增 `__tests__/06-query-plugins.spec.tsx`，覆盖：

- `keywords` 初始值来自 `defaultValues`，首请求带上该值。
- 输入不发请求；回车提交后请求带上 trim 后的值。
- 清空后查询值和请求去掉 `keywords`，URL 去掉对应参数。
- URL 初始值回填到输入框。
- 外部 `reset()` 后输入框同步清空。
- `status` 选项渲染、选择后请求带值并回第 1 页。
- `status` 清空后请求去掉值。
- 两个 plugin 同时使用时共享同一份查询状态。
- plugin 与普通 slot 混用时渲染顺序不变。
- `defineQueryPlugin()` 定义的外部 plugin 可正常渲染、读写 context 和触发请求。
- 外部 plugin 与内置 plugin 可以同时使用。

## 文档

- `packages/lib/README.md` 增加 plugins 小节。
- `packages/lib/llms.txt` 增加机器可读说明。
- `packages/example` 的 posts 列表演示 `status + keywords`。
- `jsw-admin` 的 `trade-notes` 改用 `queryPlugins.keywords()`，并移除项目内临时共享搜索组件。

## 兼容性

- 现有业务只使用 `query.slots`，无需迁移。
- `queryPlugins` 是新增导出，不影响已有 API。
- 不改变 `SchemaCrudList` props 结构。
- 不改变 `query.defaultValues`、`urlKeys`、`url` 和分页行为。

## 验收标准

- 查询区仍只有 `query.slots` 一种入口。
- 内置 plugin 和 `defineQueryPlugin()` 定义的外部 plugin 可以直接放进任意 slot。
- 外部 plugin 不需要修改库源码，也不需要全局注册。
- 多个 plugin 共享同一份查询状态，且不同 `queryKey` 互不覆盖。
- 查询、清空、URL 回填、reset、页码回退行为一致。
- `keywords` 输入过程中不请求。
- 不产生重复请求。
- 现有 97 个测试继续通过，新增 plugin 测试通过。
- `tsc --noEmit`、`tsup` 构建通过。

## 待确认

1. plugin 命名使用 `queryPlugins.keywords()` / `queryPlugins.status()` 是否可以。
2. `keywords` 默认不自动聚焦，`trade-notes` 是否显式开启 `autoFocus`。
3. 是否在 `trade-notes` 删除项目内 `src/shared/components/list-search`，改用库内置 plugin。
4. 每个实施节点单独 commit，是否按计划文档中的提交边界执行。
