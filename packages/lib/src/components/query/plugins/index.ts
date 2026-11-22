import { keywords } from './keywords';
import { status } from './status';
import type { CrudQueryPlugins } from './types';

export { defineQueryPlugin } from './define';
export { keywords } from './keywords';
export { status } from './status';

/** Built-in query plugins. */
export const queryPlugins: CrudQueryPlugins = { keywords, status };

export type {
  CrudQueryPlugin,
  CrudQueryPluginDefinition,
  CrudQueryKeywordsPluginConfig,
  CrudQueryStatusOption,
  CrudQueryStatusPluginConfig,
  CrudQueryPlugins,
} from './types';
