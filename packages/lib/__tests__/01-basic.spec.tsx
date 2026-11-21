/**
 * SchemaCrudForm v2 component tests, following
 * docs/superpowers/specs/2026-11-21-schema-crud-v2-design.md.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { FormSchema } from '@jswork/antd-form-schema';
import SchemaCrudForm, {
  SchemaCrudForm as NamedSchemaCrudForm,
  configureSchemaCrud,
  configureSchemaCrudForm,
  getSchemaCrudFormDefaults,
  resetSchemaCrudDefaults,
  resetSchemaCrudFormDefaults,
} from '../src';
import { checkRequirement, errorMessage, resolveApi } from '../src';
import type { CrudSuccessEvent } from '../src';
import { selectSchemaFields } from '../src/utils/schema';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const schema: FormSchema = {
  initialValues: { status: 'active' },
  fields: [
    { key: 'name', label: '姓名', widget: 'input', required: true },
    { key: 'status', label: '状态', widget: 'select', options: ['active', 'disabled'] },
  ],
};

type TestRecord = { id: number; name: string; status: string };

const makeApi = () => ({
  show: vi.fn(async ({ id }: { id: number }): Promise<TestRecord> => ({
    id,
    name: 'Ada',
    status: 'active',
  })),
  create: vi.fn(async (_values: Record<string, any>) => ({ id: 42 })),
  update: vi.fn(async (_values: Record<string, any>) => ({ id: 42 })),
  destroy: vi.fn(async () => ({ ok: true })),
});

afterEach(() => {
  resetSchemaCrudFormDefaults();
  resetSchemaCrudDefaults();
  vi.restoreAllMocks();
  delete (globalThis as any).nx;
});

describe('card size', () => {
  it('uses a middle card by default and one shared setting can shrink it', () => {
    const api = makeApi();
    const first = render(<SchemaCrudForm schema={schema} api={api} />);
    expect(first.container.querySelector('.antd-form-schema-crud')).not.toHaveClass(
      'ant-card-small'
    );
    first.unmount();

    configureSchemaCrud({ cardSize: 'small' });
    const second = render(<SchemaCrudForm schema={schema} api={api} />);
    expect(second.container.querySelector('.antd-form-schema-crud')).toHaveClass('ant-card-small');
  });
});

describe('exports', () => {
  it('exposes a named and a default export with a version', () => {
    expect(NamedSchemaCrudForm).toBe(SchemaCrudForm);
    expect(SchemaCrudForm.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('project defaults', () => {
  it('applies title, action copy and form props defaults to instances', async () => {
    const api = makeApi();
    configureSchemaCrudForm({
      title: '用户',
      actions: { save: { text: '提交' }, delete: { text: '移除' } },
    });
    render(<SchemaCrudForm schema={schema} api={api} id={7} />);

    expect(screen.getByText('用户详情')).toBeInTheDocument();
    await screen.findByText('Ada');
    expect(screen.getByRole('button', { name: /移\s*除/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /编\s*辑/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    expect(await screen.findByLabelText('姓名')).toBeInTheDocument();
    expect(document.querySelector('.ant-form-horizontal')).toBeInTheDocument();
    expect(document.querySelector('.ant-form-item-label')).toHaveStyle({ flex: '0 0 120px' });
  });

  it('lets instance props override global defaults', () => {
    const api = makeApi();
    configureSchemaCrudForm({ title: '用户', confirmDelete: false });
    render(
      <SchemaCrudForm
        schema={schema}
        api={api}
        title="文章"
        confirmDelete
        actions={{ save: { text: '保存草稿' } }}
      />
    );

    expect(screen.getByText('新建文章')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /保存草稿/ })).toBeInTheDocument();
  });

  it('returns a copy and resets project defaults', () => {
    configureSchemaCrudForm({ title: '用户', actions: { save: { text: '提交' } } });
    const snapshot = getSchemaCrudFormDefaults();
    expect(snapshot.title).toBe('用户');
    snapshot.actions!.save = { text: '被改掉' };
    expect(getSchemaCrudFormDefaults().actions!.save).toEqual({ text: '提交' });

    resetSchemaCrudFormDefaults();
    expect(getSchemaCrudFormDefaults()).toEqual({});
  });
});

describe('automatic mode', () => {
  it('renders without a Card header when title is false', () => {
    const api = makeApi();
    render(<SchemaCrudForm schema={schema} api={api} title={false} />);

    expect(document.querySelector('.ant-card-head')).not.toBeInTheDocument();
  });

  it('renders create without id and never calls show', () => {
    const api = makeApi();
    render(<SchemaCrudForm schema={schema} api={api} title="文章" />);

    expect(screen.getByText('新建文章')).toBeInTheDocument();
    expect(api.show).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /编\s*辑/ })).not.toBeInTheDocument();
  });

  it('renders view with id and loads the record', async () => {
    const api = makeApi();
    render(<SchemaCrudForm schema={schema} api={api} id={7} title="文章" />);

    expect(screen.getByText('文章详情')).toBeInTheDocument();
    await waitFor(() => expect(api.show).toHaveBeenCalledWith({ id: 7 }));
    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(document.querySelector('.ant-descriptions')).toBeInTheDocument();
  });

  it('switches view -> edit -> view internally', async () => {
    const api = makeApi();
    render(<SchemaCrudForm schema={schema} api={api} id={7} title="文章" />);

    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));

    const input = await screen.findByLabelText('姓名');
    expect(input).toHaveValue('Ada');
    expect(screen.getByText('编辑文章')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }));
    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('文章详情')).toBeInTheDocument();
  });

  it('re-derives mode when id changes', async () => {
    const api = makeApi();
    const { rerender } = render(<SchemaCrudForm schema={schema} api={api} id={7} title="文章" />);

    await screen.findByText('Ada');
    rerender(<SchemaCrudForm schema={schema} api={api} title="文章" />);
    expect(screen.getByText('新建文章')).toBeInTheDocument();

    rerender(<SchemaCrudForm schema={schema} api={api} id={8} title="文章" />);
    expect(screen.getByText('文章详情')).toBeInTheDocument();
    await screen.findByText('Ada');
  });
});

describe('view fields', () => {
  it('shows only viewFields in view mode and the full schema in edit mode', async () => {
    const api = makeApi();
    render(
      <SchemaCrudForm
        schema={schema}
        api={api}
        id={7}
        title="文章"
        viewFields={['status']}
      />
    );

    await screen.findByText('active');
    expect(screen.getByText('状态')).toBeInTheDocument();
    expect(screen.queryByText('姓名')).not.toBeInTheDocument();
    expect(screen.queryByText('Ada')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    expect(await screen.findByLabelText('姓名')).toHaveValue('Ada');
    expect(screen.getByLabelText('状态')).toBeInTheDocument();

    expect(schema.fields.map((field) => field.key)).toEqual(['name', 'status']);
  });

  it('ignores viewFields outside view mode', () => {
    const api = makeApi();
    render(
      <SchemaCrudForm
        schema={schema}
        api={api}
        mode="create"
        viewFields={['status']}
      />
    );

    expect(screen.getByLabelText('姓名')).toBeInTheDocument();
    expect(screen.getByLabelText('状态')).toBeInTheDocument();
  });

  it('selects fields in order and skips unknown or hidden fields without mutating', () => {
    const mixedSchema: FormSchema = {
      ...schema,
      fields: [
        ...schema.fields,
        { key: 'secret', label: '内部字段', widget: 'input', hidden: true },
      ],
    };
    const selected = selectSchemaFields(mixedSchema, ['status', 'secret', 'missing', 'name', 'status']);

    expect(selected.fields.map((field) => field.key)).toEqual(['status', 'name']);
    expect(selected.initialValues).toBe(mixedSchema.initialValues);
    expect(mixedSchema.fields.map((field) => field.key)).toEqual(['name', 'status', 'secret']);
  });
});

describe('controlled mode', () => {
  it('does not switch internally and reports onModeChange', async () => {
    const api = makeApi();
    const onModeChange = vi.fn();
    render(
      <SchemaCrudForm
        schema={schema}
        api={api}
        id={7}
        mode="view"
        title="文章"
        onModeChange={onModeChange}
      />
    );

    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    expect(onModeChange).toHaveBeenCalledWith('edit');
    expect(screen.getByText('文章详情')).toBeInTheDocument();
    expect(screen.queryByLabelText('姓名')).not.toBeInTheDocument();
  });
});

describe('create', () => {
  it('submits schema initial values and emits onSuccess', async () => {
    const api = makeApi();
    const onSuccess = vi.fn<(event: CrudSuccessEvent) => void>();
    render(<SchemaCrudForm schema={schema} api={api} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: /创\s*建/ }));

    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    expect(api.create).toHaveBeenCalledWith({ name: 'Ada', status: 'active' });
    expect(onSuccess).toHaveBeenCalledWith({
      action: 'create',
      result: { id: 42 },
      values: { name: 'Ada', status: 'active' },
    });
  });

  it('applies schema.normalizeValues before create', async () => {
    const api = makeApi();
    const normalizedSchema: FormSchema = {
      ...schema,
      normalizeValues: (values) => ({
        ...values,
        name: String(values.name ?? '').trim(),
        source: 'crm',
      }),
    };
    render(<SchemaCrudForm schema={normalizedSchema} api={api} />);

    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '  Ada  ' } });
    fireEvent.click(screen.getByRole('button', { name: /创\s*建/ }));

    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    expect(api.create).toHaveBeenCalledWith({ name: 'Ada', status: 'active', source: 'crm' });
  });
});

describe('edit', () => {
  it('loads the record, submits update with id and returns to view', async () => {
    const api = makeApi();
    api.show
      .mockResolvedValueOnce({ id: 7, name: 'Ada', status: 'active' })
      .mockResolvedValueOnce({ id: 7, name: 'Grace', status: 'active' });
    const onSuccess = vi.fn<(event: CrudSuccessEvent) => void>();
    render(<SchemaCrudForm schema={schema} api={api} id={7} onSuccess={onSuccess} />);

    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));

    const input = await screen.findByLabelText('姓名');
    fireEvent.change(input, { target: { value: 'Grace' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
    expect(api.update).toHaveBeenCalledWith({ id: 7, name: 'Grace', status: 'active' });
    expect(onSuccess).toHaveBeenCalledWith({
      action: 'update',
      result: { id: 42 },
      values: { name: 'Grace', status: 'active' },
    });

    await waitFor(() => expect(api.show).toHaveBeenCalledTimes(2));
    expect(screen.getByText('记录详情')).toBeInTheDocument();
  });

  it('renders footer actions without React key warnings', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const api = makeApi();
    render(<SchemaCrudForm schema={schema} api={api} id={7} />);

    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    await screen.findByLabelText('姓名');

    const keyWarning = error.mock.calls.some((call) =>
      String(call[0]).includes('unique "key"')
    );
    expect(keyWarning).toBe(false);
  });

  it('shows the save shortcut hint in create and edit but not in view', async () => {
    const api = makeApi();
    const view = render(<SchemaCrudForm schema={schema} api={api} id={7} />);

    await screen.findByText('Ada');
    expect(screen.queryByText('⌘/Ctrl + S 保存')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    await screen.findByLabelText('姓名');
    expect(screen.getByText('⌘/Ctrl + S 保存')).toBeInTheDocument();
    view.unmount();

    render(<SchemaCrudForm schema={schema} api={api} />);
    expect(screen.getByText('⌘/Ctrl + S 保存')).toBeInTheDocument();
  });

  it('saves with Cmd+S on macOS in create mode', async () => {
    const api = makeApi();
    render(<SchemaCrudForm schema={schema} api={api} />);

    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: 'Ada' } });
    const allowed = fireEvent.keyDown(window, { key: 's', code: 'KeyS', metaKey: true });

    expect(allowed).toBe(false);
    await waitFor(() =>
      expect(api.create).toHaveBeenCalledWith({ name: 'Ada', status: 'active' })
    );
  });

  it('saves with Ctrl+S on Windows/Linux in edit mode', async () => {
    const api = makeApi();
    render(<SchemaCrudForm schema={schema} api={api} id={7} />);

    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    fireEvent.change(await screen.findByLabelText('姓名'), { target: { value: 'Grace' } });

    const allowed = fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true });

    expect(allowed).toBe(false);
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith({ id: 7, name: 'Grace', status: 'active' })
    );
  });

  it('suppresses the browser dialog but skips saving when edit has no changes', async () => {
    const api = makeApi();
    render(<SchemaCrudForm schema={schema} api={api} id={7} />);

    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    await screen.findByLabelText('姓名');

    const allowed = fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true });
    await flush();

    expect(allowed).toBe(false);
    expect(api.update).not.toHaveBeenCalled();
  });

  it('leaves the shortcut alone in view mode', async () => {
    const api = makeApi();
    render(<SchemaCrudForm schema={schema} api={api} id={7} />);

    await screen.findByText('Ada');
    const allowed = fireEvent.keyDown(window, { key: 's', code: 'KeyS', metaKey: true });

    expect(allowed).toBe(true);
    expect(api.update).not.toHaveBeenCalled();
  });

  it('does not treat an onSuccess rejection as an update failure', async () => {
    const api = makeApi();
    api.show
      .mockResolvedValueOnce({ id: 7, name: 'Ada', status: 'active' })
      .mockResolvedValueOnce({ id: 7, name: 'Grace', status: 'active' });
    const onSuccess = vi.fn(async () => {
      throw new Error('refresh failed');
    });
    const onError = vi.fn();
    render(<SchemaCrudForm schema={schema} api={api} id={7} onSuccess={onSuccess} onError={onError} />);

    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    fireEvent.change(await screen.findByLabelText('姓名'), { target: { value: 'Grace' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
        })
      )
    );
    await waitFor(() => expect(api.show).toHaveBeenCalledTimes(2));
    expect(screen.getByText('记录详情')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'update');
  });

  it('keeps save disabled until the form changes', async () => {
    const api = makeApi();
    render(<SchemaCrudForm schema={schema} api={api} id={7} />);

    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    const input = await screen.findByLabelText('姓名');
    const save = screen.getByRole('button', { name: /保\s*存/ });

    expect(save).toBeDisabled();
    fireEvent.change(input, { target: { value: 'Grace' } });
    await waitFor(() => expect(save).not.toBeDisabled());

    fireEvent.change(input, { target: { value: 'Ada' } });
    await waitFor(() => expect(save).toBeDisabled());
  });

  it('shows the dirty dot only after a change', async () => {
    const api = makeApi();
    render(<SchemaCrudForm schema={schema} api={api} id={7} />);

    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    const input = await screen.findByLabelText('姓名');

    expect(document.querySelector('.antd-form-schema-crud__dirty')).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'Grace' } });
    expect(document.querySelector('.antd-form-schema-crud__dirty')).toBeInTheDocument();
  });
});

describe('view', () => {
  it('does not mutate the passed schema, especially viewMode', async () => {
    const api = makeApi();
    const original = JSON.stringify(schema);
    render(<SchemaCrudForm schema={schema} api={api} id={7} />);
    await screen.findByText('Ada');
    expect(schema.viewMode).toBeUndefined();
    expect(JSON.stringify(schema)).toBe(original);
  });
});

describe('resource resolution', () => {
  it('resolves nx.$api from resource and api overrides per action', () => {
    const registry = {
      users_index: vi.fn(),
      users_show: vi.fn(),
      users_create: vi.fn(),
      users_update: vi.fn(),
      users_destroy: vi.fn(),
    };
    (globalThis as any).nx = { $api: registry };

    const resolved = resolveApi(undefined, 'users');
    expect(resolved.index).toBe(registry.users_index);
    expect(resolved.show).toBe(registry.users_show);
    expect(resolved.create).toBe(registry.users_create);
    expect(resolved.update).toBe(registry.users_update);
    expect(resolved.destroy).toBe(registry.users_destroy);

    const customShow = vi.fn();
    const merged = resolveApi({ show: customShow }, 'users');
    expect(merged.show).toBe(customShow);
    expect(merged.create).toBe(registry.users_create);

    expect(resolveApi(undefined, undefined)).toEqual({
      index: undefined,
      show: undefined,
      create: undefined,
      update: undefined,
      destroy: undefined,
    });
  });

  it('works end to end through the component with resource', async () => {
    const users_create = vi.fn(async () => ({ id: 1 }));
    (globalThis as any).nx = { $api: { users_create } };
    render(<SchemaCrudForm schema={schema} resource="users" />);
    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: /创\s*建/ }));
    await waitFor(() => expect(users_create).toHaveBeenCalledTimes(1));
  });
});

describe('requirement checks', () => {
  it('renders an error without firing requests when id is missing', () => {
    const api = makeApi();
    render(<SchemaCrudForm mode="edit" schema={schema} api={api} />);
    expect(screen.getByText(/缺少 id/)).toBeInTheDocument();
    expect(api.show).not.toHaveBeenCalled();
  });

  it('renders an error when the mode requires a missing api method', () => {
    render(<SchemaCrudForm mode="view" schema={schema} api={{ create: vi.fn() }} id={1} />);
    expect(screen.getByText(/缺少 show 接口/)).toBeInTheDocument();
  });

  it('renders an error when neither resource nor api is provided', () => {
    render(<SchemaCrudForm schema={schema} />);
    expect(screen.getByText(/缺少 resource 或 api/)).toBeInTheDocument();
  });

  it('checkRequirement reports per-mode needs', () => {
    const api = { show: vi.fn(), create: vi.fn(), update: vi.fn() };
    expect(checkRequirement('create', api, undefined, undefined).missing).toEqual([]);
    expect(checkRequirement('edit', api, undefined, 1).missing).toEqual([]);
    expect(checkRequirement('view', api, undefined, undefined).missing).toEqual(['id']);
    expect(checkRequirement('edit', { show: vi.fn() }, undefined, 1).missing).toEqual(['update']);
  });
});

describe('delete', () => {
  it('asks for confirmation by default and emits delete success', async () => {
    const api = makeApi();
    api.show
      .mockResolvedValueOnce({ id: 7, name: 'Ada', status: 'active' })
      .mockResolvedValueOnce({ id: 7, name: 'Grace', status: 'active' });
    const onSuccess = vi.fn<(event: CrudSuccessEvent) => void>();
    render(<SchemaCrudForm schema={schema} api={api} id={7} onSuccess={onSuccess} />);

    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    await screen.findByLabelText('姓名');

    const deleteButton = screen.getByRole('button', { name: /删\s*除/ });
    expect(deleteButton.closest('.antd-form-schema-crud__footer-right')).not.toBeNull();
    fireEvent.click(deleteButton);
    expect(api.destroy).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole('button', { name: /确\s*定/ }));
    await waitFor(() => expect(api.destroy).toHaveBeenCalledTimes(1));
    expect(api.destroy).toHaveBeenCalledWith({ id: 7 });
    expect(onSuccess).toHaveBeenCalledWith({ action: 'delete', result: { ok: true } });
  });

  it('deletes immediately when confirmDelete is false', async () => {
    const api = makeApi();
    render(<SchemaCrudForm schema={schema} api={api} id={7} confirmDelete={false} />);

    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    await screen.findByLabelText('姓名');
    fireEvent.click(screen.getByRole('button', { name: /删\s*除/ }));
    await waitFor(() => expect(api.destroy).toHaveBeenCalledTimes(1));
  });

  it('hides delete via actions and when destroy is missing', async () => {
    const api = makeApi();
    render(<SchemaCrudForm schema={schema} api={api} id={7} actions={{ delete: false }} />);
    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    await screen.findByLabelText('姓名');
    expect(screen.queryByRole('button', { name: /删\s*除/ })).not.toBeInTheDocument();

    const { destroy: _omit, ...withoutDestroy } = makeApi();
    render(<SchemaCrudForm schema={schema} api={withoutDestroy} id={8} />);
    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    await screen.findByLabelText('姓名');
    expect(screen.queryByRole('button', { name: /删\s*除/ })).not.toBeInTheDocument();
  });
});

describe('loading and failure', () => {
  it('uses the card skeleton instead of a spin while the record loads', async () => {
    const api = makeApi();
    let resolve!: (record: TestRecord) => void;
    api.show.mockImplementation(
      () => new Promise<TestRecord>((done) => {
        resolve = done;
      })
    );

    const { container } = render(<SchemaCrudForm schema={schema} api={api} id={7} />);
    await waitFor(() => expect(api.show).toHaveBeenCalled());
    expect(container.querySelector('.ant-card-loading')).toBeInTheDocument();
    expect(container.querySelector('.ant-spin')).not.toBeInTheDocument();

    resolve({ id: 7, name: 'Ada', status: 'active' });
    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(container.querySelector('.ant-card-loading')).not.toBeInTheDocument();
  });

  it('shows a retry alert when show fails and recovers on retry', async () => {
    const api = makeApi();
    api.show.mockRejectedValueOnce(new Error('boom'));
    render(<SchemaCrudForm schema={schema} api={api} id={7} />);

    expect(await screen.findByText('boom')).toBeInTheDocument();
    expect(screen.queryByText('Ada')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }));
    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(api.show).toHaveBeenCalledTimes(2);
  });

  it('keeps form values and reports onError when submit fails', async () => {
    const api = makeApi();
    api.update.mockRejectedValueOnce(new Error('save failed'));
    const onError = vi.fn();
    render(<SchemaCrudForm schema={schema} api={api} id={7} onError={onError} />);

    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    const input = await screen.findByLabelText('姓名');
    fireEvent.change(input, { target: { value: 'Grace' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    expect(await screen.findByText('save failed')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'update');
    expect(input).toHaveValue('Grace');
    expect(screen.getByRole('button', { name: /保\s*存/ })).not.toBeDisabled();
  });

  it('discards a stale response when id changes quickly', async () => {
    const api = makeApi();
    let resolveSlow!: (record: TestRecord) => void;
    api.show.mockImplementation(({ id }: { id: number }) => {
      if (id === 1) {
        return new Promise<TestRecord>((resolve) => {
          resolveSlow = resolve;
        });
      }
      return Promise.resolve({ id, name: 'Fast', status: 'active' });
    });

    const { rerender } = render(<SchemaCrudForm schema={schema} api={api} id={1} />);
    rerender(<SchemaCrudForm schema={schema} api={api} id={2} />);
    expect(await screen.findByText('Fast')).toBeInTheDocument();

    resolveSlow({ id: 1, name: 'Slow', status: 'active' });
    await flush();
    expect(screen.queryByText('Slow')).not.toBeInTheDocument();
    expect(screen.getByText('Fast')).toBeInTheDocument();
  });
});

describe('actions', () => {
  it('supports custom text and hiding buttons', () => {
    const api = makeApi();
    render(
      <SchemaCrudForm
        schema={schema}
        api={api}
        actions={{ save: { text: '马上创建' }, cancel: false }}
      />
    );
    expect(screen.getByRole('button', { name: /马上创建/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /取\s*消/ })).not.toBeInTheDocument();
  });

  it('calls onBack from create cancel and view back', async () => {
    const api = makeApi();
    const onBack = vi.fn();
    const { rerender } = render(<SchemaCrudForm schema={schema} api={api} onBack={onBack} />);

    const cancel = screen.getByRole('button', { name: /取\s*消/ });
    expect(cancel.closest('.antd-form-schema-crud__footer-right')).not.toBeNull();
    fireEvent.click(cancel);
    expect(onBack).toHaveBeenCalledTimes(1);

    rerender(<SchemaCrudForm schema={schema} api={api} id={7} onBack={onBack} />);
    await screen.findByText('Ada');
    fireEvent.click(screen.getAllByRole('button', { name: /返\s*回/ })[0]);
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it('renders custom extra and keeps navigation in the footer', async () => {
    const api = makeApi();
    render(
      <SchemaCrudForm
        schema={schema}
        api={api}
        id={7}
        extra={<a href="#help">帮助</a>}
        onBack={() => undefined}
      />
    );
    expect(screen.getByText('帮助')).toBeInTheDocument();
    expect(document.querySelector('.ant-card-head button')?.getAttribute('aria-label')).toBe('返回');
    await screen.findByText('Ada');
    expect(screen.getAllByRole('button', { name: /返\s*回/ }).length).toBeGreaterThan(0);
  });
});

describe('form mode', () => {
  it('creates without an id', async () => {
    const api = makeApi();
    render(<SchemaCrudForm schema={schema} api={api} mode="form" />);

    expect(screen.getByText('新建记录')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: /创\s*建/ }));

    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    expect(api.create).toHaveBeenCalledWith({ name: 'Ada', status: 'active' });
  });

  it('edits directly with an id and stays in edit after save', async () => {
    const api = makeApi();
    api.show
      .mockResolvedValueOnce({ id: 7, name: 'Ada', status: 'active' })
      .mockResolvedValueOnce({ id: 7, name: 'Grace', status: 'active' });
    render(<SchemaCrudForm schema={schema} api={api} id={7} mode="form" />);

    await screen.findByText('编辑记录');
    const input = await screen.findByLabelText('姓名');
    await waitFor(() => expect(input).toHaveValue('Ada'));
    expect(screen.queryByRole('button', { name: /编\s*辑/ })).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Grace' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(api.show).toHaveBeenCalledTimes(2));
    expect(screen.getByText('编辑记录')).toBeInTheDocument();
    expect(screen.queryByText('记录详情')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('姓名')).toHaveValue('Grace'));
  });

  it('leaves through onBack on cancel instead of switching to view', async () => {
    const api = makeApi();
    const onBack = vi.fn();
    render(<SchemaCrudForm schema={schema} api={api} id={7} mode="form" onBack={onBack} />);

    await waitFor(() => expect(screen.getByLabelText('姓名')).toHaveValue('Ada'));
    fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('记录详情')).not.toBeInTheDocument();
  });

  it('leaves through onBack after deleting', async () => {
    const api = makeApi();
    const onBack = vi.fn();
    render(<SchemaCrudForm schema={schema} api={api} id={7} mode="form" onBack={onBack} />);

    await waitFor(() => expect(screen.getByLabelText('姓名')).toHaveValue('Ada'));
    fireEvent.click(screen.getByRole('button', { name: /删\s*除/ }));
    fireEvent.click(await screen.findByRole('button', { name: /确\s*定/ }));

    await waitFor(() => expect(api.destroy).toHaveBeenCalledWith({ id: 7 }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('errorMessage', () => {
  it('extracts readable messages from common error shapes', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage({ message: 'server down' })).toBe('server down');
    expect(errorMessage({ error: { message: 'nested' } })).toBe('nested');
    expect(errorMessage('plain')).toBe('plain');
    expect(errorMessage(null)).toBe('操作失败，请重试。');
    expect(errorMessage({})).toBe('操作失败，请重试。');
  });
});
