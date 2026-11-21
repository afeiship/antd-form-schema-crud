import { SchemaCrudFormRender } from './form/schema-crud-form-render';

export const SchemaCrudForm = Object.assign(SchemaCrudFormRender, {
  displayName: 'SchemaCrudForm',
  version: __VERSION__,
});

/** Alias kept for the existing package import style. */
export const AntdFormSchemaCrudForm = SchemaCrudForm;

export default SchemaCrudForm;
