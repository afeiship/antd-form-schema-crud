import { Card } from 'antd';
import cx from 'classnames';
import { CLASS_NAME } from '../../constants';
import { getSchemaCrudCardSize } from '../../defaults';
import type { CrudRecord, SchemaCrudFormProps } from '../../types';
import { useRegisterCrudFormActions } from '../../actions/use-crud-action-registration';
import { SchemaCardExtra, SchemaCardTitle } from '../schema-card-header';
import { SchemaFooter } from '../schema-footer';
import { SchemaFormBody } from './schema-form-body';
import { useSchemaCrudFormState } from './use-schema-crud-form-state';

function SchemaCrudFormRender<TRecord extends CrudRecord = CrudRecord>(
  props: SchemaCrudFormProps<TRecord>
) {
  const state = useSchemaCrudFormState(props);
  const { extra, className, actionScope, resource } = props;

  useRegisterCrudFormActions(actionScope ?? resource, {
    submit: () => {
      if (!state.canSave) return;
      state.submit();
    },
    reload: () => {
      if (
        state.mode === 'create' ||
        state.blocked ||
        state.loading ||
        state.submitLoading ||
        state.deleteLoading
      ) {
        return;
      }
      state.reload();
    },
    edit: () => {
      if (
        state.mode !== 'view' ||
        state.resolvedActions?.edit === false ||
        state.record === undefined ||
        state.record === null
      ) {
        return;
      }
      state.handleEdit();
    },
    cancel: () => {
      if (!state.canCancel) return;
      state.handleCancel();
    },
    remove: () => {
      if (
        state.mode === 'create' ||
        !state.resolvedApi.destroy ||
        !state.available ||
        state.resolvedActions?.delete === false ||
        state.submitLoading ||
        state.deleteLoading
      ) {
        return Promise.resolve();
      }
      return state.handleDelete();
    },
  });
  const cardSize = getSchemaCrudCardSize();
  const subject = state.resolvedTitle === false ? null : (state.resolvedTitle ?? '记录');

  const titleNode = subject ? (
    <SchemaCardTitle
      mode={state.mode}
      subject={subject}
      dirty={state.dirty}
      showBack={state.showTitleBack}
      onBack={state.handleCancel}
    />
  ) : undefined;

  return (
    <Card
      data-component={CLASS_NAME}
      size={cardSize}
      className={cx(CLASS_NAME, className)}
      title={titleNode}
      extra={extra ? <SchemaCardExtra extra={extra} /> : undefined}
      loading={state.loading}
      aria-busy={state.loading || undefined}
    >
      <SchemaFormBody
        blocked={state.blocked}
        requirementMessage={state.requirement.message}
        loadError={state.loadError}
        reload={state.reload}
        showForm={state.showForm}
        actionError={state.actionError}
        schema={state.resolvedSchema}
        restFormProps={state.restFormProps}
        layout={state.layout}
        labelCol={state.labelCol}
        wrapperCol={state.wrapperCol}
        formKey={state.formKey}
        onFinish={state.handleFinish}
        onFormReady={state.handleFormReady}
        onValuesChange={state.handleValuesChange}
        clearActionError={state.clearActionError}
      />
      <footer className={`${CLASS_NAME}__footer`}>
        <SchemaFooter
          mode={state.mode}
          actions={state.resolvedActions}
          hasDestroy={Boolean(state.resolvedApi.destroy)}
          submitLoading={state.submitLoading}
          deleteLoading={state.deleteLoading}
          canSave={state.canSave}
          available={state.available}
          canCancel={state.canCancel}
          confirmDelete={state.resolvedConfirmDelete}
          onCancel={state.handleCancel}
          onEdit={state.handleEdit}
          onDelete={state.handleDelete}
          onSubmit={state.submit}
        />
      </footer>
    </Card>
  );
}

export { SchemaCrudFormRender };
