import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { SchemaCrudList } from '../src';
import type { CrudListParams } from '../src';

const schema = { fields: [{ key: 'name', label: '姓名', widget: 'input' as const }] };

const makeApi = () => ({
  index: vi.fn(async ({ page }: CrudListParams) => ({
    rows: [{ id: page, name: `Page${page}` }],
    total: 100,
  })),
});

function SearchProbe() {
  const location = useLocation();
  return (
    <>
      <output data-testid="pathname">{location.pathname}</output>
      <output data-testid="search">{location.search}</output>
    </>
  );
}

const renderList = (entry: string, api: ReturnType<typeof makeApi>, keepDefaultParams?: boolean) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <SchemaCrudList schema={schema} api={api} keepDefaultParams={keepDefaultParams} />
      <SearchProbe />
    </MemoryRouter>
  );

describe('SchemaCrudList router pagination', () => {
  it('reads page and size from the URL', async () => {
    const api = makeApi();
    renderList('/posts?page=3&size=20', api);
    await waitFor(() => expect(api.index).toHaveBeenCalledWith({ page: 3, size: 20 }));
  });

  it('writes the new page to the URL and keeps other query params', async () => {
    const api = makeApi();
    renderList('/posts?page=3&size=20&tab=mine', api);
    expect(await screen.findByText('Page3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Page 4' }));
    await waitFor(() => expect(api.index).toHaveBeenLastCalledWith({ page: 4, size: 20 }));
    const search = new URLSearchParams(screen.getByTestId('search').textContent ?? '');
    expect(search.get('tab')).toBe('mine');
    expect(search.get('page')).toBe('4');
    expect(search.get('size')).toBe('20');
  });

  it('keeps default params in the URL by default', async () => {
    const api = makeApi();
    renderList('/posts', api);
    expect(await screen.findByText('Page1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));
    await waitFor(() => expect(api.index).toHaveBeenLastCalledWith({ page: 2, size: 10 }));
    expect(screen.getByTestId('search')).toHaveTextContent('?page=2&size=10');
  });

  it('can omit default page and size from the URL', async () => {
    const api = makeApi();
    renderList('/posts?page=3&size=10', api, false);
    expect(await screen.findByText('Page3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Page 1' }));
    await waitFor(() => expect(screen.getByTestId('search').textContent).toBe(''));
  });

  it('navigates to the default create route with the current pagination', async () => {
    const api = makeApi();
    renderList('/admin/albums?page=3&size=10', api);
    expect(await screen.findByText('Page3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /新\s*建/ }));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/admin/albums/add');
    const search = new URLSearchParams(screen.getByTestId('search').textContent ?? '');
    expect(search.get('page')).toBe('3');
    expect(search.get('size')).toBe('10');
  });

  it('navigates to the default edit route with the row id and pagination', async () => {
    const api = makeApi();
    renderList('/admin/albums?page=3&size=10', api);
    expect(await screen.findByText('Page3')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /编\s*辑/ })[0]);
    expect(screen.getByTestId('pathname')).toHaveTextContent('/admin/albums/3/edit');
    const search = new URLSearchParams(screen.getByTestId('search').textContent ?? '');
    expect(search.get('page')).toBe('3');
    expect(search.get('size')).toBe('10');
  });

  it('lets business handlers override the default navigation', async () => {
    const api = makeApi();
    const onCreate = vi.fn();
    const onEdit = vi.fn();
    render(
      <MemoryRouter initialEntries={['/admin/albums?page=2']}>
        <SchemaCrudList schema={schema} api={api} onCreate={onCreate} onEdit={onEdit} />
        <SearchProbe />
      </MemoryRouter>
    );
    expect(await screen.findByText('Page2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /新\s*建/ }));
    fireEvent.click(screen.getAllByRole('button', { name: /编\s*辑/ })[0]);
    expect(onCreate).toHaveBeenCalled();
    expect(onEdit).toHaveBeenCalledWith({ id: 2, name: 'Page2' });
    expect(screen.getByTestId('pathname')).toHaveTextContent('/admin/albums');
  });

  it('does not touch the URL when page is controlled', async () => {
    const api = makeApi();
    render(
      <MemoryRouter initialEntries={['/posts?page=3&size=20']}>
        <SchemaCrudList schema={schema} api={api} page={1} />
        <SearchProbe />
      </MemoryRouter>
    );
    expect(await screen.findByText('Page1')).toBeInTheDocument();
    expect(screen.getByTestId('search')).toHaveTextContent('?page=3&size=20');
  });
});
