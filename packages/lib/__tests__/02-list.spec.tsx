import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { FormSchema } from '@jswork/antd-form-schema';
import { SchemaCrudList } from '../src';
import type { CrudListParams, CrudSuccessEvent } from '../src';

type Row = { id: number; name: string; status: string; secret?: string };

const schema: FormSchema = {
  fields: [
    { key: 'name', label: '姓名', widget: 'input' },
    { key: 'status', label: '状态', widget: 'select', options: [['active', '启用'], ['disabled', '停用']] },
    { key: 'secret', label: '隐藏', widget: 'input', hidden: true },
    {
      key: 'conditional',
      label: '条件',
      widget: 'input',
      condition: { field: 'status', op: 'eq', value: 'active' },
    },
  ],
};

const rows: Row[] = [
  { id: 1, name: 'Ada', status: 'active' },
  { id: 2, name: 'Grace', status: 'disabled' },
];

const makeApi = () => ({
  index: vi.fn(async (_params: CrudListParams) => ({ rows, total: rows.length })),
  destroy: vi.fn(async () => ({ ok: true })),
});

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('list basics', () => {
  it('uses the card skeleton for the initial load and table loading afterwards', async () => {
    const api = makeApi();
    let resolve!: (result: { rows: Row[]; total: number }) => void;
    api.index.mockImplementation(
      () => new Promise<{ rows: Row[]; total: number }>((done) => {
        resolve = done;
      })
    );

    const { container } = render(<SchemaCrudList schema={schema} api={api} />);
    await waitFor(() => expect(api.index).toHaveBeenCalled());
    expect(container.querySelector('.ant-card-loading')).toBeInTheDocument();
    expect(container.querySelector('.ant-spin')).not.toBeInTheDocument();

    resolve({ rows, total: rows.length });
    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(container.querySelector('.ant-card-loading')).not.toBeInTheDocument();
  });

  it('requests page 1 and renders schema-derived columns', async () => {
    const api = makeApi();
    render(<SchemaCrudList schema={schema} api={api} title="用户" onCreate={vi.fn()} />);

    await waitFor(() => expect(api.index).toHaveBeenCalledWith({ page: 1, size: 10 }));
    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('用户列表')).toBeInTheDocument();
    expect(screen.getByText('姓名')).toBeInTheDocument();
    expect(screen.getByText('状态')).toBeInTheDocument();
    expect(screen.getByText('启用')).toBeInTheDocument();
    expect(screen.queryByText('隐藏')).not.toBeInTheDocument();
    expect(screen.queryByText('条件')).not.toBeInTheDocument();
    const createButton = screen.getByRole('button', { name: /新\s*建/ });
    const refreshButton = screen.getByRole('button', { name: /刷\s*新/ });
    expect(createButton).toHaveClass('ant-btn-sm');
    expect(refreshButton).toHaveClass('ant-btn-sm');
    expect(document.querySelector('.ant-table-small')).toBeInTheDocument();
  });

  it('hides a derived column through presets.hidden', async () => {
    const api = makeApi();
    render(
      <SchemaCrudList
        schema={schema}
        api={api}
        presets={{ fields: { status: { hidden: true } } }}
      />
    );

    await screen.findByText('Ada');
    expect(screen.getByText('姓名')).toBeInTheDocument();
    expect(screen.queryByText('状态')).not.toBeInTheDocument();
  });

  it('supports explicit columns and presets, with explicit props winning', async () => {
    const api = makeApi();
    render(
      <SchemaCrudList
        schema={schema}
        api={api}
        presets={{ fields: { name: { title: '名字', width: 200 }, status: { title: '账号状态' } } }}
        columns={[
          { key: 'name', dataIndex: 'name', width: 120 },
          { key: 'status', dataIndex: 'status' },
        ]}
      />
    );

    await screen.findByText('Ada');
    expect(screen.getByText('名字')).toBeInTheDocument();
    expect(screen.getByText('账号状态')).toBeInTheDocument();
    expect(document.querySelector('colgroup col')).toHaveStyle({ width: '120px' });
  });

  it('supports flat presets for titles', async () => {
    const api = makeApi();
    render(<SchemaCrudList schema={schema} api={api} presets={{ name: '名字', status: '账号状态' }} />);

    await screen.findByText('Ada');
    expect(screen.getByText('名字')).toBeInTheDocument();
    expect(screen.getByText('账号状态')).toBeInTheDocument();
  });
});

describe('pagination and responses', () => {
  it('switches pages with server-side pagination', async () => {
    const api = makeApi();
    api.index.mockImplementation(async ({ page }: CrudListParams) => ({
      rows: page === 1 ? rows : [{ id: 3, name: 'Page2', status: 'active' }],
      total: 11,
    }));
    render(<SchemaCrudList schema={schema} api={api} />);

    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));
    await waitFor(() => expect(api.index).toHaveBeenLastCalledWith({ page: 2, size: 10 }));
    expect(await screen.findByText('Page2')).toBeInTheDocument();
  });

  it('hydrates from a controlled page and follows external page changes', async () => {
    const api = makeApi();
    api.index.mockImplementation(async ({ page }: CrudListParams) => ({
      rows: [{ id: page, name: `Page${page}`, status: 'active' }],
      total: 31,
    }));

    const { rerender } = render(<SchemaCrudList schema={schema} api={api} page={2} />);
    await waitFor(() => expect(api.index).toHaveBeenLastCalledWith({ page: 2, size: 10 }));
    expect(await screen.findByText('Page2')).toBeInTheDocument();

    rerender(<SchemaCrudList schema={schema} api={api} page={3} />);
    await waitFor(() => expect(api.index).toHaveBeenLastCalledWith({ page: 3, size: 10 }));
    expect(await screen.findByText('Page3')).toBeInTheDocument();
  });

  it('reports page changes so the caller can sync the route', async () => {
    const api = makeApi();
    const onPageChange = vi.fn();
    api.index.mockResolvedValue({ rows, total: 21 });
    render(<SchemaCrudList schema={schema} api={api} page={1} onPageChange={onPageChange} />);

    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(onPageChange).toHaveBeenCalledWith(2, 10);
    await waitFor(() => expect(api.index).toHaveBeenLastCalledWith({ page: 2, size: 10 }));
  });

  it('resets to page 1 when params change and ignores stale responses', async () => {
    const api = makeApi();
    let resolveFirst!: (value: { rows: Row[]; total: number }) => void;
    api.index
      .mockImplementationOnce(
        () =>
          new Promise<{ rows: Row[]; total: number }>((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValueOnce({ rows: [{ id: 2, name: 'Fast', status: 'active' }], total: 2 });

    const { rerender } = render(<SchemaCrudList schema={schema} api={api} params={{ q: 'a' }} />);
    rerender(<SchemaCrudList schema={schema} api={api} params={{ q: 'b' }} />);

    expect(await screen.findByText('Fast')).toBeInTheDocument();
    resolveFirst({ rows: [{ id: 1, name: 'Slow', status: 'active' }], total: 2 });
    await flush();

    expect(screen.queryByText('Slow')).not.toBeInTheDocument();
    expect(api.index).toHaveBeenLastCalledWith({ page: 1, size: 10, q: 'b' });
  });

  it('shows a retry alert when index fails', async () => {
    const api = makeApi();
    api.index.mockRejectedValueOnce(new Error('boom'));
    render(<SchemaCrudList schema={schema} api={api} />);

    expect(await screen.findByText('boom')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }));
    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(api.index).toHaveBeenCalledTimes(2);
  });

  it('rejects an invalid { rows, total } response', async () => {
    const api = makeApi();
    api.index.mockResolvedValueOnce({ rows: 'nope', total: 'nope' } as any);
    render(<SchemaCrudList schema={schema} api={api} resource="users" />);

    expect(await screen.findByText(/users_index 返回结构必须是 { rows, total }/)).toBeInTheDocument();
    expect(screen.queryByText('Ada')).not.toBeInTheDocument();
  });

  it('shows a readable error when index is missing', () => {
    render(<SchemaCrudList schema={schema} api={{ show: vi.fn() }} resource="users" />);
    expect(screen.getByText(/缺少 users_index 接口/)).toBeInTheDocument();
  });
});

describe('row actions', () => {
  it('does not render a view action', async () => {
    const api = makeApi();
    render(<SchemaCrudList schema={schema} api={api} onEdit={vi.fn()} />);

    await screen.findByText('Ada');
    expect(screen.queryByRole('button', { name: /查\s*看/ })).not.toBeInTheDocument();
  });

  it('calls onEdit from the action button', async () => {
    const api = makeApi();
    const onEdit = vi.fn();
    render(<SchemaCrudList schema={schema} api={api} onEdit={onEdit} />);

    await screen.findByText('Ada');
    fireEvent.click(screen.getAllByRole('button', { name: /编\s*辑/ })[0]);
    expect(onEdit).toHaveBeenCalledWith(rows[0]);
  });

  it('confirms delete, emits success and refreshes the list', async () => {
    const api = makeApi();
    const onSuccess = vi.fn<(event: CrudSuccessEvent) => void>();
    render(<SchemaCrudList schema={schema} api={api} onSuccess={onSuccess} />);

    await screen.findByText('Ada');
    fireEvent.click(screen.getAllByRole('button', { name: /删\s*除/ })[0]);
    expect(api.destroy).not.toHaveBeenCalled();

    expect(await screen.findByText('确定删除这条记录吗？')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /确\s*定/ }));
    await waitFor(() => expect(api.destroy).toHaveBeenCalledWith({ id: 1 }));
    expect(onSuccess).toHaveBeenCalledWith({ action: 'delete', result: { ok: true } });
    await waitFor(() => expect(api.index).toHaveBeenCalledTimes(2));
  });

  it('steps back a page after deleting the last row on page 2', async () => {
    const api = makeApi();
    api.index.mockImplementation(async ({ page }: CrudListParams) => ({
      rows: page === 1 ? rows : [{ id: 3, name: 'Only', status: 'active' }],
      total: 11,
    }));
    render(<SchemaCrudList schema={schema} api={api} />);

    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));
    await screen.findByText('Only');
    fireEvent.click(screen.getByRole('button', { name: /删\s*除/ }));
    expect(await screen.findByText('确定删除这条记录吗？')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /确\s*定/ }));

    await waitFor(() => expect(api.index).toHaveBeenLastCalledWith({ page: 1, size: 10 }));
  });

  it('hides actions through the actions prop', async () => {
    const api = makeApi();
    render(
      <SchemaCrudList
        schema={schema}
        api={api}
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        actions={{ create: false, refresh: false, edit: false, delete: false }}
      />
    );

    await screen.findByText('Ada');
    expect(screen.queryByRole('button', { name: /新\s*建/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /刷\s*新/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /编\s*辑/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /删\s*除/ })).not.toBeInTheDocument();
  });
});
