import { Button, Popconfirm, Tooltip } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { CrudRecord, CrudRowAction, CrudRowActionHandlerContext } from '../../types';

interface SchemaRowActionItemProps<TRecord extends CrudRecord = CrudRecord> {
  action: CrudRowAction<TRecord>;
  record: TRecord;
  index: number;
  /** Resolved external href, computed by the column builder. */
  href?: string;
  /** Forced loading state, used by the built-in delete action. */
  loading?: boolean;
  reload: () => void;
}

const warnedKeys = new Set<string>();

function warnOnce(key: string, message: string) {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(message);
}

function isPromise(value: unknown): value is Promise<unknown> {
  return Boolean(value) && typeof (value as Promise<unknown>).then === 'function';
}

function withTooltip(node: ReactNode, tooltip: ReactNode, disabled: boolean): ReactNode {
  if (!tooltip) return node;
  if (!disabled) return <Tooltip title={tooltip}>{node as any}</Tooltip>;
  return (
    <Tooltip title={tooltip}>
      <span style={{ display: 'inline-block' }}>{node as any}</span>
    </Tooltip>
  );
}

/** Renders one business row action: custom node, link, or button with optional confirm. */
export function SchemaRowActionItem<TRecord extends CrudRecord = CrudRecord>({
  action,
  record,
  index,
  href,
  loading,
  reload,
}: SchemaRowActionItemProps<TRecord>) {
  const [pending, setPending] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(() => {
    if (!action.onClick || pending) return;
    const context: CrudRowActionHandlerContext = { index, reload };
    try {
      const result = action.onClick(record, context);
      if (!isPromise(result)) return result;
      setPending(true);
      return result
        .catch((error) => {
          console.error(`[SchemaCrudList] row action "${action.key}" failed.`, error);
        })
        .finally(() => {
          if (mountedRef.current) setPending(false);
        });
    } catch (error) {
      console.error(`[SchemaCrudList] row action "${action.key}" failed.`, error);
      return undefined;
    }
  }, [action, index, pending, record, reload]);

  const disabled =
    typeof action.disabled === 'function' ? action.disabled(record) : Boolean(action.disabled);
  const busy = pending || Boolean(loading);

  if (action.render) {
    return <>{action.render({ record, index, loading: busy, reload, run })}</>;
  }

  const hasHandler = Boolean(href) || Boolean(action.onClick);
  if (!hasHandler && !action.text) {
    warnOnce(
      `empty:${action.key}`,
      `[SchemaCrudList] row action "${action.key}" 缺少 text / href / onClick / render。`
    );
    return null;
  }

  const target = href ? action.target : undefined;
  const rel = target === '_blank' ? (action.props?.rel ?? 'noreferrer') : action.props?.rel;

  const confirm = href ? undefined : action.confirm;

  const button = (
    <Button
      {...action.props}
      type={action.props?.type ?? 'link'}
      size={action.props?.size ?? 'small'}
      danger={action.danger ?? action.props?.danger}
      disabled={disabled}
      loading={busy || action.props?.loading || undefined}
      href={href}
      target={target}
      rel={rel}
      onClick={href || confirm ? undefined : () => void run()}
    >
      {action.text ?? action.key}
    </Button>
  );

  if (!confirm) return withTooltip(button, action.tooltip, disabled);

  const config = confirm === true ? {} : confirm;
  return withTooltip(
    <Popconfirm
      title={config.title ?? '确定执行该操作吗？'}
      okText={config.okText ?? '确定'}
      cancelText={config.cancelText ?? '取消'}
      onConfirm={() => void run()}
    >
      {button}
    </Popconfirm>,
    action.tooltip,
    disabled
  );
}
