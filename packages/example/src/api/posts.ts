import type { CrudId, CrudValues } from '@jswork/antd-form-schema-crud';

export interface PostRecord {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  status: 'draft' | 'waiting' | 'published';
  is_sticky: boolean;
  content?: string;
  category_ids?: number[];
  tags?: string[];
}

export interface PostList {
  rows: PostRecord[];
  total: number;
}

interface ApiEnvelope<T> {
  success?: boolean;
  code?: number;
  message?: string;
  data?: T;
  ok?: { code?: number };
  error?: { message?: string };
}

/** Mirrors jsw-admin/src/shared/services/schema.ts for the posts resource. */
export const postsSchema = {
  baseURL: import.meta.env.VITE_API_URL ?? '',
  request: ['/api', 'json'] as const,
  resources: ['posts'] as const,
};

const API_PREFIX = postsSchema.request[0];
const RESOURCE = postsSchema.resources[0];
const TOKEN = import.meta.env.VITE_API_TOKEN ?? '';
const resourceUrl = (path = '') => `${postsSchema.baseURL}${API_PREFIX}/${RESOURCE}${path}`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...init?.headers,
    },
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  const ok =
    response.ok &&
    payload !== null &&
    payload.success !== false &&
    !(payload.ok?.code !== undefined && payload.ok.code >= 400);

  if (!ok) {
    throw new Error(
      payload?.message || payload?.error?.message || `请求失败（HTTP ${response.status}）`
    );
  }

  return payload?.data as T;
}

/**
 * 按宿主项目的 nx.$api 约定注册资源方法：
 * `${resource}_${action}`，参数与 SchemaCrud 的 CrudApi 一致。
 */
export const postsApi = {
  posts_index: (params: { page?: number; size?: number } = {}) =>
    request<PostList>(`${resourceUrl()}?page=${params.page ?? 1}&size=${params.size ?? 20}`),

  posts_show: ({ id }: { id: CrudId }) => request<PostRecord>(resourceUrl(`/${id}`)),

  posts_create: (values: CrudValues) =>
    request<PostRecord>(resourceUrl(), {
      method: 'POST',
      body: JSON.stringify({ post: values }),
    }),

  posts_update: ({ id, ...values }: CrudValues & { id: CrudId }) =>
    request<PostRecord>(resourceUrl(`/${id}`), {
      method: 'PUT',
      body: JSON.stringify({ post: values }),
    }),

  posts_destroy: ({ id }: { id: CrudId }) =>
    request<unknown>(resourceUrl(`/${id}`), { method: 'DELETE' }),
};

(globalThis as unknown as { nx: { $api: typeof postsApi } }).nx = { $api: postsApi };
