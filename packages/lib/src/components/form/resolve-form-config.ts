import { getSchemaCrudFormDefaults } from '../../defaults';
import type { CrudActions, CrudFormProps, SchemaCrudFormProps } from '../../types';

interface ResolvedFormConfig {
  actions?: CrudActions;
  formProps: CrudFormProps;
  confirmDelete: boolean;
  title: SchemaCrudFormProps['title'];
}

/** Merges project defaults with the props for this card instance. */
export function resolveFormConfig(
  props: Pick<SchemaCrudFormProps, 'actions' | 'formProps' | 'confirmDelete' | 'title'>
): ResolvedFormConfig {
  const defaults = getSchemaCrudFormDefaults();
  const actions =
    defaults.actions && props.actions
      ? { ...defaults.actions, ...props.actions }
      : (props.actions ?? defaults.actions);

  return {
    actions,
    formProps: { ...defaults.formProps, ...props.formProps },
    confirmDelete: props.confirmDelete ?? defaults.confirmDelete ?? true,
    title: props.title === undefined ? defaults.title : props.title,
  };
}
