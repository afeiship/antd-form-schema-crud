import type { CrudApi, CrudId, CrudMode } from '../types';

export interface ApiRequirement {
  /** Missing requirement keys, for message assembly. */
  missing: string[];
  /** Human readable message; empty when the mode is satisfiable. */
  message: string;
}

/**
 * Checks what the current mode still needs before a request may fire.
 * `create` needs create; `edit` needs id + show + update; `view` needs id + show.
 */
export function checkRequirement(
  mode: CrudMode,
  api: CrudApi,
  resource: string | undefined,
  id: CrudId | undefined
): ApiRequirement {
  const missing: string[] = [];
  const hasSource = Boolean(resource) || Object.values(api).some(Boolean);
  const hasId = id !== undefined && id !== null && id !== '';

  if (!hasSource) {
    return { missing: ['api'], message: '缺少 resource 或 api，无法定位资源接口。' };
  }

  if (mode === 'create') {
    if (!api.create) missing.push('create');
  } else {
    if (!hasId) missing.push('id');
    if (!api.show) missing.push('show');
    if (mode === 'edit' && !api.update) missing.push('update');
  }

  if (missing.length === 0) return { missing, message: '' };

  const map: Record<string, string> = {
    id: '缺少 id，无法加载记录。',
    show: `缺少 ${resource ? `${resource}_show` : 'show'} 接口。`,
    create: `缺少 ${resource ? `${resource}_create` : 'create'} 接口。`,
    update: `缺少 ${resource ? `${resource}_update` : 'update'} 接口。`,
  };

  return { missing, message: map[missing[0]] };
}
