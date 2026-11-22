import type { ReactNode } from 'react';
import type { SelectProps } from 'antd';
import type { SearchProps } from 'antd/es/input';
import type { CrudListQuerySlot } from '../../../types';

/** Public factory contract for built-in and external query plugins. */
export type CrudQueryPlugin<
  TValues extends Record<string, any>,
  TConfig = void
> = (config: TConfig) => CrudListQuerySlot<TValues>;

export interface CrudQueryPluginDefinition<
  TValues extends Record<string, any>,
  TConfig = void
> {
  /** Debug-only name; plugins are not globally registered. */
  name: string;
  create: (config: TConfig) => CrudListQuerySlot<TValues>;
}

export interface CrudQueryKeywordsPluginConfig
  extends Omit<
    SearchProps,
    'value' | 'defaultValue' | 'onChange' | 'onSearch'
  > {
  /** Query value key. Defaults to keywords. */
  queryKey?: string;
  /** Input width. Defaults to 240. */
  width?: number | string;
}

export interface CrudQueryStatusOption<TValue extends string | number = string> {
  value: TValue;
  label: ReactNode;
}

export interface CrudQueryStatusPluginConfig<
  TValue extends string | number = string
> extends Omit<
    SelectProps<TValue>,
    'value' | 'defaultValue' | 'onChange' | 'options'
  > {
  /** Query value key. Defaults to status. */
  queryKey?: string;
  options: readonly CrudQueryStatusOption<TValue>[];
  /** Select width. Defaults to 120. */
  width?: number | string;
}

export interface CrudQueryPlugins {
  keywords<TValues extends Record<string, any>>(
    config?: CrudQueryKeywordsPluginConfig
  ): CrudListQuerySlot<TValues>;

  status<
    TValues extends Record<string, any>,
    TValue extends string | number = string
  >(
    config: CrudQueryStatusPluginConfig<TValue>
  ): CrudListQuerySlot<TValues>;
}
