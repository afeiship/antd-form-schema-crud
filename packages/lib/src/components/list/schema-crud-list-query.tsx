import type { ReactNode } from 'react';
import type {
  CrudListQueryConfig,
  CrudListQueryContext,
} from '../../types';
import { CrudQuerySlot } from '../query/query-slots';

export interface CrudListQueryNodes {
  before: ReactNode;
  headerStart: ReactNode;
  headerEnd: ReactNode;
  body: ReactNode;
}

/** Resolve all query slots with the same context before the Card is composed. */
export function resolveCrudListQueryNodes<TValues extends Record<string, any>>(
  query: CrudListQueryConfig<TValues> | undefined,
  context: CrudListQueryContext<TValues>
): CrudListQueryNodes {
  const slots = query?.slots;
  return {
    before: slots?.before ? (
      <CrudQuerySlot slot={slots.before} context={context} />
    ) : null,
    headerStart: slots?.headerStart ? (
      <CrudQuerySlot slot={slots.headerStart} context={context} />
    ) : null,
    headerEnd: slots?.headerEnd ? (
      <CrudQuerySlot slot={slots.headerEnd} context={context} />
    ) : null,
    body: slots?.body ? <CrudQuerySlot slot={slots.body} context={context} /> : null,
  };
}
