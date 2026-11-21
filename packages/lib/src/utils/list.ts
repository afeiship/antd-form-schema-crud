import type { Key } from 'react';
import type { CrudId, CrudListResult, CrudRecord, ListPresetField, ListPresets } from '../types';

/** Stable params key so an inline `params={{ status }}` does not refetch on every render. */
export function stableStringify(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalize);
    if (input && typeof input === 'object') {
      const result: Record<string, unknown> = {};
      Object.keys(input as Record<string, unknown>)
        .sort()
        .forEach((key) => {
          result[key] = normalize((input as Record<string, unknown>)[key]);
        });
      return result;
    }
    return input;
  };

  try {
    return JSON.stringify(normalize(value));
  } catch {
    return String(value);
  }
}

export function getRecordKey<TRecord extends CrudRecord>(
  record: TRecord,
  rowKey: keyof TRecord | ((record: TRecord) => Key) = 'id'
): Key {
  if (typeof rowKey === 'function') return rowKey(record);
  return record[rowKey] as Key;
}

export function getRecordId<TRecord extends CrudRecord>(record: TRecord): CrudId | undefined {
  const id = record.id;
  return id === undefined || id === null ? undefined : id;
}

export function assertListResult<TRecord extends CrudRecord>(
  data: unknown,
  resource?: string
): CrudListResult<TRecord> {
  const name = resource ? `${resource}_index` : 'index';
  if (!data || typeof data !== 'object') {
    throw new Error(`${name} 返回结构必须是 { rows, total }。`);
  }

  const result = data as Partial<CrudListResult<TRecord>>;
  if (!Array.isArray(result.rows) || typeof result.total !== 'number' || !Number.isFinite(result.total)) {
    throw new Error(`${name} 返回结构必须是 { rows, total }。`);
  }

  return { rows: result.rows, total: result.total };
}

type OptionInput =
  | string
  | [any, any]
  | {
      value: any;
      label?: any;
      disabled?: boolean;
      key?: any;
    };

function buildOptionMap(options: OptionInput[] | undefined): Map<any, any> {
  const map = new Map<any, any>();
  (options ?? []).forEach((option) => {
    if (typeof option === 'string') {
      map.set(option, option);
      return;
    }
    if (Array.isArray(option)) {
      map.set(option[0], option[1]);
      return;
    }
    if (option && typeof option === 'object' && 'value' in option) {
      map.set(option.value, option.label ?? option.value);
    }
  });
  return map;
}

/** Map stored values to option labels, including multi-select arrays. */
export function getOptionLabel(
  options: OptionInput[] | undefined,
  value: unknown
): unknown {
  const map = buildOptionMap(options);
  const read = (item: unknown) => (map.has(item) ? map.get(item) : item);
  if (Array.isArray(value)) return value.map(read).join(', ');
  return read(value);
}

/** Accept sectioned presets or a flat key -> title table. */
export function resolveListPresets(
  presets: ListPresets | undefined
): Record<string, ListPresetField> {
  if (!presets) return {};
  if ('fields' in presets && presets.fields && typeof presets.fields === 'object') {
    return presets.fields;
  }
  return Object.fromEntries(
    Object.entries(presets).map(([key, title]) => [key, { title }])
  ) as Record<string, ListPresetField>;
}
