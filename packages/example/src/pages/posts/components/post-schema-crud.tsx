import { SchemaCrud } from '@jswork/antd-form-schema-crud';
import type { CrudId, CrudMode, SchemaCrudProps } from '@jswork/antd-form-schema-crud';
import { MODE_TITLES, postSchema } from '../schema';
import { PostToolbar } from './post-toolbar';
import type { PostOption } from '../types';

interface PostSchemaCrudProps {
  activeId?: CrudId;
  mode: CrudMode;
  options: PostOption[];
  recordsCount: number;
  refresh: number;
  onSelect: (id: CrudId) => void;
  onModeChange: (mode: CrudMode) => void;
  onCreated: (result: unknown) => void;
  onUpdated: () => void;
  onDeleted: () => void;
  onError: NonNullable<SchemaCrudProps['onError']>;
}

export function PostSchemaCrud({
  activeId,
  mode,
  options,
  recordsCount,
  refresh,
  onSelect,
  onModeChange,
  onCreated,
  onUpdated,
  onDeleted,
  onError,
}: PostSchemaCrudProps) {
  return (
    <SchemaCrud
      key={`${mode}-${String(activeId ?? '')}-${refresh}`}
      mode={mode}
      schema={postSchema}
      resource="posts"
      id={activeId}
      title={MODE_TITLES[mode]}
      formProps={{ layout: 'vertical' }}
      createInitialValues={{ status: 'draft', is_sticky: false }}
      beforeSubmit={(values) => ({
        ...values,
        title: String(values.title ?? '').trim(),
        subtitle: String(values.subtitle ?? '').trim(),
      })}
      extra={
        <PostToolbar
          activeId={activeId}
          mode={mode}
          options={options}
          disabled={mode === 'create' || recordsCount === 0}
          onSelect={onSelect}
          onModeChange={onModeChange}
        />
      }
      onCancel={mode === 'view' || !activeId ? undefined : () => onModeChange('view')}
      onEdit={activeId ? () => onModeChange('edit') : undefined}
      onCreated={onCreated}
      onUpdated={onUpdated}
      onDeleted={onDeleted}
      onError={onError}
    />
  );
}
