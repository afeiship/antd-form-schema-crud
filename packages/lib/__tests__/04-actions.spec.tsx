import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { FormSchema } from '@jswork/antd-form-schema';
import {
  SchemaCrudForm,
  SchemaCrudList,
  useCrudFormActions,
  useCrudListActions,
} from '../src';
import type { CrudListParams } from '../src';

type Row = { id: number; name: string; status: string };

const rows: Row[] = [
  { id: 1, name: 'Ada', status: 'active' },
  { id: 2, name: 'Grace', status: 'disabled' },
];

const schema: FormSchema = {
  initialValues: { status: 'active' },
  fields: [
    { key: 'name', label: '姓名', widget: 'input', required: true },
    { key: 'status', label: '状态', widget: 'select', options: ['active', 'disabled'] },
  ],
};

const makeListApi = () => ({
  index: vi.fn(async (_params: CrudListParams) => ({ rows, total: rows.length })),
  destroy: vi.fn(async () => ({ ok: true })),
});

afterEach(() => {
  vi.restoreAllMocks();
});

const makeFormApi = () => ({
  show: vi.fn(async ({ id }: { id: number | string }) => ({
    id: Number(id),
    name: 'Ada',
    status: 'active',
  })),
  create: vi.fn(async (_values: Record<string, any>) => ({ id: 42 })),
  update: vi.fn(async (_values: Record<string, any>) => ({ id: 42 })),
  destroy: vi.fn(async () => ({ ok: true })),
});

function ListProbe({ scope }: { scope: string }) {
  const actions = useCrudListActions<Row>(scope);
  return (
    <>
      <output data-testid="list-ready">{String(actions.ready)}</output>
      <button onClick={() => actions.reload()}>hook reload</button>
      <button onClick={() => actions.create()}>hook create</button>
      <button onClick={() => actions.edit(rows[0])}>hook edit</button>
      <button onClick={() => void actions.remove(rows[0])}>hook remove</button>
    </>
  );
}

function FormProbe({ scope }: { scope: string }) {
  const actions = useCrudFormActions(scope);
  return (
    <>
      <output data-testid="form-ready">{String(actions.ready)}</output>
      <button onClick={() => actions.submit()}>hook submit</button>
      <button onClick={() => actions.reload()}>hook form reload</button>
      <button onClick={() => actions.edit()}>hook form edit</button>
      <button onClick={() => actions.cancel()}>hook cancel</button>
      <button onClick={() => void actions.remove()}>hook form remove</button>
    </>
  );
}

describe('useCrudListActions', () => {
  it('stays a stable no-op API when no instance is mounted', () => {
    render(<ListProbe scope="missing-list" />);

    expect(screen.getByTestId('list-ready')).toHaveTextContent('false');
    expect(() => fireEvent.click(screen.getByText('hook reload'))).not.toThrow();
    expect(() => fireEvent.click(screen.getByText('hook remove'))).not.toThrow();
  });

  it('registers by resource and exposes reload, create, edit and remove', async () => {
    const api = makeListApi();
    const onCreate = vi.fn();
    const onEdit = vi.fn();
    const onSuccess = vi.fn();
    render(
      <>
        <ListProbe scope="posts" />
        <SchemaCrudList
          resource="posts"
          api={api}
          schema={schema}
          page={1}
          actions={{}}
          onCreate={onCreate}
          onEdit={onEdit}
          onSuccess={onSuccess}
        />
      </>
    );

    await waitFor(() => expect(screen.getByTestId('list-ready')).toHaveTextContent('true'));
    await screen.findByText('Ada');

    fireEvent.click(screen.getByText('hook reload'));
    await waitFor(() => expect(api.index).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByText('hook create'));
    expect(onCreate).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('hook edit'));
    expect(onEdit).toHaveBeenCalledWith(rows[0]);

    fireEvent.click(screen.getByText('hook remove'));
    await waitFor(() => expect(api.destroy).toHaveBeenCalledWith({ id: 1 }));
    expect(onSuccess).toHaveBeenCalledWith({ action: 'delete', result: { ok: true } });
  });

  it('honours action flags and unregisters on unmount', async () => {
    const api = makeListApi();
    const onCreate = vi.fn();
    const onEdit = vi.fn();
    const onSuccess = vi.fn();
    render(<ListProbe scope="guarded-list" />);
    const list = render(
      <SchemaCrudList
        api={api}
        schema={schema}
        page={1}
        actionScope="guarded-list"
        actions={{ create: false, edit: false, delete: false }}
        onCreate={onCreate}
        onEdit={onEdit}
        onSuccess={onSuccess}
      />
    );

    await waitFor(() => expect(screen.getByTestId('list-ready')).toHaveTextContent('true'));
    await screen.findByText('Ada');

    fireEvent.click(screen.getByText('hook create'));
    fireEvent.click(screen.getByText('hook edit'));
    fireEvent.click(screen.getByText('hook remove'));
    await waitFor(() => expect(api.destroy).not.toHaveBeenCalled());
    expect(onCreate).not.toHaveBeenCalled();
    expect(onEdit).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();

    list.unmount();
    await waitFor(() => expect(screen.getByTestId('list-ready')).toHaveTextContent('false'));
    expect(() => fireEvent.click(screen.getByText('hook create'))).not.toThrow();
  });

  it('keeps the first instance when a list scope is duplicated', async () => {
    const api = makeListApi();
    const firstCreate = vi.fn();
    const secondCreate = vi.fn();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <>
        <ListProbe scope="duplicate-list" />
        <SchemaCrudList
          api={api}
          schema={schema}
          page={1}
          actionScope="duplicate-list"
          onCreate={firstCreate}
        />
        <SchemaCrudList
          api={api}
          schema={schema}
          page={1}
          actionScope="duplicate-list"
          onCreate={secondCreate}
        />
      </>
    );

    await waitFor(() => expect(screen.getByTestId('list-ready')).toHaveTextContent('true'));
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Duplicate list action scope'));

    fireEvent.click(screen.getByText('hook create'));
    expect(firstCreate).toHaveBeenCalledTimes(1);
    expect(secondCreate).not.toHaveBeenCalled();
  });
});

describe('useCrudFormActions', () => {
  it('registers by resource and submits the dirty form', async () => {
    const api = makeFormApi();
    render(
      <>
        <FormProbe scope="post-form" />
        <SchemaCrudForm
          resource="post-form"
          api={api}
          schema={schema}
          id={7}
          mode="form"
          onBack={vi.fn()}
        />
      </>
    );

    await waitFor(() => expect(screen.getByTestId('form-ready')).toHaveTextContent('true'));
    expect(await screen.findByLabelText('姓名')).toHaveValue('Ada');

    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: 'Ada Lovelace' } });
    await waitFor(() => expect(screen.getByLabelText('姓名')).toHaveValue('Ada Lovelace'));

    fireEvent.click(screen.getByText('hook submit'));
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 7, name: 'Ada Lovelace' })
      )
    );
  });

  it('does not submit a clean form and enters edit through the hook', async () => {
    const api = makeFormApi();
    render(
      <>
        <FormProbe scope="clean-form" />
        <SchemaCrudForm api={api} schema={schema} id={7} actionScope="clean-form" />
      </>
    );

    await waitFor(() => expect(screen.getByTestId('form-ready')).toHaveTextContent('true'));
    await screen.findByText('Ada');

    fireEvent.click(screen.getByText('hook submit'));
    await waitFor(() => expect(api.update).not.toHaveBeenCalled());

    fireEvent.click(screen.getByText('hook form edit'));
    expect(await screen.findByLabelText('姓名')).toBeInTheDocument();
    expect(screen.getByLabelText('姓名')).toHaveValue('Ada');
  });

  it('reloads and cancels through the form hook', async () => {
    const api = makeFormApi();
    render(
      <>
        <FormProbe scope="reload-form" />
        <SchemaCrudForm api={api} schema={schema} id={7} actionScope="reload-form" />
      </>
    );

    await waitFor(() => expect(screen.getByTestId('form-ready')).toHaveTextContent('true'));
    await screen.findByText('Ada');

    fireEvent.click(screen.getByText('hook form reload'));
    await waitFor(() => expect(api.show).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByText('hook form edit'));
    expect(await screen.findByLabelText('姓名')).toBeInTheDocument();

    fireEvent.click(screen.getByText('hook cancel'));
    await waitFor(() => expect(screen.queryByLabelText('姓名')).not.toBeInTheDocument());
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('removes through the form and calls onBack in form mode', async () => {
    const api = makeFormApi();
    const onBack = vi.fn();
    const onSuccess = vi.fn();
    render(
      <>
        <FormProbe scope="remove-form" />
        <SchemaCrudForm
          api={api}
          schema={schema}
          id={7}
          mode="form"
          actionScope="remove-form"
          onBack={onBack}
          onSuccess={onSuccess}
        />
      </>
    );

    await waitFor(() => expect(screen.getByTestId('form-ready')).toHaveTextContent('true'));
    await screen.findByLabelText('姓名');

    fireEvent.click(screen.getByText('hook form remove'));
    await waitFor(() => expect(api.destroy).toHaveBeenCalledWith({ id: 7 }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith({ action: 'delete', result: { ok: true } });
  });
});
