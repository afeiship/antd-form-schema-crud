# 业务字段配置：列表字段与详情字段分离

日期：2026-11-21

状态：已确认（2026-11-21）

关系：在 `SchemaCrudForm` / `SchemaCrudList` 现有 API 上补充字段选择能力。业务仍然只维护一份 schema，但每个业务模块可以通过独立配置决定列表显示哪些字段、详情显示哪些字段。

## 一句话边界

列表和详情通常使用同一份数据 schema，但展示字段不同。库不复制 schema，而是增加两个字段选择入口：列表用 `fields`，详情用 `viewFields`；每个业务在自己的配置文件中声明这两组字段。

## 问题

当前 `SchemaCrudList` 会从 `schema.fields` 推导全部可展示列，`SchemaCrudForm` 在 `mode="view"` 时会渲染全部字段。真实业务里两者经常不同：

- 列表只展示标题、状态、更新时间，详情需要展示正文、备注、创建人等更多字段；
- 某些字段只适合表单编辑，详情不需要展示；
- 列表列顺序通常按运营阅读习惯排列，与表单字段顺序不同；
- 用 `presets.fields[key].hidden` 逐个隐藏字段时，配置分散，无法直接表达“这个业务列表到底有哪些字段”。

结论：每个业务需要一个显式配置项，分别声明列表字段和详情字段；组件负责按配置筛选并保持顺序。

## 目标

- 每个业务模块有一份可读的字段配置，明确列出列表字段、详情字段。
- 列表字段支持顺序、只展示指定字段、跳过不存在或 `hidden` 的字段。
- 详情字段只影响 `mode="view"`，不影响新建和编辑。
- 保留现有显式 `columns`、`presets`、schema 推导规则。
- 不复制 schema，不新增第二套表单 schema。
- 示例项目演示“列表字段少于详情字段”的配置方式。

## 非目标

- 不做字段分组、Tabs、折叠面板、详情自定义布局。
- 不做列表字段和详情字段的远程配置、权限控制。
- 不自动把列表字段映射成详情字段。
- 不为每个业务新增公共 `ResourceConfig` 类型；业务配置是业务自己的普通对象。
- 不改变 `SchemaCrudForm` 的 create / edit 字段集合。

## 公共 API

### SchemaCrudList

```ts
interface SchemaCrudListProps<TRecord extends CrudRecord = CrudRecord> {
  /**
   * 仅用于 schema 推导列：按数组顺序只展示这些字段。
   * 不传 = 全部；空数组 = 不展示数据列，只剩操作列。
   * 显式 columns 优先，传了 columns 时忽略 fields。
   */
  fields?: readonly string[];
}
```

### SchemaCrudForm

```ts
interface SchemaCrudFormProps<TRecord = CrudRecord> {
  /**
   * 仅 mode="view" 生效：按数组顺序只展示这些字段。
   * 不传 = 全部；空数组 = 不展示字段。
   * mode="create" / "edit" 永远使用完整 schema。
   */
  viewFields?: readonly string[];
}
```

### 列优先级

`schema` 推导列表列时：

1. 显式 `columns`：完全按业务列定义，不走 `fields` 过滤。
2. `fields`：只保留命中 key 的 schema 字段，顺序以 `fields` 为准。
3. `presets`：补充标题、宽度、对齐、省略、固定等展示属性。
4. `schema.fields`：提供字段本身；没有 `label` 且没有 preset 标题的字段仍跳过。

约束：

- `fields` 里的 key 在 schema 中不存在：忽略，不报错。
- schema 字段自身 `hidden: true`：继续跳过，即使出现在 `fields` 中。
- `presets.fields[key].hidden`：继续生效，作为全局或业务级隐藏规则。
- `fields` 只影响列表列，不影响表单、schema 和接口 payload。

### 详情字段优先级

1. `mode !== "view"`：忽略 `viewFields`，使用完整 schema。
2. `mode === "view"` 且 `viewFields` 有值：按数组顺序保留命中的 schema 字段。
3. `mode === "view"` 且 `viewFields` 未传：保持现状，展示全部字段。
4. 不存在的 key 或 schema 自身 `hidden: true` 的字段：忽略。
5. `viewFields` 不改 `initialValues`、`normalizeValues`、校验规则或提交数据。

## 业务配置项目

每个业务模块新增一个 `config.ts`，把资源级配置集中在一处，页面只消费配置：

```ts
// packages/example/src/pages/posts/config.ts
import type { FormSchema } from '@jswork/antd-form-schema';
import type { ListPresets } from '@jswork/antd-form-schema-crud';
import { postSchema } from './schema';
import { postListPresets } from './list-presets';

export interface PostPageConfig {
  resource: 'posts';
  title: string;
  schema: FormSchema;
  list: {
    fields: string[];
    presets?: ListPresets;
  };
  detail: {
    fields: string[];
  };
}

export const postPageConfig: PostPageConfig = {
  resource: 'posts',
  title: '文章',
  schema: postSchema,
  list: {
    fields: ['title', 'subtitle', 'status'],
    presets: postListPresets,
  },
  detail: {
    fields: ['title', 'subtitle', 'status', 'is_sticky'],
  },
};
```

列表页：

```tsx
<SchemaCrudList
  resource={postPageConfig.resource}
  schema={postPageConfig.schema}
  title={postPageConfig.title}
  fields={postPageConfig.list.fields}
  presets={postPageConfig.list.presets}
  onCreate={...}
  onEdit={...}
/>
```

详情页：

```tsx
<SchemaCrudForm
  resource={postPageConfig.resource}
  schema={postPageConfig.schema}
  title={postPageConfig.title}
  id={id}
  mode="view"
  viewFields={postPageConfig.detail.fields}
  onBack={...}
  onModeChange={...}
/>
```

编辑页仍使用同一份 schema，不传 `viewFields`，因此编辑字段不受详情配置影响。

## 示例口径

文章示例的差异：

- 列表：标题、副标题、状态。
- 详情：标题、副标题、状态、置顶。
- 编辑：完整 schema，包含置顶、状态等全部字段。

`is_sticky` 从列表 presets 里的 `hidden: true` 改为不在 `list.fields` 中出现。`hidden` 能力保留，但业务配置优先用显式字段列表表达意图。

## 兼容性

- 两个新 prop 都可选，不传时行为与当前版本完全一致。
- 现有 `presets.hidden`、显式 `columns` 行为不变。
- 包版本继续保持 `2.0.0`。
- 不修改 `CrudListParams` / `CrudListResult` / API 解析。

## 测试与验收

新增测试：

1. 列表 `fields` 按声明顺序输出列，未声明字段不渲染。
2. 列表显式 `columns` 存在时忽略 `fields`。
3. 列表 `fields` 中的未知 key、schema `hidden` 字段被忽略。
4. 列表 `fields=[]` 时只剩操作列。
5. 详情 `viewFields` 只在 `mode="view"` 生效。
6. create / edit 不受 `viewFields` 影响。
7. `viewFields` 不修改传入 schema，也不影响提交值。
8. 示例列表不出现置顶，详情仍显示置顶。

验收命令：

```shell
cd packages/lib
./node_modules/.bin/tsc --noEmit -p tsconfig.json
./node_modules/.bin/vitest run
./node_modules/.bin/tsup

cd ../example
./node_modules/.bin/tsc --noEmit -p tsconfig.json
./node_modules/.bin/vite build
```

## 文档同步

- `packages/lib/README.md`：新增 `fields` / `viewFields` 用法和优先级。
- `packages/lib/llms.txt`：补充字段选择 API。
- 本设计文档和实施计划。
- 现有列表设计文档补充 `fields`，现有 v2 表单设计补充 `viewFields`。
