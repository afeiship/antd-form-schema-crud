# antd-form-schema-crud

> Ant Design resource CRUD driven by antd-form-schema and show/create/update/destroy APIs.

## Installation

```shell
pnpm add @jswork/antd-form-schema-crud
```

## Usage

```tsx
<SchemaCrud
  resource="posts"
  schema={postSchema}
  id={activeId}
  title="文章"
  onSuccess={(event) => {
    if (event.action === 'create') setActiveId(event.result.id);
  }}
  onBack={() => setActiveId(undefined)}
/>
```

- `id` 为空进入创建，有值进入详情；不传 `mode` 时，详情里的“编辑”由组件内部切换。
- 创建默认值写在 `schema.initialValues`，提交前转换写在 `schema.normalizeValues`。
- 成功回调统一为 `onSuccess(event)`，按 `event.action` 区分 `create / update / delete`。
- 需要受控模式时传 `mode`，并通过 `onModeChange` 同步。
