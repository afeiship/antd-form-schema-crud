export { SchemaCrud } from './schema-crud';
export { resolveApi, checkRequirement, errorMessage, getNxApi } from './resolve-api';
export type {
  CrudMode,
  CrudId,
  CrudAction,
  CrudRecord,
  CrudValues,
  CrudApi,
  CrudActionConfig,
  CrudActions,
  CrudFormProps,
  SchemaCrudProps,
} from './types';

import { SchemaCrud } from './schema-crud';

/** Backward-compatible alias; the previous default export name. */
export const AntdFormSchemaCrud = SchemaCrud;

export default SchemaCrud;
