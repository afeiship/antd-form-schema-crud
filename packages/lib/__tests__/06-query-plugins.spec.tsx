import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SchemaCrudList } from '../src';
import type { CrudListParams } from '../src';
import { defineQueryPlugin } from '../src/components/query/plugins';

const schema = {
  fields: [
    { key: 'name', label: '姓名', widget: 'input' as const },
    { key: 'status', label: '状态', widget: 'input' as const },
  ],
};

interface TestRecord {
  id: number;
  name: string;
  status: string;
}

interface TestQuery {
  level?: string;
}

const rows: TestRecord[] = [{ id: 1, name: 'Ada', status: 'active' }];
const makeApi = (total = rows.length) => ({
  index: vi.fn(async (_params: CrudListParams) => ({ rows, total })),
});

describe('query plugins', () => {
  it('defines an external plugin and wires it to query state', async () => {
    const api = makeApi();
    const levelPlugin = defineQueryPlugin<
      TestQuery,
      { queryKey: string }
    >({
      name: 'level',
      create: ({ queryKey }) => (context) => (
        <button
          type="button"
          data-testid="external-plugin"
          onClick={() =>
            context.setValues({ [queryKey]: 'high' } as Partial<TestQuery>)
          }
        >
          {String(context.values[queryKey] ?? '')}
        </button>
      ),
    });

    render(
      <SchemaCrudList<TestRecord, TestQuery>
        schema={schema}
        api={api}
        query={{
          defaultValues: { level: 'low' },
          slots: { headerEnd: levelPlugin({ queryKey: 'level' }) },
        }}
      />
    );

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(screen.getByTestId('external-plugin')).toHaveTextContent('low');
    await waitFor(() =>
      expect(api.index).toHaveBeenLastCalledWith({
        page: 1,
        size: 10,
        level: 'low',
      })
    );

    fireEvent.click(screen.getByTestId('external-plugin'));
    await waitFor(() =>
      expect(api.index).toHaveBeenLastCalledWith({
        page: 1,
        size: 10,
        level: 'high',
      })
    );
  });

  it('requires a name and a create function', () => {
    expect(() =>
      defineQueryPlugin({
        name: '',
        create: () => () => null,
      })
    ).toThrow('name is required');

    expect(() =>
      defineQueryPlugin({
        name: 'broken',
        create: undefined as never,
      })
    ).toThrow('requires a create function');
  });
});
