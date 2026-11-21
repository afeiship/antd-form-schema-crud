/**
 * SchemaCrud component tests, following the plan in
 * docs/superpowers/specs/2026-11-21-schema-crud-design.md.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { FormSchema } from '@jswork/antd-form-schema';
import SchemaCrud, { SchemaCrud as NamedSchemaCrud } from '../src';
import { checkRequirement, errorMessage, resolveApi } from '../src';

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
  vi.restoreAllMocks();
  delete (globalThis as any).nx;
});

describe('exports', () => {
  it('exposes a named and a default export with a version', () => {
    expect(NamedSchemaCrud).toBe(SchemaCrud);
    expect(SchemaCrud.version).toBe('1.0.0');
  });
});

describe('create mode', () => {
  it('does not call show and submits create', async () => {
    const api = makeApi();
    const onCreated = vi.fn();
    render(<SchemaCrud mode="create" schema={schema} api={api} onCreated={onCreated} />);

    expect(api.show).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: /创\s*建/ }));

    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    expect(api.create).toHaveBeenCalledWith({ name: 'Ada', status: 'active' });
    expect(onCreated).toHaveBeenCalledWith({ id: 42 }, { name: 'Ada', status: 'active' });
  });

  it('merges createInitialValues over schema.initialValues', async () => {
    const api = makeApi();
    render(
      <SchemaCrud
        mode="create"
        schema={schema}
        api={api}
        createInitialValues={{ status: 'disabled' }}
      />
    );
    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: 'Bob' } });
    fireEvent.click(screen.getByRole('button', { name: /创\s*建/ }));
    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    expect(api.create).toHaveBeenCalledWith({ name: 'Bob', status: 'disabled' });
  });

  it('runs beforeSubmit before create and supports async transforms', async () => {
    const api = makeApi();
    render(
      <SchemaCrud
        mode="create"
        schema={schema}
        api={api}
        beforeSubmit={async (values) => ({ ...values, source: 'crm' })}
      />
    );
    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: /创\s*建/ }));
    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    expect(api.create).toHaveBeenCalledWith({ name: 'Ada', status: 'active', source: 'crm' });
  });
});

describe('edit mode', () => {
  it('calls show({ id }), back-fills the form and submits update with id', async () => {
    const api = makeApi();
    render(<SchemaCrud mode="edit" schema={schema} api={api} id={7} />);

    expect(screen.queryByLabelText('姓名')).not.toBeInTheDocument();
    const input = await screen.findByLabelText('姓名');
    expect(api.show).toHaveBeenCalledWith({ id: 7 });
    expect(input).toHaveValue('Ada');

    fireEvent.change(input, { target: { value: 'Grace' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
    expect(api.update).toHaveBeenCalledWith({ id: 7, name: 'Grace', status: 'active' });
  });

  it('applies mapRecord to the show payload', async () => {
    const api = makeApi();
    render(
      <SchemaCrud
        mode="edit"
        schema={schema}
        api={api}
        id={7}
        mapRecord={(record) => ({ ...record, name: record.name.toUpperCase() })}
      />
    );
    const input = await screen.findByLabelText('姓名');
    expect(input).toHaveValue('ADA');
  });
});

describe('view mode', () => {
  it('renders Descriptions without a submit button and supports edit callback', async () => {
    const api = makeApi();
    const onEdit = vi.fn();
    render(<SchemaCrud mode="view" schema={schema} api={api} id={7} onEdit={onEdit} />);

    expect(screen.queryByRole('button', { name: /创\s*建/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /保\s*存/ })).not.toBeInTheDocument();

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(api.show).toHaveBeenCalledWith({ id: 7 });

    const descriptions = document.querySelector('.ant-descriptions');
    expect(descriptions).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    expect(onEdit).toHaveBeenCalledWith({ id: 7, name: 'Ada', status: 'active' });
  });

  it('does not mutate the passed schema, especially viewMode', async () => {
    const api = makeApi();
    const original = JSON.stringify(schema);
    render(<SchemaCrud mode="view" schema={schema} api={api} id={7} />);
    await screen.findByText('Ada');
    expect(schema.viewMode).toBeUndefined();
    expect(JSON.stringify(schema)).toBe(original);
  });
});

describe('resource resolution', () => {
  it('resolves nx.$api from resource and api overrides per action', () => {
    const registry = {
      users_show: vi.fn(),
      users_create: vi.fn(),
      users_update: vi.fn(),
      users_destroy: vi.fn(),
    };
    (globalThis as any).nx = { $api: registry };

    const resolved = resolveApi(undefined, 'users');
    expect(resolved.show).toBe(registry.users_show);
    expect(resolved.create).toBe(registry.users_create);
    expect(resolved.update).toBe(registry.users_update);
    expect(resolved.destroy).toBe(registry.users_destroy);

    const customShow = vi.fn();
    const merged = resolveApi({ show: customShow }, 'users');
    expect(merged.show).toBe(customShow);
    expect(merged.create).toBe(registry.users_create);

    expect(resolveApi(undefined, undefined)).toEqual({
      show: undefined,
      create: undefined,
      update: undefined,
      destroy: undefined,
    });
  });

  it('works end to end through the component with resource', async () => {
    const users_create = vi.fn(async () => ({ id: 1 }));
    (globalThis as any).nx = { $api: { users_create } };
    render(<SchemaCrud mode="create" schema={schema} resource="users" />);
    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: /创\s*建/ }));
    await waitFor(() => expect(users_create).toHaveBeenCalledTimes(1));
  });
});

describe('requirement checks', () => {
  it('renders an error without firing requests when id is missing', () => {
    const api = makeApi();
    render(<SchemaCrud mode="edit" schema={schema} api={api} />);
    expect(screen.getByText(/缺少 id/)).toBeInTheDocument();
    expect(api.show).not.toHaveBeenCalled();
  });

  it('renders an error when the mode requires a missing api method', () => {
    render(<SchemaCrud mode="view" schema={schema} api={{ create: vi.fn() }} id={1} />);
    expect(screen.getByText(/缺少 show 接口/)).toBeInTheDocument();
  });

  it('renders an error when neither resource nor api is provided', () => {
    render(<SchemaCrud mode="create" schema={schema} />);
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
  it('asks for confirmation by default and destroys on confirm', async () => {
    const api = makeApi();
    const onDeleted = vi.fn();
    render(<SchemaCrud mode="edit" schema={schema} api={api} id={7} onDeleted={onDeleted} />);
    await screen.findByLabelText('姓名');

    fireEvent.click(screen.getByRole('button', { name: /删\s*除/ }));
    expect(api.destroy).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole('button', { name: /确\s*定/ }));
    await waitFor(() => expect(api.destroy).toHaveBeenCalledTimes(1));
    expect(api.destroy).toHaveBeenCalledWith({ id: 7 });
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith({ ok: true }));
  });

  it('deletes immediately when deleteConfirm is false', async () => {
    const api = makeApi();
    render(
      <SchemaCrud mode="edit" schema={schema} api={api} id={7} deleteConfirm={false} />
    );
    await screen.findByLabelText('姓名');
    fireEvent.click(screen.getByRole('button', { name: /删\s*除/ }));
    await waitFor(() => expect(api.destroy).toHaveBeenCalledTimes(1));
  });

  it('hides the delete button when canDelete is false', async () => {
    const api = makeApi();
    render(<SchemaCrud mode="edit" schema={schema} api={api} id={7} canDelete={false} />);
    await screen.findByLabelText('姓名');
    expect(screen.queryByRole('button', { name: /删\s*除/ })).not.toBeInTheDocument();
  });

  it('hides the delete button when destroy is missing', async () => {
    const { destroy: _omit, ...api } = makeApi();
    render(<SchemaCrud mode="edit" schema={schema} api={api} id={7} />);
    await screen.findByLabelText('姓名');
    expect(screen.queryByRole('button', { name: /删\s*除/ })).not.toBeInTheDocument();
  });
});

describe('loading and failure', () => {
  it('shows a retry alert when show fails and recovers on retry', async () => {
    const api = makeApi();
    api.show.mockRejectedValueOnce(new Error('boom'));
    render(<SchemaCrud mode="edit" schema={schema} api={api} id={7} />);

    expect(await screen.findByText('boom')).toBeInTheDocument();
    expect(screen.queryByLabelText('姓名')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /保\s*存/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }));
    const input = await screen.findByLabelText('姓名');
    expect(input).toHaveValue('Ada');
    expect(api.show).toHaveBeenCalledTimes(2);
  });

  it('keeps form values and reports onError when submit fails', async () => {
    const api = makeApi();
    api.update.mockRejectedValueOnce(new Error('save failed'));
    const onError = vi.fn();
    render(<SchemaCrud mode="edit" schema={schema} api={api} id={7} onError={onError} />);

    const input = await screen.findByLabelText('姓名');
    fireEvent.change(input, { target: { value: 'Grace' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    expect(await screen.findByText('save failed')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'update');
    expect(input).toHaveValue('Grace');

    const submit = screen.getByRole('button', { name: /保\s*存/ });
    expect(submit).not.toBeDisabled();
    expect(submit).not.toHaveClass('ant-btn-loading');
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

    const { rerender } = render(<SchemaCrud mode="edit" schema={schema} api={api} id={1} />);
    rerender(<SchemaCrud mode="edit" schema={schema} api={api} id={2} />);
    const input = await screen.findByLabelText('姓名');
    expect(input).toHaveValue('Fast');

    resolveSlow({ id: 1, name: 'Slow', status: 'active' });
    await flush();
    expect(input).toHaveValue('Fast');
  });
});

describe('footer and actions', () => {
  it('renders no action bar when footer is false', () => {
    const api = makeApi();
    render(<SchemaCrud mode="create" schema={schema} api={api} footer={false} />);
    expect(document.querySelector('.antd-form-schema-crud__footer')).not.toBeInTheDocument();
  });

  it('lets a custom footer take over the default actions', () => {
    const api = makeApi();
    render(
      <SchemaCrud
        mode="create"
        schema={schema}
        api={api}
        footer={<button type="button">自定义提交</button>}
      />
    );
    expect(screen.getByRole('button', { name: '自定义提交' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /创\s*建/ })).not.toBeInTheDocument();
  });

  it('supports custom action text and hiding buttons', async () => {
    const api = makeApi();
    render(
      <SchemaCrud
        mode="create"
        schema={schema}
        api={api}
        actions={{ submit: { text: '马上创建' }, delete: false }}
      />
    );
    expect(screen.getByRole('button', { name: /马上创建/ })).toBeInTheDocument();
  });

  it('shows cancel and calls onCancel', () => {
    const api = makeApi();
    const onCancel = vi.fn();
    render(<SchemaCrud mode="create" schema={schema} api={api} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders the header when title or extra is present', () => {
    const api = makeApi();
    render(
      <SchemaCrud mode="create" schema={schema} api={api} title="新建用户" extra={<a>帮助</a>} />
    );
    expect(screen.getByText('新建用户')).toBeInTheDocument();
    expect(screen.getByText('帮助')).toBeInTheDocument();
    expect(
      document.querySelector('.antd-form-schema-crud__header')
    ).toBeInTheDocument();
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
