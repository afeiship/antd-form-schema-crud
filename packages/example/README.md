# SchemaCrudForm / SchemaCrudList posts 示例

用真实 Rails 接口演示 `@jswork/antd-form-schema-crud` 的完整多页面 CRUD：列表、新建、详情、编辑各是一个路由页面，共用一份 `FormSchema`、一套 `nx.$api` 和一份 `postPageConfig`。

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

`/` 重定向到 `/posts`。示例用 `react-router-dom` 的 `BrowserRouter + Routes`；`SchemaCrudList` 默认把分页同步到路由查询参数：`/posts?page=2&size=20`。刷新、前进后退都会保留页码；示例传 `keepDefaultParams={false}`，第 1 页和默认 `size=10` 不写进 URL。查询区通过 `query.slots` 接入，关键词映射为 URL 的 `q`，状态保留 `status`，例如 `/posts?q=Rails&status=published&page=1&size=10`。

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
<SchemaCrudList<PostRecord, PostListQuery>
  resource={postPageConfig.resource}
  schema={postPageConfig.schema}
  fields={postPageConfig.list.fields}
  presets={postPageConfig.list.presets}
  title={postPageConfig.title}
  onCreate={() => navigate('/posts/new')}
  query={{
    defaultValues: { keywords: undefined, status: undefined },
    urlKeys: { keywords: 'q', status: 'status' },
    slots: {
      headerStart: queryPlugins.status<PostListQuery, PostStatus>({
        options: POST_STATUS_OPTIONS,
      }),
      headerEnd: queryPlugins.keywords<PostListQuery>({
        width: 220,
        placeholder: '搜索标题 / 副标题',
        autoFocus: true,
      }),
      body: ({ values, setValues, reset }) =>
        values.keywords || values.status ? (
          <Space>
            <Tag closable onClose={() => setValues({ keywords: undefined })}>
              关键词：{values.keywords}
            </Tag>
            <Tag closable onClose={() => setValues({ status: undefined })}>
              状态：{values.status}
            </Tag>
            <Button type="link" onClick={() => reset()}>清空</Button>
          </Space>
        ) : null,
    },
  }}
/>
```

- `headerStart` 使用内置 `status` plugin，`headerEnd` 使用内置 `keywords` plugin。
- 两个 plugin 共享同一份查询状态，但分别使用 `status` / `keywords` 两个 key。
- `urlKeys: { keywords: 'q' }` 把关键词写入 `?q=...`；`reset()` 回到 `defaultValues` 并回第 1 页。
- 示例的 `posts_index` 会把额外查询参数一起带到 `/api/posts`。
- 服务端分页，默认 `page=1`、`size=10`。
- `config.ts` 是每个业务自己的字段配置：`list.fields` 只放列表需要的列，`detail.fields` 放详情字段；两者可以不同。
- `presets` 在 `list-presets.ts` 集中维护列标题、宽度和对齐；`fields` 控制出现哪些列。
- 行内只有编辑和删除；点击整行不会跳转。
- 行内删除带确认；删除当前页最后一条会回退一页。
- 列表只负责列表，新建/详情/编辑靠路由跳转；列表不提供查看入口，从编辑页取消可回到详情。

## 表单

- 新建页 `mode="create"`，成功后进入详情。
- 详情页 `mode="view"`，`viewFields={postPageConfig.detail.fields}` 控制展示字段；点击编辑通过 `onModeChange` 跳到编辑页，编辑页使用完整 schema。
- 编辑页 `mode="edit"`，取消编辑通过 `onModeChange` 回到列表。
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
├── config.ts          # 业务字段配置：resource / schema / list.fields / detail.fields
├── list-presets.ts    # 列展示 presets
├── schema.ts          # 表单 schema
└── components/page-header.tsx
```
