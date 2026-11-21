# SchemaCrud 命名与业务需求

日期：2026-11-21
状态：讨论稿
关系：本文只谈「叫什么」和「要什么」；「怎么实现」见 `2026-11-21-schema-crud-design.md`。

## 命名

### 候选

| 项目名         | 包名                                 | description                                                          |
| -------------- | ------------------------------------ | -------------------------------------------------------------------- |
| `SchemaCrud`   | `@jswork/antd-form-schema-crud`      | Schema-driven create, edit and view for one resource, driven by four APIs. |
| `SchemaResource` | `@jswork/antd-schema-resource`     | One schema and four RPC methods render a complete resource editor.   |
| `SchemaRecord` | `@jswork/antd-form-schema-record`    | A schema-driven Ant Design screen for create, edit and view of one record. |

推荐第一个：`SchemaCrud`。

- 与已有的 `@jswork/antd-form-schema` 同属一个词族，名字本身就是「schema 家族的 CRUD 那一块」。
- `Schema` 说明输入契约，`Crud` 说明能力边界，两个词合起来不会让人误以为它还管列表、路由、菜单。
- `Resource` 更贴近后端语义，但对前端使用者偏抽象，且容易被理解成「资源管理整页」，边界会被误读。
- 组件对外用具名导出 `SchemaCrud`，默认导出保留 `AntdFormSchemaCrud` 作为兼容别名，现有脚手架代码不用改。

## 意图

业务接口通常是一组固定命名的资源方法：

```ts
nx.$api.users_show({ id });
nx.$api.users_create(values);
nx.$api.users_update({ id, ...values });
nx.$api.users_destroy({ id });
```

页面里真正重复的不是表单字段，而是这套流程：

- 创建：空表单 → 提交 create；
- 编辑：拉取 show → 回填 → 提交 update；
- 预览：拉取 show → 用 `Descriptions` 展示；
- 删除：确认 → 调用 destroy；
- 加载中、加载失败、提交中、删除中、缺 id、缺 API 的统一处理。

字段部分已经有 `antd-form-schema` 负责，剩下这一层是纯流程胶水。项目要做的，就是把这段胶水收成一个组件。

## 一句话边界

**`SchemaCrud` 只根据 `mode`、`id`、`schema` 和一组 `show/create/update/destroy` API 渲染一块可操作的资源区域；列表、路由、页面框架和弹窗容器仍由业务页面控制。**

## 需求清单

| 编号 | 需求             | 验收标准                                                                 |
| ---- | ---------------- | ------------------------------------------------------------------------ |
| R1   | 创建             | 不调用 `show`；提交走 `create`；`createInitialValues` 能覆盖 schema 初值 |
| R2   | 编辑             | 先 `show({ id })`，数据就绪后才挂载表单，回填不丢字段                    |
| R3   | 预览             | 复用 `SchemaForm` 的 viewMode，强制只读，不出现提交按钮                  |
| R4   | 删除             | 默认二次确认；`deleteConfirm={false}` 可关；失败保留当前页面             |
| R5   | 参数容错         | 编辑/预览缺 `id`、或当前模式缺必需 API 时，渲染错误提示且不发请求        |
| R6   | 加载状态         | 加载、提交、删除三个 loading 相互独立，且互相禁用，防重复提交            |
| R7   | API 解析         | 优先用 `api`；缺的 action 再从 `resource` 推导 `${resource}_show` 等      |
| R8   | 字段适配         | 日期 `valueType`、枚举 `options` 的 label 映射、converter 全部交给 schema |
| R9   | 操作区可控       | 每个按钮可改文案/属性、可隐藏；`footer` 可整体接管；支持 `extra`          |
| R10  | schema 不被污染  | 组件只生成浅副本，传入的 `schema.viewMode` 不会被永久改成 `true`         |
| R11  | 回调齐全         | `onCreated` / `onUpdated` / `onDeleted` / `onError` / `onFormReady` 都有  |
| R12  | 幂等安全         | 快速切换 `id` 时，旧请求响应必须丢弃，不能覆盖新数据                     |

## 界面形态

业务上同一份 schema 会被用在三种壳子里，v1 只做最里层，外层留给业务：

| 形态       | 承载方式                                | 归属 |
| ---------- | --------------------------------------- | ---- |
| 独立页面   | 页面里直接放 `<SchemaCrud mode="edit">` | v1   |
| Modal      | 业务自己用 `<Modal footer={null}>` 包   | v1   |
| Drawer     | 业务自己用 `<Drawer>` 包                | v1   |
| 内建弹层   | 组件自带 `variant: 'modal' \| 'drawer'` | v2   |

## API 约定

```ts
show({ id });
create(values);
update({ id, ...values });
destroy({ id });
```

约定之外的一切协议差异（`{ id, data }` 包裹、`family_user_id` 之类的额外参数），都用 `api` 显式适配，不往组件里塞开关。

## 关键决策

1. **一套 schema，三种 mode。** 不为创建/编辑/预览各写一份 schema；差异靠 `condition`、`viewWidget`、`viewSpan`、`converter` 表达。
2. **先 show 再挂载。** 编辑和预览都等数据回来才渲染表单，否则 `initialValues` 只在首次挂载生效，回填会静默失败。
3. **mode 由外部控制。** 创建成功后不自动跳转、不自动切模式，全部交给 `onCreated`。
4. **destroy 是可选项。** 没有 destroy 就不显示删除按钮，不影响创建/编辑/预览。
5. **不引入请求库。** 用 `useEffect` + 请求序号处理过期响应，不引入 React Query / SWR。
6. **布局不进 schema。** 字段怎么排、按钮怎么放，全部由 `classNames` / `slots` / `footer` 决定。

## 非目标

- 不做列表、分页、筛选、表格。
- 不做路由、菜单、面包屑、页面级权限。
- 不做字段级权限，只到按钮级 `canEdit` / `canDelete`。
- 不做缓存、失效、乐观更新。
- 不支持异步 `FormSchema`（`antd-form-schema` 已支持，但本包 v1 只吃同步 schema）。
- 不做内置 i18n，默认中文文案，通过 `actions.*.text` 覆盖。

## 待确认

1. 更新 payload 用 `update({ id, ...values })` 是否符合现有接口习惯？还是要支持 `update({ id, data })`？
2. 编辑态默认是否显示「删除」？当前设计是编辑态也显示，理由是减少一次往返详情页。
3. 预览态默认按钮「返回 / 编辑 / 删除」的顺序是否合适？
4. v1 是否要支持传 `record` 直接跳过 `show`（适合列表页已拿到数据的场景）？当前设计不提供，避免两套数据来源。
5. 删除成功后是否要默认触发 `onCancel`？还是必须由业务在 `onDeleted` 里自己跳转？
6. 打包目标 `antd >= 5`，但当前工作区实际解析到 `antd 6.7.1`；是否需要把 `Button`、`Popconfirm`、`Descriptions` 在 v6 下的行为显式验证一遍再定基线？
