import { Alert, Button } from 'antd';
import type { FormInstance } from 'antd';
import { SchemaForm } from '@jswork/antd-form-schema';
import type { FormSchema } from '@jswork/antd-form-schema';
import { errorMessage } from '../../api';
import { CLASS_NAME } from '../../constants';
import type { CrudFormProps, CrudValues } from '../../types';
import { alertTitleProps } from '../../utils/antd';

interface SchemaFormBodyProps {
  blocked: boolean;
  requirementMessage?: string;
  loadError: unknown;
  reload: () => void;
  showForm: boolean;
  actionError: { action: string; message: string } | null;
  schema: FormSchema;
  restFormProps: CrudFormProps;
  layout: CrudFormProps['layout'];
  labelCol: CrudFormProps['labelCol'];
  wrapperCol: CrudFormProps['wrapperCol'];
  formKey: string;
  onFinish: (values: CrudValues) => Promise<void> | void;
  onFormReady: (form: FormInstance) => void;
  onValuesChange: CrudFormProps['onValuesChange'];
  clearActionError: () => void;
}

/** Blocking alerts, the schema form itself, and the non-blocking action error. */
export function SchemaFormBody({
  blocked,
  requirementMessage,
  loadError,
  reload,
  showForm,
  actionError,
  schema,
  restFormProps,
  layout,
  labelCol,
  wrapperCol,
  formKey,
  onFinish,
  onFormReady,
  onValuesChange,
  clearActionError,
}: SchemaFormBodyProps) {
  return (
    <div className={`${CLASS_NAME}__body`}>
      {blocked ? (
        <Alert type="error" showIcon {...alertTitleProps(requirementMessage)} />
      ) : loadError ? (
        <Alert
          type="error"
          showIcon
          {...alertTitleProps('加载失败')}
          description={errorMessage(loadError, '记录加载失败，请稍后重试。')}
          action={
            <Button size="small" onClick={reload}>
              重试
            </Button>
          }
        />
      ) : showForm ? (
        <SchemaForm
          {...restFormProps}
          layout={layout}
          labelCol={labelCol}
          wrapperCol={wrapperCol}
          key={formKey}
          meta={schema}
          onFinish={onFinish}
          onFormReady={onFormReady}
          onValuesChange={onValuesChange}
        />
      ) : null}

      {actionError ? (
        <Alert
          className={`${CLASS_NAME}__alert`}
          type="error"
          showIcon
          closable
          {...alertTitleProps(actionError.message)}
          onClose={clearActionError}
        />
      ) : null}
    </div>
  );
}
