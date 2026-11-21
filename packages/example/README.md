# SchemaCrudForm / SchemaCrudList posts 示例

用真实 Rails 接口演示 `@jswork/antd-form-schema-crud` 的完整多页面 CRUD：列表、新建、详情、编辑各是一个路由页面，共用一份 `FormSchema` 和一套 `nx.$api`。

## 启动

```bash
pnpm --filter example dev
```

示例通过 Vite 代理访问后端；token 放在本地 `.env.local`（已被 git 忽略），提交时只保留 `.env.example`。

```dotenv
VITE_API_URL=
VITE_API_TOKEN=your-token
```

`VITE_API_URL` 留空时使用 Vite 代理；填入完整地址则直接请求该地址。

## 路由

| 路由               | 页面                | 组件                |
| ------------------ | ------------------- | ------------------- |
| `/posts`           | 列表                | `SchemaCrudList`    |
| `/posts/new`       | 新建                | `SchemaCrudForm`    |
| `/posts/:id`       | 详情                | `SchemaCrudForm`    |
| `/posts/:id/edit`  | 编辑                | `SchemaCrudForm`    |

`/` 重定向到 `/posts`。示例用 `react-router-dom` 的 `BrowserRouter + Routes`；组件本身不依赖 Router。

## 接口约定

`src/api/posts.ts` 按 `jsw-admin/src/shared/services/schema.ts` 的 `resources` 约定（Rails 模板）注册成 `nx.$api`：

| 方法            | 请求                                          |
| --------------- | --------------------------------------------- |
| `posts_index`   | `GET /api/posts?page=1&size=10`，返回 `{ rows, total }` |
| `posts_show`    | `GET /api/posts/:id`                          |
| `posts_create`  | `POST /api/posts`，body `{ post: values }`    |
| `posts_update`  | `PUT /api/posts/:id`，body `{ post: values }` |
| `posts_destroy` | `DELETE /api/posts/:id`                       |

`app.tsx` 只 import `./api/posts` 完成 `nx.$api` 注册，页面里只写 `resource="posts"`。

## 列表

```tsx
<SchemaCrudList
  resource="posts"
  schema={postSchema}
  presets={postListPresets}
  title="文章"
  onCreate={() => navigate('/posts/new')}
  onView={(record) => navigate(`/posts/${record.id}`)}
  onEdit={(record) => navigate(`/posts/${record.id}/edit`)}
/>
```

- 服务端分页，默认 `page=1`、`size=10`。
- `presets` 在 `list-presets.ts` 集中维护列标题、宽度和对齐。
- 行内删除带确认；删除当前页最后一条会回退一页。
- 列表只负责列表，新建/详情/编辑靠路由跳转。

## 表单

- 新建页 `mode="create"`，成功后进入详情。
- 详情页 `mode="view"`，点击编辑通过 `onModeChange` 跳到编辑页。
- 编辑页 `mode="edit"`，取消编辑通过 `onModeChange` 回到详情。
- 创建默认值和提交前 trim 都写在 `postSchema`：

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

## 目录

```text
src/pages/posts/
├── index.tsx          # 页面导出
├── list.tsx           # 列表
├── create.tsx         # 新建
├── detail.tsx         # 详情
├── edit.tsx           # 编辑
├── list-presets.ts    # 列展示 presets
├── schema.ts          # 表单 schema
└── components/page-header.tsx
```
