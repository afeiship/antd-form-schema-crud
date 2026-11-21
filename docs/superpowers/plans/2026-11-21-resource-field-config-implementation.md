# 业务字段配置实施计划

日期：2026-11-21

依据：`docs/superpowers/specs/2026-11-21-resource-field-config-design.md`

状态：已执行（2026-11-21）

## 实施原则

- 只增加两个可选 prop：`SchemaCrudList.fields`、`SchemaCrudForm.viewFields`。
- 不复制 schema，不引入第二套表单 schema。
- 未传新 prop 时保持当前行为，现有测试不能回归。
- 业务配置由示例或业务项目自己维护，库不新增 `ResourceConfig` 类型。
- 每步保持 `tsc --noEmit` 和现有测试通过后再进入下一步。

## 阶段 1：类型与字段选择工具

文件：

- `packages/lib/src/types.ts`
- `packages/lib/src/utils/list.ts` 或新增 `packages/lib/src/utils/schema.ts`
- `packages/lib/src/index.tsx`

任务：

1. `SchemaCrudListProps` 增加可选 `fields?: readonly string[]`。
2. `SchemaCrudFormProps` 增加可选 `viewFields?: readonly string[]`。
3. 新增字段选择工具，输入 schema、字段 key 数组，返回新的 schema 副本：
   - 按传入 key 顺序选择；
   - 未知 key 忽略；
   - 字段自身 `hidden: true` 忽略；
   - 不修改原 schema，不修改 `initialValues`、`normalizeValues`。
4. 需要时导出工具类型，不导出内部实现细节。

验收：

- `tsc --noEmit` 通过。
- 工具函数单测覆盖顺序、未知 key、`hidden` 和空数组。

## 阶段 2：列表字段过滤

文件：

- `packages/lib/src/components/schema-crud-list.tsx`
- `packages/lib/src/hooks/use-crud-columns.tsx`
- `packages/lib/__tests__/02-list.spec.tsx`

任务：

1. `SchemaCrudList` 读取 `fields`，传给 `useCrudColumns`。
2. `useCrudColumns` 在“从 schema 推导列”的分支里先按 `fields` 选择字段，再套 `presets`。
3. 显式 `columns` 分支完全不看 `fields`，保持显式列优先。
4. `fields` 未传时继续使用完整 schema；`fields=[]` 时不生成数据列，只保留操作列。
5. 保持现有 `presets.hidden` 行为：字段在 `fields` 中但 preset 为 `hidden` 时仍隐藏。

测试：

- 声明列顺序符合 `fields`。
- 未声明字段不出现。
- 显式 `columns` 覆盖 `fields`。
- 未知 key、schema 字段 `hidden` 被忽略。
- 空数组只剩操作列。

验收：

- 列表相关测试通过。
- 示例列表不再出现“置顶”。

## 阶段 3：详情字段过滤

文件：

- `packages/lib/src/components/schema-crud-form.tsx`
- `packages/lib/src/hooks/use-crud-form.ts`
- `packages/lib/__tests__/01-basic.spec.tsx`

任务：

1. `SchemaCrudForm` 读取 `viewFields`。
2. 只在 `mode="view"` 时对 `resolvedSchema.fields` 做过滤，位置在 `useCrudForm` 生成 `resolvedSchema` 之后。
3. create / edit 不传过滤结果，继续使用完整 schema。
4. `viewFields` 不改变 `initialValues`、`normalizeValues`、`formKey`、校验和提交值。
5. 不传 `viewFields` 时保持全部字段。

测试：

- 详情模式只显示 `viewFields` 声明的字段，顺序正确。
- create / edit 不受影响。
- 未知 key、`hidden` 字段被忽略。
- 传入 schema 不被修改。
- 详情字段缺少某个可编辑字段时，编辑切换后仍能渲染完整表单。

验收：

- 表单相关测试通过。
- 编辑页字段与详情页不同，但保存 payload 不受影响。

## 阶段 4：示例业务配置

文件：

- 新增 `packages/example/src/pages/posts/config.ts`
- `packages/example/src/pages/posts/list.tsx`
- `packages/example/src/pages/posts/detail.tsx`
- `packages/example/src/pages/posts/create.tsx`
- `packages/example/src/pages/posts/edit.tsx`
- `packages/example/src/pages/posts/list-presets.ts`
- `packages/example/README.md`

任务：

1. 新增 `postPageConfig`，集中声明 `resource`、`title`、`schema`、`list.fields`、`list.presets`、`detail.fields`。
2. 列表页从配置读取 `fields` 和 `presets`，列表字段为标题、副标题、状态。
3. 详情页传 `viewFields`，详情字段为标题、副标题、状态、置顶。
4. 编辑页不传 `viewFields`，保持完整表单。
5. 删除 `list-presets.ts` 中 `is_sticky` 的 `hidden` 配置，改由 `list.fields` 表达。
6. 更新示例 README，说明同一 schema、不同列表/详情字段的配置方式。

验收：

- 列表页看不到置顶。
- 详情页看到置顶。
- 编辑页仍能编辑置顶。
- 路由返回、分页保持和删除行为不回归。

## 阶段 5：公共文档

文件：

- `packages/lib/README.md`
- `packages/lib/llms.txt`
- `docs/superpowers/specs/2026-11-21-schema-resource-list-design.md`
- `docs/superpowers/specs/2026-11-21-schema-crud-v2-design.md`

任务：

1. README 增加业务配置示例和 `fields` / `viewFields` 说明。
2. 明确优先级：显式 `columns` > `fields` > `presets` > schema 推导。
3. 明确 `viewFields` 只影响 `mode="view"`。
4. llms.txt 增加简明 API 摘要。
5. 现有设计文档补充这两个 prop，避免与新文档口径冲突。

## 完整验证

```shell
cd packages/lib
./node_modules/.bin/tsc --noEmit -p tsconfig.json
./node_modules/.bin/vitest run
./node_modules/.bin/tsup

cd ../example
./node_modules/.bin/tsc --noEmit -p tsconfig.json
./node_modules/.bin/vite build
```

浏览器验收：

1. `/posts` 列表只显示标题、副标题、状态。
2. `/posts/:id` 详情显示标题、副标题、状态、置顶。
3. `/posts/:id/edit` 编辑显示完整字段，保存后详情和列表数据正确。
4. 从列表第 2 页进入编辑并返回，列表仍在第 2 页。

## 提交拆分

1. `feat: add field selection helpers`
2. `feat: support list field selection`
3. `feat: support detail field selection`
4. `docs: document per-resource field config`
5. `feat(example): add post page config`

每个提交单独通过 `tsc` 和相关测试；最后统一跑完整验证。
