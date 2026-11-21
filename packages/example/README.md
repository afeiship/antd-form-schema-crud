# SchemaCrud posts 示例

用真实 Rails 接口演示 `@jswork/antd-form-schema-crud`：一份 `FormSchema` 驱动文章详情、编辑和新建。

## 启动

```bash
pnpm --filter example dev
```

示例默认通过 Vite 代理访问 `http://localhost:5076/api`。token 放在本地 `.env.local`（已被 git 忽略），提交时只保留 `.env.example`。

```dotenv
VITE_API_URL=
VITE_API_TOKEN=your-token
```

`VITE_API_URL` 留空时使用 Vite 代理；填入完整地址则直接请求该地址。

## 接口约定

`src/api/posts.ts` 按 `jsw-admin/src/shared/services/schema.ts` 的 `resources` 约定（Rails 模板）注册成 `nx.$api`：

| 方法            | 请求                                          |
| --------------- | --------------------------------------------- |
| `posts_show`    | `GET /api/posts/:id`                          |
| `posts_create`  | `POST /api/posts`，body `{ post: values }`    |
| `posts_update`  | `PUT /api/posts/:id`，body `{ post: values }` |
| `posts_destroy` | `DELETE /api/posts/:id`                       |
| `posts_index`   | `GET /api/posts?page=1&size=20`               |

`SchemaCrud` 只给 `resource="posts"`，由组件自动解析其余四个方法。不传 `mode` 时，`id` 为空进入新建，有值进入详情，详情里的“编辑”由组件内部切换：

```tsx
<SchemaCrud
  resource="posts"
  schema={postSchema}
  id={activeId}
  title="文章"
  extra={extra}
  onSuccess={handleSuccess}
  onBack={() => setActiveId(records[0]?.id)}
  onError={handleError}
/>
```

创建默认值和提交前 trim 都写在 schema 上：

```ts
const postSchema: FormSchema = {
  initialValues: { status: 'draft', is_sticky: false },
  normalizeValues: (values) => ({
    ...values,
    title: String(values.title ?? '').trim(),
  }),
  fields: [...],
};
```

## 演示内容

- 标题栏下拉切换文章，右侧“新建”进入创建；详情页的“编辑”由组件内部切换。
- 预览态用 `Descriptions` 展示，编辑态用 `SchemaForm`，新建态自动带默认 `status: draft`。
- 保存成功后组件重新拉取当前记录；删除成功后回到新建或下一条记录。
- 单个 `onSuccess(event)` 按 `event.action` 处理创建、保存、删除；错误通过 `errorMessage` 统一转成可读文案。
