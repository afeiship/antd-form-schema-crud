import { describe, expect, it } from 'vitest';
import type { CrudRowAction } from '../src/types';
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
