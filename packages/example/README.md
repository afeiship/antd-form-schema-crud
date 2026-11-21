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

`src/api/posts.ts` 把真实接口注册成 `nx.$api` 的命名约定：

| 方法            | 请求                                            |
| --------------- | ----------------------------------------------- |
| `posts_show`    | `GET /api/posts/:id`                            |
| `posts_create`  | `POST /api/posts`，body `{ post: values }`      |
| `posts_update`  | `PATCH /api/posts/:id`，body `{ post: values }` |
| `posts_destroy` | `DELETE /api/posts/:id`                         |
| `posts_index`   | `GET /api/posts?page=1&size=20`                 |

`SchemaCrud` 只给 `resource="posts"`，由组件自动解析其余四个方法：

```tsx
<SchemaCrud
  mode={mode}
  schema={schema}
  resource="posts"
  id={activeId}
  onCreated={handleCreated}
  onUpdated={handleUpdated}
  onDeleted={handleDeleted}
/>
```

## 演示内容

- 左侧下拉切换文章，右侧切换预览 / 编辑 / 新建。
- 预览态用 `Descriptions` 展示，编辑态用 `SchemaForm`，新建态自动带默认 `status: draft`。
- 保存、删除成功后重新拉列表并刷新当前记录。
- 接口错误通过 `errorMessage` 统一转成可读文案。
