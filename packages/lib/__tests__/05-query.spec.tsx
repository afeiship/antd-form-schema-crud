import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { SchemaCrudList } from '../src';
import type { CrudListParams } from '../src';

const schema = {
  fields: [
    { key: 'name', label: '姓名', widget: 'input' as const },
    { key: 'status', label: '状态', widget: 'input' as const },
  ],
};

const rows = [{ id: 1, name: 'Ada', status: 'active' }];
const makeApi = (total = rows.length) => ({
  index: vi.fn(async (_params: CrudListParams) => ({ rows, total })),
});

function SearchProbe() {
  const location = useLocation();
  return <output data-testid="search">{location.search}</output>;
}

const renderInRouter = (
  entry: string,
  props: React.ComponentProps<typeof SchemaCrudList>
) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <SchemaCrudList {...props} />
      <SearchProbe />
    </MemoryRouter>
  );

describe('query slots', () => {
  it('renders before, headerStart, headerEnd and body in order', async () => {
    const api = makeApi();
    const { container } = render(
      <SchemaCrudList
        schema={schema}
        api={api}
        onCreate={vi.fn()}
        query={{
          slots: {
            before: () => <span data-testid="query-before">before</span>,
            headerStart: () => <span data-testid="query-start">start</span>,
            headerEnd: () => <span data-testid="query-end">end</span>,
            body: () => <span data-testid="query-body">body</span>,
          },
        }}
      />
    );

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    const before = screen.getByTestId('query-before');
    const card = container.querySelector('.ant-card');
    expect(before.closest('.antd-form-schema-crud__query-before')).toBeTruthy();
    expect(card).toBeTruthy();
    expect(
      before.compareDocumentPosition(card!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    const extra = container.querySelector('.ant-card-extra');
    const start = screen.getByTestId('query-start');
    const end = screen.getByTestId('query-end');
    const create = screen.getByRole('button', { name: /新\s*建/ });
    const refresh = screen.getByRole('button', { name: /刷\s*新/ });
    expect(extra).toContainElement(start);
    expect(start.compareDocumentPosition(create) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(refresh.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const body = screen.getByTestId('query-body');
    expect(body.closest('.antd-form-schema-crud__query-body')).toBeTruthy();
    expect(body.compareDocumentPosition(container.querySelector('.ant-table-wrapper')!)
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('uses defaultValues on the first request and in every slot', async () => {
    const api = makeApi();
    render(
      <SchemaCrudList
        schema={schema}
        api={api}
        query={{
          defaultValues: { status: 'open', keywords: undefined },
          slots: {
            headerStart: ({ values }) => (
              <span data-testid="status-slot">{String(values.status)}</span>
            ),
            headerEnd: ({ values }) => (
              <span data-testid="keyword-slot">{String(values.keywords ?? '')}</span>
            ),
          },
        }}
      />
    );

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(screen.getByTestId('status-slot')).toHaveTextContent('open');
    expect(screen.getByTestId('keyword-slot')).toHaveTextContent('');
    await waitFor(() =>
      expect(api.index).toHaveBeenLastCalledWith({
        page: 1,
        size: 10,
        status: 'open',
      })
    );
  });

  it('evaluates lazy defaultValues once and can read searchParams', async () => {
    const api = makeApi();
    const defaults = vi.fn(({ searchParams }: { searchParams: URLSearchParams | null }) => ({
      keywords: searchParams?.get('q') ?? 'fallback',
    }));
    renderInRouter('/posts?q=abc&page=2&size=10', {
      schema,
      api,
      query: {
        defaultValues: defaults,
        slots: {
          headerEnd: ({ values }) => (
            <span data-testid="keyword-slot">{String(values.keywords)}</span>
          ),
        },
      },
    });

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(screen.getByTestId('keyword-slot')).toHaveTextContent('abc');
    await waitFor(() =>
      expect(api.index).toHaveBeenLastCalledWith({
        page: 2,
        size: 10,
        keywords: 'abc',
      })
    );
    expect(defaults).toHaveBeenCalledTimes(1);
  });

  it('merges params over query values and warns once for duplicate keys', async () => {
    const api = makeApi();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <SchemaCrudList
        schema={schema}
        api={api}
        params={{ status: 'locked' }}
        query={{
          defaultValues: { status: 'open' },
          slots: { body: () => <span>query</span> },
        }}
      />
    );

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    await waitFor(() =>
      expect(api.index).toHaveBeenLastCalledWith({
        page: 1,
        size: 10,
        status: 'locked',
      })
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('params 与 query 使用了同名 key：status')
    );
  });

  it('reset restores defaults; resetPage: false keeps the current page', async () => {
    const api = makeApi(30);
    render(
      <SchemaCrudList
        schema={schema}
        api={api}
        query={{
          defaultValues: { status: 'open' },
          slots: {
            headerEnd: ({ values, setValues, reset }) => (
              <>
                <button
                  type="button"
                  data-testid="set-status"
                  onClick={() => setValues({ status: 'done' })}
                >
                  set
                </button>
                <button type="button" data-testid="reset-status" onClick={() => reset()}>
                  reset
                </button>
              </>
            ),
            body: ({ values, setValues }) => (
              <button
                type="button"
                data-testid="set-note"
                onClick={() => setValues({ note: 'x' }, { resetPage: false })}
              >
                {String(values.note ?? '')}
              </button>
            ),
          },
        }}
      />
    );

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));
    await waitFor(() =>
      expect(api.index).toHaveBeenLastCalledWith({ page: 2, size: 10, status: 'open' })
    );

    fireEvent.click(screen.getByTestId('set-note'));
    await waitFor(() =>
      expect(api.index).toHaveBeenLastCalledWith({
        page: 2,
        size: 10,
        status: 'open',
        note: 'x',
      })
    );

    fireEvent.click(await screen.findByTestId('set-status'));
    await waitFor(() =>
      expect(api.index).toHaveBeenLastCalledWith({
        page: 1,
        size: 10,
        status: 'done',
        note: 'x',
      })
    );

    fireEvent.click(screen.getByTestId('reset-status'));
    await waitFor(() =>
      expect(api.index).toHaveBeenLastCalledWith({ page: 1, size: 10, status: 'open' })
    );
  });

  it('reads and writes mapped URL keys with page 1', async () => {
    const api = makeApi();
    renderInRouter('/posts?q=abc&page=2&size=10&tab=mine', {
      schema,
      api,
      query: {
        defaultValues: { keywords: undefined },
        urlKeys: { keywords: 'q' },
        slots: {
          headerEnd: ({ setValues, reset }) => (
            <>
              <button
                type="button"
                data-testid="set-keywords"
                onClick={() => setValues({ keywords: 'xyz' })}
              >
                set
              </button>
              <button
                type="button"
                data-testid="clear-keywords"
                onClick={() => reset({})}
              >
                clear
              </button>
            </>
          ),
        },
      },
    });

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    await waitFor(() =>
      expect(api.index).toHaveBeenLastCalledWith({
        page: 2,
        size: 10,
        keywords: 'abc',
      })
    );

    fireEvent.click(screen.getByTestId('set-keywords'));
    await waitFor(() => {
      const search = new URLSearchParams(screen.getByTestId('search').textContent ?? '');
      expect(search.get('q')).toBe('xyz');
      expect(search.get('page')).toBe('1');
      expect(search.get('size')).toBe('10');
      expect(search.get('tab')).toBe('mine');
    });
    await waitFor(() =>
      expect(api.index).toHaveBeenLastCalledWith({
        page: 1,
        size: 10,
        keywords: 'xyz',
      })
    );

    fireEvent.click(screen.getByTestId('clear-keywords'));
    await waitFor(() => {
      const search = new URLSearchParams(screen.getByTestId('search').textContent ?? '');
      expect(search.get('q')).toBeNull();
      expect(search.get('page')).toBe('1');
      expect(search.get('tab')).toBe('mine');
    });
  });

  it('reads URL query keys from defaultValues key names without urlKeys', async () => {
    const api = makeApi();
    renderInRouter('/posts?keywords=abc&page=1&size=10', {
      schema,
      api,
      query: {
        defaultValues: { keywords: undefined },
        slots: { body: () => <span>body</span> },
      },
    });

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    await waitFor(() =>
      expect(api.index).toHaveBeenLastCalledWith({
        page: 1,
        size: 10,
        keywords: 'abc',
      })
    );
  });

  it('writes initial defaults back to the URL without changing the page', async () => {
    const api = makeApi();
    renderInRouter('/posts?page=2&size=10', {
      schema,
      api,
      query: {
        defaultValues: { status: 'open' },
        slots: { body: () => <span>body</span> },
      },
    });

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    await waitFor(() =>
      expect(api.index).toHaveBeenLastCalledWith({
        page: 2,
        size: 10,
        status: 'open',
      })
    );
    await waitFor(() => {
      const search = new URLSearchParams(screen.getByTestId('search').textContent ?? '');
      expect(search.get('status')).toBe('open');
      expect(search.get('page')).toBe('2');
    });
  });

  it('ignores URL sync when url is false', async () => {
    const api = makeApi();
    renderInRouter('/posts?page=2&size=10', {
      schema,
      api,
      query: {
        url: false,
        defaultValues: { status: 'open' },
        slots: { body: () => <span>body</span> },
      },
    });

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    await waitFor(() =>
      expect(api.index).toHaveBeenLastCalledWith({
        page: 2,
        size: 10,
        status: 'open',
      })
    );
    expect(screen.getByTestId('search')).toHaveTextContent('?page=2&size=10');
  });
});
