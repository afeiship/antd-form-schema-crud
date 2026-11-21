# CRUD Action Hook：用 React hook 调用列表与表单的常用操作

日期：2026-11-22

状态：已实现（2026-11-22）

关系：在 `2026-11-21-schema-crud-v2-design.md` 与 `2026-11-21-schema-resource-list-design.md` 之上，增加一个实例级动作入口。不改变 `SchemaCrudList` / `SchemaCrudForm` 的数据流、路由和 UI，只把已有动作暴露给同一页面里的其他 React 组件。

取代：`2026-11-22-crud-action-event-design.md` 的 `window.dispatchEvent` 方案。

## 一句话边界

不暴露 `ref`，不发送 window 事件。组件按 `scope` 把自己的动作注册到模块级注册表，业务在任意 React 组件里用 hook 拿到这组动作。

```tsx
const list = useCrudListActions('posts');
const form = useCrudFormActions('posts');

<Button onClick={() => list.reload()}>刷新</Button>
<Button onClick={() => form.submit()}>保存</Button>
```

动作只触发当前实例已经具备的行为，不新增请求流程、不绕过校验，也不替代 `onSuccess` / `onError`。

## 意图

列表卡片和表单卡片内部已经有一组按钮，但真实页面经常需要把同一能力放到别的位置：

- 页面右上角放“刷新”“新建”，和 Card extra 里的按钮重复。
- 自定义工具栏、筛选区需要刷新列表。
- 表格外的操作按钮需要进入某条记录的编辑页。
- 表单外的按钮需要保存、删除、取消或重新加载。
- Tab、弹层、看板里嵌入了多个列表或表单。

如果靠 props 或 ref 把回调逐层传下去，业务会多出一套“命令管道”。`window.dispatchEvent` 又退化成全局字符串协议，缺少类型、生命周期和返回值。

Hook 方案保留“任意 React 位置可调用”，同时保持在 React 的类型、渲染和卸载语义内。

## 非目标

- 不暴露 `ref` / `actionRef`，也不要求父组件保存组件实例。
- 不使用 `window.dispatchEvent`、`CustomEvent` 或全局事件名。
- 不做跨页面调用。跨路由依赖页面重新挂载和数据重新请求。
- 不提供 `update(values)` / `create(values)` 这类直接写数据的 API。写入必须经过当前表单的校验、normalize 和 loading 保护。
- 不新增删除确认弹层。`remove` 只执行删除，确认由调用方负责。
- 不做广播。一个 hook 只绑定一个 `scope`，需要控制多个实例就调用多个 hook。
- 不支持非 React 代码直接调用。模块内部若有运营脚本需求，另行设计逃生口，不混入公开 API。

## 为什么选 hook

当前项目本身就是 React 组件树，按钮也都在 React 组件里。Hook 比窗口事件更符合现有架构：

- 调用有完整 TS 类型和自动补全，不依赖字符串事件名。
- 目标实例挂载 / 卸载时，hook 通过 `useSyncExternalStore` 自动更新。
- 不需要业务额外挂 Provider；按钮放在页面级、卡片外也能用。
- 动作对象可以保持稳定，不会因父组件重渲染而换引用。
- 测试直接在 React 树里渲染和点击，不需要监听 window。
- 后续可以给动作增加返回值、错误状态，而不破坏调用方。

## 公开 API

### 列表

```tsx
import { useCrudListActions } from '@jswork/antd-form-schema-crud';

function PageToolbar() {
  const list = useCrudListActions('posts');

  return (
    <>
      <Button disabled={!list.ready} onClick={() => list.reload()}>
        刷新
      </Button>
      <Button disabled={!list.ready} onClick={() => list.create()}>
        新建
      </Button>
      <Button disabled={!list.ready} onClick={() => list.edit(record)}>
        编辑
      </Button>
      <Button disabled={!list.ready} onClick={() => list.remove(record)}>
        删除
      </Button>
    </>
  );
}
```

```ts
interface CrudListActionsApi {
  /** 目标列表已经挂载并完成注册。 */
  ready: boolean;
  reload: () => void;
  create: () => void;
  edit: (record: CrudRecord) => void;
  remove: (record: CrudRecord) => Promise<void>;
}
```

### 表单

```tsx
import { useCrudFormActions } from '@jswork/antd-form-schema-crud';

function FormToolbar() {
  const form = useCrudFormActions('posts');

  return (
    <>
      <Button disabled={!form.ready} onClick={() => form.submit()}>
        保存
      </Button>
      <Button disabled={!form.ready} onClick={() => form.cancel()}>
        取消
      </Button>
      <Button disabled={!form.ready} onClick={() => form.remove()}>
        删除
      </Button>
    </>
  );
}
```

```ts
interface CrudFormActionsApi {
  ready: boolean;
  submit: () => void;
  reload: () => void;
  edit: () => void;
  cancel: () => void;
  remove: () => Promise<void>;
}
```

### 未挂载时

Hook 始终返回一个完整对象，不返回 `undefined`：

- `ready === false`
- 所有动作都是安全 no-op
- `remove()` 返回已完成的 Promise
- 开发环境只提示一次“scope 尚未注册”，不抛异常

这样页面可以先渲染工具栏，再挂载卡片；不要求业务到处写可选链。

## Scope

### 默认 scope

组件新增可选属性：

```ts
interface SchemaCrudListProps<TRecord extends CrudRecord = CrudRecord> {
  // ...existing
  /** 外部 hook 使用的目标名；省略时回退到 resource。 */
  actionScope?: string;
}

interface SchemaCrudFormProps<TRecord = CrudRecord> {
  // ...existing
  /** 外部 hook 使用的目标名；省略时回退到 resource。 */
  actionScope?: string;
}
```

实际注册 key：

```ts
effectiveScope = actionScope ?? resource;
```

因此最常见的情况不需要额外配置：

```tsx
<SchemaCrudList resource="posts" ... />
```

```tsx
const list = useCrudListActions('posts');
```

自定义 API、没有 `resource` 时显式指定：

```tsx
<SchemaCrudList api={api} actionScope="hot-posts" ... />
```

```tsx
const list = useCrudListActions('hot-posts');
```

`resource` 和 `actionScope` 都为空时，组件不注册动作；对应 hook 一直是 `ready: false`。

### Surface 隔离

注册表按 surface 和 scope 两级隔离：

```ts
Map<'list' | 'form', Map<string, RegisteredActions>>
```

同一个页面里，列表和表单可以共用 `'posts'`：

```tsx
<SchemaCrudList resource="posts" ... />
<SchemaCrudForm resource="posts" ... />
```

```ts
useCrudListActions('posts'); // 只拿列表
useCrudFormActions('posts'); // 只拿表单
```

不会串到另一种 surface。

### 多实例

同一个 surface 下，`scope` 必须唯一。两个列表要用不同名字：

```tsx
<SchemaCrudList resource="posts" actionScope="latest-posts" ... />
<SchemaCrudList resource="posts" actionScope="popular-posts" ... />
```

```ts
const latest = useCrudListActions('latest-posts');
const popular = useCrudListActions('popular-posts');
```

同一 surface 下重复注册时：

- 开发环境 `console.error` 明确指出重复的 surface + scope。
- 第一个注册的实例保留，后注册的实例不覆盖。
- 后注册实例的卸载不会移除前一个实例的注册。

不提供隐式“最后一个生效”或“全部广播”，避免按钮点错目标。

## 注册表设计

### 模块级外部 store

新增 `src/actions/registry.ts`：

```ts
type CrudActionSurface = 'list' | 'form';

interface CrudActionStore {
  subscribe: (surface: CrudActionSurface, scope: string, listener: () => void) => () => void;
  getSnapshot: (surface: CrudActionSurface, scope: string) => RegisteredActions;
  register: (surface: CrudActionSurface, scope: string, actions: RegisteredActions) => () => void;
}
```

约束：

- 注册表不读取 React 状态。
- 注册时返回幂等的 unregister。
- 组件卸载时 unregister。
- 注册 / 卸载时通知该 surface + scope 的订阅者。
- 未注册时返回固定的 EMPTY actions，保证 `useSyncExternalStore` 快照稳定。

### 稳定动作对象

组件注册的动作对象必须在组件生命周期内保持引用稳定：

```ts
const actions = useMemo(
  () => ({
    ready: true,
    reload: () => latest.current.reload(),
    create: () => latest.current.create(),
    edit: (record) => latest.current.edit(record),
    remove: (record) => latest.current.remove(record),
  }),
  []
);
```

内部用 latest-handler ref 保证闭包读到最新 props 和最新状态，调用方看不到 ref。不能用每次 render 新建的对象注册，否则会造成注册表快照抖动。

### Hook 读取

```ts
export function useCrudListActions(scope: string): CrudListActionsApi {
  const subscribe = useCallback(
    (onStoreChange: () => void) => registry.subscribe('list', scope, onStoreChange),
    [scope]
  );
  const getSnapshot = useCallback(() => registry.getSnapshot('list', scope), [scope]);

  return useSyncExternalStore(subscribe, getSnapshot, getEmptyListActions);
}
```

表单同理。SSR 使用 `getServerSnapshot` 返回空动作，不访问 window。

### 生命周期

1. 页面渲染，hook 第一次得到 `ready: false`。
2. 列表 / 表单挂载，注册稳定动作对象。
3. 注册表通知订阅者，hook 重渲染，`ready` 变为 `true`。
4. 组件卸载，注销并恢复 EMPTY actions。
5. 路由切换、Tab 关闭、弹层销毁后，旧动作自动失效。

不需要 `actionRef`，也不要求业务管理卸载顺序。

## 动作语义

### 列表

| 动作 | 实际行为 | 什么时候 no-op |
| --- | --- | --- |
| `reload` | 递增 reload 版本，重新请求当前 page / size / params | 无 `index`、blocked 配置不完整时由请求层处理 |
| `create` | 调用当前解析后的 `onCreate`；Router 分支默认导航到 `${pathname}/add${search}` | `actions.create === false`、没有 `onCreate` |
| `edit(record)` | 调用当前解析后的 `onEdit(record)`；Router 分支默认导航到 `${pathname}/${id}/edit${search}` | `actions.edit === false`、没有 `onEdit`、`record` 为空 |
| `remove(record)` | 调 `destroy({ id })`，成功后走列表原有 `onSuccess({ action: 'delete' })`，失败走 `onError(error, 'delete')`，并按原逻辑回退页码 / reload | 没有 `destroy`、`actions.delete === false`、记录没有 id、已有删除请求进行中 |

`remove` 直接执行，不弹内置 Popconfirm。返回的 Promise 在请求及 `onSuccess` 完成后 resolve；失败时请求已由 `onError` 处理，Promise 也 resolve，不向调用方抛出未捕获异常。

### 表单

| 动作 | 实际行为 | 什么时候 no-op |
| --- | --- | --- |
| `submit` | 触发当前表单的 submit；校验通过后按当前 mode 调 create / update | `actions.save === false`、view、blocked、loading、提交或删除中、edit 未 dirty、表单未 ready |
| `reload` | 重新执行 `show` 并刷新当前记录 | create 模式、没有 `show`、blocked、加载中 |
| `edit` | 从 view 切到 edit，并清空 action error | 非 view、`actions.edit === false`、记录未加载 |
| `cancel` | 复用底部取消逻辑：普通 edit 回 view；`mode="form"` 和 view 调 `onBack` | `actions.cancel === false`、当前没有可执行的取消动作 |
| `remove` | 调 `destroy({ id })`，成功后走 `onSuccess({ action: 'delete' })`，失败走 `onError(error, 'delete')` | create、没有 `destroy`、没有 id、提交或删除中、`actions.delete === false` |

`submit` 返回 `void`，因为 `SchemaForm` 的 `submit()` 本身是触发式接口，不等待异步请求。保存结果继续通过 `onSuccess` / `onError` 获取。

### 与内置按钮同一性

动作必须复用内置按钮已经在用的同一组 handler，不在 hook 层重建流程：

- `form.submit` 对应底部保存按钮的 `submit`
- `form.cancel` 对应底部取消 / 返回按钮的 `handleCancel`
- `form.edit` 对应详情态编辑按钮的 `handleEdit`
- `form.remove` 对应底部删除按钮最终执行的 `handleDelete`
- `list.reload` 对应刷新按钮
- `list.create` 对应 Card extra 新建按钮
- `list.edit` 对应行内编辑
- `list.remove` 对应行内删除最终执行的 `handleDelete`

这样能保证 loading、错误 Alert、成功回调、路由 query 保留、页码回退、`mode="form"` 保存后 reload 等行为完全一致。

## 删除确认

`remove` 不弹 Popconfirm。

原因：

1. Popconfirm 是行内 / footer 的视觉交互，不适合由外部按钮隐式打开。
2. 调用方可能已经用自己的 `Modal.confirm`、审批弹层或权限校验包了一层，再弹一次会重复确认。
3. 让 `remove` 只做“执行删除”，确认属于调用方职责。

示例：

```tsx
const list = useCrudListActions('posts');

function RowActions({ record }) {
  return (
    <Button
      onClick={async () => {
        await modal.confirm({
          title: '确认删除？',
          onOk: () => list.remove(record),
        });
      }}
    >
      删除
    </Button>
  );
}
```

约定：

- 内置删除按钮继续遵守 `confirmDelete`。
- `list.remove` / `form.remove` 不受 `confirmDelete` 影响。
- 文档和示例明确提示调用方自行确认。

## 受控与路由行为

Hook 不改变现有模式判断：

- `SchemaCrudList` 仍然默认读写路由分页；`list.create` / `list.edit` 走 Router 默认导航，保留当前 `search`。
- 受控 `page` / `pageSize` 时，`list.reload` 只重新请求，不改 URL。
- `SchemaCrudForm` 的 `mode="form"` 仍然无 id 为 create、有 id 为 edit。
- `form.submit` 在 form 模式保存成功后仍然停留在 edit 并 reload 最新记录。
- `form.cancel` 在 form 模式下不切 view，直接走 `onBack`。
- 普通受控 `mode` 仍通过 `onModeChange` 通知模式变化，hook 不绕过它。

## 实现约束

1. 只使用 `useSyncExternalStore`，不用自定义事件，不访问 window。
2. 注册表以 surface + scope 两级 key 隔离；empty 快照必须是稳定引用。
3. 组件注册的 actions 对象必须在生命周期内保持稳定，内部用 latest-handler ref 读取最新状态。
4. `effectiveScope = actionScope ?? resource`；两者都为空时不注册。
5. 同一 surface + scope 重复注册：开发环境报错，第一个注册生效。
6. Hook 在 scope 未注册时返回完整 no-op API，`ready: false`，不抛异常。
7. `remove` 必须返回 Promise；guard 命中或未注册时返回已 resolve 的 Promise。
8. 组件卸载后必须注销；路由切换或 StrictMode 双挂载 / 卸载不能残留监听。
9. 动作 guard 必须与内置按钮一致，避免“按钮禁用但 hook 仍能绕过”。
10. `SchemaCrudList` 的 Router 分支和普通分支都通过 `SchemaCrudListRender` 注册，不能只在其中一个分支生效。
11. SSR 使用 `getServerSnapshot` 返回 empty actions。
12. 主入口导出 `useCrudListActions`、`useCrudFormActions` 及 action API 类型。

## 实现计划

1. 新增 `src/actions/registry.ts`：surface 类型、store、subscribe / getSnapshot / register、empty actions。
2. 新增 `src/actions/use-crud-action-registration.ts`：稳定 actions、latest handlers、挂载注册、卸载注销、重复 scope 诊断。
3. 新增 `src/hooks/use-crud-list-actions.ts`、`src/hooks/use-crud-form-actions.ts`。
4. `types.ts` 给两个 Props 增加 `actionScope?: string`，新增 action API 类型。
5. `SchemaCrudListRender` 组装并注册列表动作：
   - `reload: state.reload`
   - `create: 解析后的 onCreate`
   - `edit: 解析后的 onEdit`
   - `remove: state.handleDelete`
   - guard 对齐 `actions.create/edit/delete`
6. `SchemaCrudFormRender` 组装并注册表单动作：
   - `submit: state.submit`
   - `reload: state.reload`
   - `edit: state.handleEdit`
   - `cancel: state.handleCancel`
   - `remove: state.handleDelete`
   - guard 对齐 `canSave`、`mode`、`resolvedActions`、`submitLoading`、`deleteLoading`
7. 主入口导出 hook 与类型。
8. README、`llms.txt` 增加 hook 示例、`actionScope` 说明、删除确认说明。
9. 示例页在 Card 外增加一个工具栏，演示刷新列表和保存表单。

## 测试计划

### 注册表

1. 未注册时 hook 返回 `ready: false`，动作调用不抛错。
2. 组件挂载后 `ready` 变为 `true`。
3. 组件卸载后回到 `ready: false`，旧动作失效。
4. 同一 surface + scope 重复注册，第一个保留，并触发开发环境诊断。
5. list 和 form 使用同一 scope 时不串台。
6. SSR 渲染不访问 window，hook 返回 empty actions。

### 列表动作

1. `list.reload()` 触发第二次 `index` 请求，保留 page / size / params。
2. Router 分支下 `list.create()` 走默认 `/add` 导航；传 `onCreate` 时以业务回调为准。
3. `list.edit(record)` 调用一次 `onEdit(record)`；`actions.edit === false` 或未传回调时不调用。
4. `list.remove(record)` 调用 `destroy({ id })`，成功后触发 `onSuccess({ action: 'delete' })`，不出现 Popconfirm。
5. 删除中重复 `list.remove(record)` 只发一次请求。
6. 没有 `destroy`、`actions.delete === false` 或记录无 id 时 no-op，Promise 正常 resolve。
7. 父组件 rerender 后，hook 动作仍使用最新的 `onCreate/onEdit/onSuccess/onError`。

### 表单动作

1. create 模式 `form.submit()` 调 `create`；edit 模式改值后调 `update`。
2. edit 未 dirty、view、blocked、`actions.save === false` 时 no-op。
3. `form.reload()` 在 edit / view 调 `show`；create 模式 no-op。
4. view 模式 `form.edit()` 进入 edit；非 view 或 `actions.edit === false` 时 no-op。
5. `form.cancel()` 在普通 edit 回 view；`mode="form"` 下调 `onBack`。
6. `form.remove()` 调 `destroy({ id })`，成功后走 `onSuccess`，不出现 Popconfirm。
7. create、无 `destroy`、提交或删除中时 no-op。
8. 父组件 rerender 后，动作仍使用最新 props 和最新表单状态。

### 回归

1. 不传 `actionScope`、不使用 hook 时，原有测试全部通过。
2. `mode="form"` 保存后仍停留在 edit 并显示最新记录。
3. 列表 Router 分页、`keepDefaultParams`、删除回退页码行为不变。
4. `actionScope` 默认回退 `resource`，不改变现有组件行为。
5. 全量测试 87 项通过，源码 `tsc`、库构建与示例构建通过。

## 已确认

1. Hook 名称：`useCrudListActions` / `useCrudFormActions`。
2. 组件属性名：`actionScope`。
3. 默认 scope 回退 `resource`。
4. 同一 surface + scope 只允许一个实例；重复注册报开发错误，第一个注册生效。
5. `remove` 返回 Promise；`submit` 返回 `void`，结果继续通过 `onSuccess` / `onError` 获取。
</tool_result>
