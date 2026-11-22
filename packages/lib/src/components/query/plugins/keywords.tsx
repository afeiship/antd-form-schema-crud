import { useEffect, useState } from 'react';
import { Input } from 'antd';
import type { CrudListQueryContext, CrudListQuerySlot } from '../../../types';
import { defineQueryPlugin } from './define';
import type { CrudQueryKeywordsPluginConfig } from './types';

interface KeywordsControlProps<TValues extends Record<string, any>>
  extends CrudQueryKeywordsPluginConfig {
  context: CrudListQueryContext<TValues>;
}

function KeywordsControl<TValues extends Record<string, any>>({
  context,
  queryKey = 'keywords',
  width = 240,
  size = 'small',
  allowClear = true,
  enterButton = true,
  autoFocus = false,
  placeholder = '搜索',
  className,
  style,
  ...rest
}: KeywordsControlProps<TValues>) {
  const externalValue = String(context.values[queryKey] ?? '');
  const [value, setValue] = useState(externalValue);

  useEffect(() => {
    setValue(externalValue);
  }, [externalValue]);

  const commit = (next: string) => {
    const keywords = next.trim() || undefined;
    context.setValues({ [queryKey]: keywords } as Partial<TValues>);
  };

  return (
    <Input.Search
      {...rest}
      className={className}
      size={size}
      allowClear={allowClear}
      enterButton={enterButton}
      autoFocus={autoFocus}
      placeholder={placeholder}
      style={{ width, ...style }}
      value={value}
      onChange={(event) => {
        const next = event.target.value;
        setValue(next);
        if (!next) commit('');
      }}
      onSearch={commit}
    />
  );
}

/** Built-in keywords search plugin. */
export function keywords<TValues extends Record<string, any>>(
  config: CrudQueryKeywordsPluginConfig = {}
): CrudListQuerySlot<TValues> {
  return defineQueryPlugin<TValues, CrudQueryKeywordsPluginConfig>({
    name: 'keywords',
    create: (nextConfig) => (context) => (
      <KeywordsControl context={context} {...nextConfig} />
    ),
  })(config);
}
