import { Select } from 'antd';
import type { CrudListQueryContext, CrudListQuerySlot } from '../../../types';
import { defineQueryPlugin } from './define';
import type {
  CrudQueryStatusOption,
  CrudQueryStatusPluginConfig,
} from './types';

interface StatusControlProps<
  TValues extends Record<string, any>,
  TValue extends string | number
> extends CrudQueryStatusPluginConfig<TValue> {
  context: CrudListQueryContext<TValues>;
}

function StatusControl<
  TValues extends Record<string, any>,
  TValue extends string | number
>({
  context,
  queryKey = 'status',
  options,
  width = 120,
  size = 'small',
  allowClear = true,
  placeholder = '全部状态',
  className,
  style,
  ...rest
}: StatusControlProps<TValues, TValue>) {
  return (
    <Select<TValue>
      {...rest}
      className={className}
      size={size}
      allowClear={allowClear}
      placeholder={placeholder}
      style={{ width, ...style }}
      options={[...options] as CrudQueryStatusOption<TValue>[]}
      value={context.values[queryKey] as TValue | undefined}
      onChange={(value) =>
        context.setValues({ [queryKey]: value } as Partial<TValues>)
      }
    />
  );
}

/** Built-in status select plugin. */
export function status<
  TValues extends Record<string, any>,
  TValue extends string | number = string
>(
  config: CrudQueryStatusPluginConfig<TValue>
): CrudListQuerySlot<TValues> {
  return defineQueryPlugin<TValues, CrudQueryStatusPluginConfig<TValue>>({
    name: 'status',
    create: (nextConfig) => (context) => (
      <StatusControl context={context} {...nextConfig} />
    ),
  })(config);
}
