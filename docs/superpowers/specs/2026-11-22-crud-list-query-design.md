# 列表外部查询参数机制（query.slots）

日期：2026-11-22

状态：已确认

关系：在 `2026-11-21-schema-resource-list-design.md` 与 `2026-11-21-schema-crud-v2-design.md` 之上，补充列表的查询参数层。`params` 继续承载固定参数，`query` 承载用户可变的筛选值。不改变现有分页、路由导航、删除和 action hook 的语义。

## 结论

`params` 是外部固定参数，`query` 是用户可变的查询条件。

查询区只有一种接入方式：**`query.slots`**。组件负责查询值状态、初始值、请求合并、页码回退和 URL 同步；业务只在四个预留槽位里写 UI。

`defaultValues` 属于整个查询实例，不属于某个 slot。所有 slot 共用同一份初始化和同一份 `values`。

```tsx
<SchemaCrudList
  resource="trade_notes"
  params={{ tenant_id: 1 }}
  query={{
    defaultValues: { keywords: undefined, status: 'open' },
    slots: {
      headerEnd: ({ values, setValues, reset }) => (
        <>
          <Input.Search
            allowClear
            placeholder="搜索"
            value={(values.keywords as string) ?? ''}
            onChange={(event) =>
              setValues({ keywords: event.target.value.trim() || undefined })
            }
          />
          <Button onClick={() => reset()}>重置</Button>
        </>
      ),
    },
  }}
/>
```

## 问题

`params` 适合“每次渲染把固定对象传进去”，不适合承载一个可交互的查询状态。业务如果自己管理查询值，会重复承担这些细节：

- 查询值状态和重置逻辑。
- 查询值变化后回第 1 页。
- 查询值同步到 URL，进入编辑页再返回时保留筛选条件。
- 固定参数和用户筛选参数混在同一个 `params` 里，语义不清。

## 目标

- 固定参数和查询参数职责分离。
- 查询状态、URL、页码回退和重置由列表统一处理。
- 查询区 UI 完全由业务决定，不绑定 Input.Search，也不内置筛选表单。
- 多个查询值、多个控件可以分布在不同 slot，但共享同一份状态。
- 只有一种查询区接入方式，不保留多套并存 API。
- 现有默认 Router 分页、导航和 `params` 用法不变。

## 非目标

- 不提供 `query.controls` / `query.controlsSlot`。
- 不提供单一 `query.render` 或 `position`。
- 不提供组件树外的查询控制器，包括 `useCrudListQuery` 和 query registry。
- 不提供完整筛选表单、筛选布局和 widget 配置。
- 不改变 `SchemaCrudForm`。
- 不支持嵌套对象查询值；URL 只同步标量和标量数组。
- 不做跨列表查询状态共享。一个列表实例只持有一份 `query`。
- 只预留四个固定 slot，不做动态 slot 注册。

## 公开 API

```ts
import type { ReactNode } from 'react';

export interface CrudListQueryContext<
  TValues extends Record<string, any> = Record<string, any>
> {
  /** 当前查询值，已去掉 undefined / null。 */
  values: Partial<TValues>;
  /** 合并查询值；默认回到第 1 页。 */
  setValues: (
    patch:
      | Partial<TValues>
      | ((current: Partial<TValues>) => Partial<TValues>),
    options?: { resetPage?: boolean }
  ) => void;
  /** 无参时恢复 defaultValues；传对象时使用该对象作为本次重置结果；都会回到第 1 页。 */
  reset: (values?: Partial<TValues>) => void;
  /** 当前列表请求状态。 */
  loading: boolean;
}

/** 所有 slot 使用同一种函数形态。 */
export type CrudListQuerySlot<
  TValues extends Record<string, any> = Record<string, any>
> = (context: CrudListQueryContext<TValues>) => ReactNode;

export interface CrudListQuerySlots<
  TValues extends Record<string, any> = Record<string, any>
> {
  before?: CrudListQuerySlot<TValues>;
  headerStart?: CrudListQuerySlot<TValues>;
  headerEnd?: CrudListQuerySlot<TValues>;
  body?: CrudListQuerySlot<TValues>;
}

/** defaultValues 函数拿到的路由上下文；无 Router 时两个字段都是 null。 */
export interface CrudListQuerySourceContext {
  searchParams: URLSearchParams | null;
  location: { pathname: string; search: string } | null;
}

export type CrudListQueryDefaults<
  TValues extends Record<string, any> = Record<string, any>
> =
  | Partial<TValues>
  | ((context: CrudListQuerySourceContext) => Partial<TValues>);

export type CrudListQueryUrlKeys =
  /** 只同步这些 key，URL key 与查询值 key 相同。 */
  | readonly string[]
  /** 查询值 key -> URL key；例如 { keywords: 'q' }。 */
  | Record<string, string>;

export interface CrudListQueryConfig<
  TValues extends Record<string, any> = Record<string, any>
> {
  /** 查询区的唯一入口，至少配置一个 slot。 */
  slots: CrudListQuerySlots<TValues>;
  /**
   * 初始查询值，也是 reset() 的默认基线。
   * 可以是对象，也可以是惰性函数；函数只在挂载时执行一次。
   */
  defaultValues?: CrudListQueryDefaults<TValues>;
  /** 是否同步到 URL；默认 true，无 Router 时自动忽略。 */
  url?: boolean;
  /** 同步范围或 key 映射；省略时同步全部标量 / 标量数组。 */
  urlKeys?: CrudListQueryUrlKeys;
}

export interface SchemaCrudListProps<TRecord extends CrudRecord = CrudRecord> {
  // ...existing
  params?: Record<string, any>;
  query?: CrudListQueryConfig;
}
```

需要字段类型提示时，业务侧可以给 `CrudListQueryConfig<{ keywords?: string; status?: string }>` 做标注。

## Slots

| slot | 位置 | 顺序 |
| --- | --- | --- |
| `before` | Card 之前，和 Card 同级 | 独立整行 |
| `headerStart` | Card `extra` 工具组内 | 新建 / 刷新 / 返回之前 |
| `headerEnd` | Card `extra` 工具组内 | 新建 / 刷新 / 返回之后 |
| `body` | Card body 内 | 状态 Alert 和表格之前 |

```tsx
query={{
  defaultValues: { keywords: undefined, status: 'open' },
  slots: {
    headerStart: ({ values }) => (
      <Tag>{values.status === 'open' ? '只看进行中' : '全部状态'}</Tag>
    ),
    headerEnd: ({ values, setValues, reset }) => (
      <Space wrap>
        <Input.Search
          allowClear
          placeholder="搜索"
          value={(values.keywords as string) ?? ''}
          onChange={(event) =>
            setValues({ keywords: event.target.value.trim() || undefined })
          }
        />
        <Button onClick={() => reset()}>重置</Button>
      </Space>
    ),
    body: ({ values, setValues }) => (
      <DateRangePicker
        value={values.range}
        onChange={(range) => setValues({ range })}
      />
    ),
  },
}}
```

规则：

- 所有 slot 都是 `(context) => ReactNode`，统一拿到 `values` / `setValues` / `reset` / `loading`。
- 不需要查询值的静态内容写成 `() => <Alert ... />`。
- 一个 slot 可以返回 Fragment 放多个控件；不同 slot 可以同时使用。
- 所有 slot 共用同一份查询值，不存在多份状态。
- slot 返回 `null` 或 `undefined` 时不产生占位。
- `before` 占满整行，只包普通容器，不加标题、边框和背景。
- `headerStart` / `headerEnd` 都在 Card `extra` 内并靠右，共用 `Space wrap` 自动换行。`headerStart` 是“新建按钮左边”，不是 Card 标题左侧。
- `body` 在 Card body 顶部、错误 Alert 之前。
- 只配置 header slot、没有内置动作按钮时，Card `extra` 仍然渲染。
- 未配置 `query` 时，列表 DOM 与现有实现一致。

## defaultValues

### 一份状态，不是每个 slot 各自默认

`defaultValues` 属于整个列表实例。所有 slot 读到的 `values` 都来自同一份初始化结果。

slot 里不要再写 `defaultValue` 或独立初始值，否则会出现列表请求和输入框显示不一致。

### 静态对象与惰性函数

```tsx
query={{
  defaultValues: () => ({
    keywords: localStorage.getItem('trade-notes:keywords') ?? undefined,
    status: 'open',
  }),
  slots: {
    headerStart: ({ values }) => (
      <Tag>{values.status === 'open' ? '进行中' : '全部'}</Tag>
    ),
    headerEnd: ({ values, setValues }) => (
      <Input.Search
        value={(values.keywords as string) ?? ''}
        onChange={(event) =>
          setValues({ keywords: event.target.value || undefined })
        }
      />
    ),
  },
}}
```

- 函数在首次挂载时执行一次，结果冻结为默认基线。
- 后续重渲染不会重新读取 localStorage。
- `reset()` 使用冻结的基线；`reset({})` 清空；`reset(values)` 临时使用传入值，但不改变后续基线。
- 函数必须同步返回，不支持 Promise。异步数据请等就绪后再渲染列表。
- 函数可以拿到 `searchParams` 和 `location`，用于转换特殊 URL 参数；常规 URL 读取交给 `urlKeys`。

### 初始化优先级

从高到低合并：

1. URL 中存在的查询 key
2. `defaultValues` 求值结果
3. 空对象

URL 上的 `?q=abc` 会覆盖 localStorage 里的 `keywords`。

## 请求与分页

请求 payload：

```ts
{
  ...query.values,
  ...params,
  [pageKey]: page,
  [sizeKey]: size,
}
```

优先级从低到高：`query.values` < `params` < `page` / `size`。

- `params` 和 `query.values` 同名时，`params` 生效，开发环境警告一次。
- `undefined` / `null` 从最终 payload 移除；空字符串保留。
- 空搜索需要变成“不搜索”时，在 `setValues` 前转成 `undefined`。
- 查询值变化默认回第 1 页；stable stringify 未变化时不重置页码，也不重复请求。
- `setValues(..., { resetPage: false })` 可以保留当前页。
- 翻页和查询变化同时发生时，只接受最后一次请求的响应，沿用现有 requestId 丢弃机制。

## URL 同步

默认开启，只在 Router 上下文生效。

- 初始加载：URL 查询 key 覆盖 `defaultValues`。
- `defaultValues` 中已定义的值会写回 URL，保证从 localStorage 来的筛选在编辑页返回后仍保留。
- 查询值变化使用 `replace`，不新增历史记录。
- 值变成 `undefined` / `null` 时删除对应 URL key。
- `reset({})` 清空并删除 key；`reset()` 恢复默认值并写回 URL。
- `params`、`page`、`size` 永不同步到查询 URL；查询 key 与分页 key 冲突时分页优先。
- `urlKeys` 传数组时只同步列出的 key；传对象时按 `查询值 key -> URL key` 映射。
- 支持 `string`、`number`、`boolean` 和由它们组成的数组；对象和函数跳过并警告。
- 无 Router 或 `url: false` 时，查询值只存在内存中；`defaultValues` 函数仍能拿到 `null` 的 `searchParams`。

回第 1 页时，查询 key 和 `page=1` 必须在一次 `setSearchParams` 中同时写入，避免两次导航和中间态。

## trade-notes 迁移

```tsx
import { SchemaCrudList } from '@jswork/antd-form-schema-crud';
import { tradeNotePageConfig } from './_config.tsx';

function QueryBar({
  values,
  setValues,
  reset,
}: CrudListQueryContext<{ keywords?: string }>) {
  return (
    <Space wrap>
      <Input.Search
        allowClear
        placeholder="搜索"
        value={values.keywords ?? ''}
        onChange={(event) =>
          setValues({ keywords: event.target.value.trim() || undefined })
        }
      />
      <Button onClick={() => reset()}>重置</Button>
    </Space>
  );
}

export default () => (
  <SchemaCrudList
    resource={tradeNotePageConfig.resource}
    schema={tradeNotePageConfig.schema}
    title={tradeNotePageConfig.title}
    columns={tradeNotePageConfig.columns}
    query={{
      defaultValues: () => ({
        keywords: localStorage.getItem('trade-notes:keywords') ?? undefined,
      }),
      slots: {
        // 放在“刷新”右边；改成 headerStart 就放到“新建”左边。
        headerEnd: (context) => <QueryBar {...context} />,
      },
    }}
  />
);
```

迁移后删除页面里的 `keywords` state、`useSearchParams` 和手写 `params`。搜索条件进入 URL，编辑页返回后保留；清空搜索会删除 `keywords` 并回到第 1 页。

## 实现拆分

- `types.ts`：新增 query 相关类型。
- `hooks/use-crud-list-query.ts`：查询值状态、初始化、重置、stable 比较。
- `hooks/use-crud-list-query-url.ts`：URL 读取与写回，只处理查询 key，保留 page / size。
- `components/query/query-slots.tsx`：调用四个 slot 函数。
- `components/list/schema-crud-list-query.tsx`：组装四组 slot 节点。
- `components/list/list-toolbar.tsx`：新增 `queryStart` / `queryEnd`。
- `components/list/schema-crud-list-render.tsx`：把节点接到对应位置。
- `hooks/use-crud-list.ts`：接收合并后的 `queryParams`。

## 边界情况

- `defaultValues` 只在挂载时求值一次；对象或函数变化不会自动重置当前值。
- `defaultValues` 抛错时按空对象处理，开发环境输出错误，不阻断列表加载。
- URL 非法编码原样保留；重复 key 解析为数组。
- 查询值变化时正在删除记录：删除不取消，reload 使用最新查询值。
- 列表 blocked 时查询区仍可渲染，但不会发请求。
- 无 Router 时忽略 URL，使用 `defaultValues`。
- `slots: {}` 时开发环境警告，不改变列表行为。

## 验收

- `setValues` 合并 patch，请求带新值并回第 1 页。
- 值未变化不重复请求，不重置页码。
- `reset()` / `reset({})` / `reset(values)` 行为正确，均回第 1 页。
- 惰性 `defaultValues` 只执行一次，能拿到 `searchParams` / `location`。
- URL 初始值覆盖 `defaultValues`；localStorage 默认值会写回 URL。
- 从列表进入编辑页再返回，查询条件和页码保留。
- `params` 与查询 key 同名时 `params` 覆盖。
- `undefined` / `null` 不进入请求；空字符串保留。
- URL 变化使用 `replace`，查询 key 和 `page=1` 一次写入。
- `urlKeys` 的数组和映射两种形式都正确。
- 分页 key 冲突时分页优先并警告。
- 四个 slot 的渲染位置和顺序正确，多 slot 同时生效。
- 未配置 `query` 时原有 DOM 不变。
- 现有测试、tsc、tsup、example build 通过。
</content>
