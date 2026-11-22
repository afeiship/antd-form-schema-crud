export { defineQueryPlugin } from './define';
export { keywords } from './keywords';

import { keywords } from './keywords';

/** Built-in query plugins. */
export const queryPlugins = { keywords };

export type {
  CrudQueryPlugin,
  CrudQueryPluginDefinition,
  CrudQueryKeywordsPluginConfig,
  CrudQueryStatusOption,
  CrudQueryStatusPluginConfig,
  CrudQueryPlugins,
} from './types';
