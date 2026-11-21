import type { FormSchema } from '@jswork/antd-form-schema';

/**
 * Select schema fields by key, preserving the requested order.
 * Unknown keys and schema-hidden fields are skipped; the input schema is not mutated.
 */
export function selectSchemaFields(
  schema: FormSchema,
  fields: readonly string[] | undefined
): FormSchema {
  if (fields === undefined) return schema;

  const fieldMap = new Map(schema.fields.map((field) => [field.key, field]));
  const seen = new Set<string>();
  const selected = fields.flatMap((key) => {
    if (seen.has(key)) return [];
    seen.add(key);
    const field = fieldMap.get(key);
    return field && !field.hidden ? [field] : [];
  });

  return { ...schema, fields: selected };
}
