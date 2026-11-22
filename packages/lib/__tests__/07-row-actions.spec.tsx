import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { FormSchema } from '@jswork/antd-form-schema';
import { SchemaCrudList } from '../src';
import type { CrudListParams, CrudRowAction } from '../src/types';
import { isBuiltinRowAction, resolveRowAction } from '../src/components/list/row-action';

type Row = { id: number; name: string; slug?: string };

const row: Row = { id: 1, name: 'Ada', slug: 'ada' };

describe('resolveRowAction', () => {
  it('keeps an item without hidden or href', () => {
    const action: CrudRowAction<Row> = { key: 'copy', text: '复制', onClick: () => undefined };
    expect(resolveRowAction(action, row, 3)).toEqual({ action, index: 3 });
  });

  it('hides when hidden is true', () => {
    expect(resolveRowAction({ key: 'x', hidden: true }, row, 0)).toBeNull();
  });

  it('evaluates hidden per record', () => {
    const action: CrudRowAction<Row> = {
      key: 'edit',
      hidden: (record) => record.id > 1,
    };
    expect(resolveRowAction(action, row, 0)).not.toBeNull();
    expect(resolveRowAction(action, { id: 2, name: 'Grace' }, 0)).toBeNull();
  });

  it('resolves a functional href', () => {
    const action: CrudRowAction<Row> = {
      key: 'preview',
      href: (record) => (record.slug ? `/albums/${record.slug}` : null),
    };
    expect(resolveRowAction(action, row, 1)?.href).toBe('/albums/ada');
    expect(resolveRowAction(action, { id: 2, name: 'Grace' }, 1)).toBeNull();
  });

  it('treats an empty static href as hidden', () => {
    expect(resolveRowAction({ key: 'preview', href: '' }, row, 0)).toBeNull();
  });

  it('keeps a static href', () => {
    expect(resolveRowAction({ key: 'preview', href: '/albums/ada' }, row, 0)?.href).toBe(
      '/albums/ada'
    );
  });
});

describe('isBuiltinRowAction', () => {
  it('separates business items from builtin references', () => {
    expect(isBuiltinRowAction({ builtin: 'edit' })).toBe(true);
    expect(isBuiltinRowAction({ key: 'preview', text: '预览' })).toBe(false);
  });
});

const listSchema: FormSchema = {
  fields: [{ key: 'name', label: '姓名', widget: 'input' }],
};

const listRows: Row[] = [
  { id: 1, name: 'Ada', slug: 'ada' },
  { id: 2, name: 'Grace' },
];

const makeListApi = () => ({
  index: vi.fn(async (_params: CrudListParams) => ({ rows: listRows, total: listRows.length })),
  destroy: vi.fn(async () => ({ ok: true })),
});

const cellTexts = (container: HTMLElement, rowIndex: number) => {
  const row = container.querySelectorAll('tbody tr')[rowIndex];
  return Array.from(row.querySelectorAll('td:last-child button, td:last-child a')).map(
    (node) => node.textContent ?? ''
  );
};

describe('SchemaCrudList rowActions', () => {
  it('prepends business actions before the built-in edit / delete by default', async () => {
    const api = makeListApi();
    const onEdit = vi.fn();
    const { container } = render(
      <SchemaCrudList
        schema={listSchema}
        api={api}
        onEdit={onEdit}
        rowActions={{
          items: [{ key: 'preview', text: '预览', href: (record) => `/albums/${record.slug}` }],
        }}
      />
    );

    await screen.findByText('Ada');
    expect(cellTexts(container, 0)).toEqual(['预览', '编辑', '删除']);
  });

  it('appends business actions after the built-in edit / delete', async () => {
    const api = makeListApi();
    const { container } = render(
      <SchemaCrudList
        schema={listSchema}
        api={api}
        onEdit={vi.fn()}
        rowActions={{
          mode: 'append',
          items: [{ key: 'copy', text: '复制', onClick: vi.fn() }],
        }}
      />
    );

    await screen.findByText('Ada');
    expect(cellTexts(container, 0)).toEqual(['编辑', '删除', '复制']);
  });

  it('renders an external link with target and rel, and hides it when href resolves empty', async () => {
    const api = makeListApi();
    const { container } = render(
      <SchemaCrudList
        schema={listSchema}
        api={api}
        onEdit={vi.fn()}
        rowActions={{
          items: [
            {
              key: 'preview',
              text: '预览',
              target: '_blank',
              href: (record) => (record.slug ? `/albums/${record.slug}` : null),
            },
          ],
        }}
      />
    );

    await screen.findByText('Ada');
    expect(cellTexts(container, 0)).toEqual(['预览', '编辑', '删除']);
    expect(cellTexts(container, 1)).toEqual(['编辑', '删除']);

    const link = screen.getAllByText('预览')[0].closest('a');
    expect(link).toHaveAttribute('href', '/albums/ada');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('passes the record, index and reload to onClick', async () => {
    const api = makeListApi();
    const onClick = vi.fn();
    const { container } = render(
      <SchemaCrudList
        schema={listSchema}
        api={api}
        onEdit={vi.fn()}
        rowActions={{
          items: [
            {
              key: 'refresh',
              text: '刷新',
              onClick: (record, context) => {
                onClick(record.name, context.index);
                context.reload();
              },
            },
          ],
        }}
      />
    );

    await screen.findByText('Grace');
    await waitFor(() => expect(api.index).toHaveBeenCalledTimes(1));

    const row = container.querySelectorAll('tbody tr')[1] as HTMLElement;
    fireEvent.click(row.querySelector('td:last-child button') as HTMLElement);

    expect(onClick).toHaveBeenCalledWith('Grace', 1);
    await waitFor(() => expect(api.index).toHaveBeenCalledTimes(2));
  });

  it('renders a custom node through render', async () => {
    const api = makeListApi();
    const { container } = render(
      <SchemaCrudList
        schema={listSchema}
        api={api}
        onEdit={vi.fn()}
        rowActions={{
          items: [
            {
              key: 'detail',
              render: ({ record, index, loading }) => (
                <span>{`详情 ${record.name} ${index} ${String(loading)}`}</span>
              ),
            },
          ],
        }}
      />
    );

    await screen.findByText('Ada');
    expect(screen.getByText('详情 Ada 0 false')).toBeInTheDocument();
  });

  it('asks for confirmation before running a confirmed action', async () => {
    const api = makeListApi();
    const onClick = vi.fn();
    render(
      <SchemaCrudList
        schema={listSchema}
        api={api}
        onEdit={vi.fn()}
        rowActions={{
          items: [
            {
              key: 'approve',
              text: '通过',
              confirm: { title: '确认通过吗？' },
              onClick,
            },
          ],
        }}
      />
    );

    await screen.findByText('Ada');
    fireEvent.click(screen.getAllByText('通过')[0]);
    expect(await screen.findByText('确认通过吗？')).toBeInTheDocument();
    expect(onClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByText(/确\s*定/)[0]);
    await waitFor(() => expect(onClick).toHaveBeenCalled());
  });

  it('skips an action that has no text, href, onClick or render', async () => {
    const api = makeListApi();
    const { container } = render(
      <SchemaCrudList schema={listSchema} api={api} onEdit={vi.fn()} rowActions={{ items: [{ key: 'noop' }] }} />
    );

    await screen.findByText('Ada');
    expect(cellTexts(container, 0)).toEqual(['编辑', '删除']);
  });
});

describe('SchemaCrudList rowActions replace mode', () => {
  it('renders only the items and keeps the requested order', async () => {
    const api = makeListApi();
    const { container } = render(
      <SchemaCrudList
        schema={listSchema}
        api={api}
        onEdit={vi.fn()}
        rowActions={{
          mode: 'replace',
          items: [
            { key: 'copy', text: '复制', onClick: vi.fn() },
            { builtin: 'edit' },
            { builtin: 'delete' },
          ],
        }}
      />
    );

    await screen.findByText('Ada');
    expect(cellTexts(container, 0)).toEqual(['复制', '编辑', '删除']);
  });

  it('drops the built-in buttons that are not referenced', async () => {
    const api = makeListApi();
    const { container } = render(
      <SchemaCrudList
        schema={listSchema}
        api={api}
        onEdit={vi.fn()}
        rowActions={{
          mode: 'replace',
          items: [{ key: 'preview', text: '预览', href: '/albums/ada' }],
        }}
      />
    );

    await screen.findByText('Ada');
    expect(cellTexts(container, 0)).toEqual(['预览']);
  });

  it('lets a builtin reference override text and hide per record', async () => {
    const api = makeListApi();
    const { container } = render(
      <SchemaCrudList
        schema={listSchema}
        api={api}
        onEdit={vi.fn()}
        rowActions={{
          mode: 'replace',
          items: [
            {
              builtin: 'edit',
              text: '修改',
              hidden: (record) => record.slug === 'ada',
            },
          ],
        }}
      />
    );

    await screen.findByText('Ada');
    expect(cellTexts(container, 0)).toEqual([]);
    expect(cellTexts(container, 1)).toEqual(['修改']);
  });

  it('ignores builtin references outside replace mode', async () => {
    const api = makeListApi();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { container } = render(
      <SchemaCrudList
        schema={listSchema}
        api={api}
        onEdit={vi.fn()}
        rowActions={{
          items: [{ key: 'copy', text: '复制', onClick: vi.fn() }, { builtin: 'delete' }],
        }}
      />
    );

    await screen.findByText('Ada');
    expect(cellTexts(container, 0)).toEqual(['复制', '编辑', '删除']);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('仅在 replace 模式生效'));
  });
});

const lastHeader = (container: HTMLElement) =>
  container.querySelector('thead th:last-child') as HTMLElement | null;

const actionColWidth = (container: HTMLElement) =>
  (container.querySelectorAll('colgroup col')[1] as HTMLElement | undefined)?.style.width;

describe('SchemaCrudList action column', () => {
  it('uses the item count for width and lets actionColumn override it', async () => {
    const api = makeListApi();
    const { container, unmount } = render(
      <SchemaCrudList
        schema={listSchema}
        api={api}
        onEdit={vi.fn()}
        rowActions={{ items: [{ key: 'copy', text: '复制', onClick: vi.fn() }] }}
      />
    );

    await screen.findByText('Ada');
    expect(actionColWidth(container)).toBe('160px');
    unmount();

    const overridden = render(
      <SchemaCrudList
        schema={listSchema}
        api={api}
        onEdit={vi.fn()}
        rowActions={{ items: [{ key: 'copy', text: '复制', onClick: vi.fn() }] }}
        actionColumn={{ title: '操作区', width: 220 }}
      />
    );

    await screen.findByText('操作区');
    expect(lastHeader(overridden.container)?.textContent).toBe('操作区');
    expect(actionColWidth(overridden.container)).toBe('220px');
  });

  it('hides the whole column when rowActions is null', async () => {
    const api = makeListApi();
    render(
      <SchemaCrudList schema={listSchema} api={api} onEdit={vi.fn()} rowActions={null} />
    );

    await screen.findByText('Ada');
    expect(screen.queryByText('操作')).not.toBeInTheDocument();
    expect(screen.queryByText('编辑')).not.toBeInTheDocument();
  });

  it('falls back to prepend when mode is invalid', async () => {
    const api = makeListApi();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { container } = render(
      <SchemaCrudList
        schema={listSchema}
        api={api}
        onEdit={vi.fn()}
        rowActions={{ mode: 'before' as any, items: [{ key: 'copy', text: '复制', onClick: vi.fn() }] }}
      />
    );

    await screen.findByText('Ada');
    expect(cellTexts(container, 0)).toEqual(['复制', '编辑', '删除']);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('rowActions.mode 非法'));
  });

  it('warns when explicit columns already contain the action column key', async () => {
    const api = makeListApi();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <SchemaCrudList
        schema={listSchema}
        api={api}
        onEdit={vi.fn()}
        columns={[
          { key: 'name', dataIndex: 'name', title: '姓名' },
          { key: '__schema_crud_actions', title: '自定义操作', render: () => null },
        ]}
      />
    );

    await screen.findByText('Ada');
    expect(error).toHaveBeenCalledWith(expect.stringContaining('已包含 __schema_crud_actions'));
  });
});
