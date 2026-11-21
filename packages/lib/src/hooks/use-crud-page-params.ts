import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface CrudPageParamsOptions {
  /** Page used when the URL has no valid page value. */
  defaultPage?: number;
  /** Page size used when the URL has no valid size value. */
  defaultPageSize?: number;
  /** URL query key for the page. */
  pageKey?: string;
  /** URL query key for the page size. */
  sizeKey?: string;
  /**
   * Keep page / size in the URL even when they equal the defaults.
   * Defaults to true so the current pagination is always shareable.
   */
  keepDefaultParams?: boolean;
  /** Called after the URL has been updated. */
  onPageChange?: (page: number, pageSize: number) => void;
}

function readPositive(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Reads page / size from the router query and writes them back on change. */
export function useCrudPageParams(options: CrudPageParamsOptions = {}) {
  const {
    defaultPage = 1,
    defaultPageSize = 10,
    pageKey = 'page',
    sizeKey = 'size',
    keepDefaultParams = true,
    onPageChange,
  } = options;
  const [searchParams, setSearchParams] = useSearchParams();
  const page = readPositive(searchParams.get(pageKey), defaultPage);
  const pageSize = readPositive(searchParams.get(sizeKey), defaultPageSize);

  const handlePageChange = useCallback(
    (nextPage: number, nextPageSize: number) => {
      const next = new URLSearchParams(searchParams);
      if (keepDefaultParams) {
        next.set(pageKey, String(nextPage));
        next.set(sizeKey, String(nextPageSize));
      } else {
        if (nextPage <= defaultPage) next.delete(pageKey);
        else next.set(pageKey, String(nextPage));

        if (nextPageSize === defaultPageSize) next.delete(sizeKey);
        else next.set(sizeKey, String(nextPageSize));
      }
      setSearchParams(next, { replace: true });
      onPageChange?.(nextPage, nextPageSize);
    },
    [
      searchParams,
      setSearchParams,
      pageKey,
      sizeKey,
      keepDefaultParams,
      defaultPage,
      defaultPageSize,
      onPageChange,
    ]
  );

  return { page, pageSize, onPageChange: handlePageChange };
}
