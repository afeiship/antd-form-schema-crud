import { Segmented, Select, Space } from 'antd';
import type { CrudId, CrudMode } from '@jswork/antd-form-schema-crud';
import type { PostOption } from '../types';

interface PostToolbarProps {
  activeId?: CrudId;
  mode: CrudMode;
  options: PostOption[];
  disabled: boolean;
  onSelect: (id: CrudId) => void;
  onModeChange: (mode: CrudMode) => void;
}

export function PostToolbar({
  activeId,
  mode,
  options,
  disabled,
  onSelect,
  onModeChange,
}: PostToolbarProps) {
  return (
    <Space wrap>
      <Select
        style={{ width: 260 }}
        value={activeId}
        options={options}
        disabled={disabled}
        placeholder="选择文章"
        onChange={onSelect}
      />
      <Segmented
        value={mode}
        options={[
          { label: '预览', value: 'view', disabled: !activeId },
          { label: '编辑', value: 'edit', disabled: !activeId },
          { label: '新建', value: 'create' },
        ]}
        onChange={(value) => onModeChange(value as CrudMode)}
      />
    </Space>
  );
}
