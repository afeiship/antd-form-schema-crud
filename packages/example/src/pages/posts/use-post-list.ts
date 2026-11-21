import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '@jswork/antd-form-schema-crud';
import { postsApi } from '../../api/posts';
import type { PostRecord } from '../../api/posts';

export function usePostList() {
  const [records, setRecords] = useState<PostRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    const data = await postsApi.posts_index({ page: 1, size: 20 });
    setRecords(data.rows);
    setTotal(data.total);
    return data.rows;
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      return await loadList();
    } catch (error) {
      setListError(errorMessage(error, '文章列表加载失败。'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadList]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  return {
    records,
    total,
    loading,
    listError,
    loadList,
    loadInitial,
  };
}
