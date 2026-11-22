import type { ReactNode } from 'react';
import type {
  CrudListQueryContext,
  CrudListQuerySlot,
} from '../../types';

interface CrudQuerySlotProps<TValues extends Record<string, any>> {
  slot?: CrudListQuerySlot<TValues>;
  context: CrudListQueryContext<TValues>;
}

/** Renders one named query slot; an empty slot produces no DOM. */
export function CrudQuerySlot<TValues extends Record<string, any>>({
  slot,
  context,
}: CrudQuerySlotProps<TValues>): ReactNode {
  if (!slot) return null;
  try {
    return slot(context) ?? null;
  } catch (error) {
    console.error('[SchemaCrudList] query slot 渲染失败。', error);
    return null;
  }
}
