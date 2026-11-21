import { Alert, Button } from 'antd';
import { errorMessage } from '../../api';
import { CLASS_NAME } from '../../constants';
import { alertTitleProps } from '../../utils/antd';

interface SchemaListStateAlertProps {
  blocked: boolean;
  requirementMessage?: string;
  loadError: unknown;
  reload: () => void;
}

/** Requirement or load failure; either one replaces the table. */
export function SchemaListStateAlert({
  blocked,
  requirementMessage,
  loadError,
  reload,
}: SchemaListStateAlertProps) {
  if (blocked) {
    return <Alert type="error" showIcon {...alertTitleProps(requirementMessage)} />;
  }
  if (!loadError) return null;

  return (
    <Alert
      type="error"
      showIcon
      {...alertTitleProps('列表加载失败')}
      description={errorMessage(loadError, '列表加载失败，请稍后重试。')}
      action={
        <Button size="small" onClick={reload}>
          重试
        </Button>
      }
    />
  );
}

interface SchemaListActionAlertProps {
  error: { action: string; message: string } | null;
  onClose: () => void;
}

/** Non-blocking row action error above the table. */
export function SchemaListActionAlert({ error, onClose }: SchemaListActionAlertProps) {
  if (!error) return null;

  return (
    <Alert
      className={`${CLASS_NAME}__alert`}
      type="error"
      showIcon
      closable
      {...alertTitleProps(error.message)}
      onClose={onClose}
    />
  );
}
