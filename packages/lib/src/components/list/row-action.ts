import type {
  CrudBuiltinRowAction,
  CrudRecord,
  CrudRowAction,
  CrudRowActionItem,
} from '../../types';

/** An action resolved against one record, ready to render. */
export interface ResolvedRowAction<TRecord extends CrudRecord = CrudRecord> {
  action: CrudRowAction<TRecord>;
  index: number;
  /** Present when the item renders as a link. */
  href?: string;
}

/** Built-in references are recognized by the `builtin` field. */
export function isBuiltinRowAction<TRecord extends CrudRecord = CrudRecord>(
  item: CrudRowActionItem<TRecord>
): item is CrudBuiltinRowAction<TRecord> {
  return Boolean(item) && typeof item === 'object' && 'builtin' in item;
}

/**
 * Resolves `hidden` and `href` for one record. Returns `null` when the item
 * should not render at all.
 */
export function resolveRowAction<TRecord extends CrudRecord = CrudRecord>(
  action: CrudRowAction<TRecord>,
  record: TRecord,
  index: number
): ResolvedRowAction<TRecord> | null {
  const hidden = typeof action.hidden === 'function' ? action.hidden(record) : action.hidden;
  if (hidden) return null;

  if (typeof action.href === 'function') {
    const href = action.href(record);
    return href ? { action, index, href } : null;
  }

  if (action.href === undefined) return { action, index };
  return action.href ? { action, index, href: action.href } : null;
}
