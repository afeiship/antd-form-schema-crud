import type { ReactNode } from 'react';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import type { CrudActions } from '../../types';

export type FooterActionName = 'save' | 'cancel' | 'edit' | 'delete';

interface FooterActionDefaults {
  text: ReactNode;
  onClick: () => void;
  props?: ButtonProps;
}

/** Renders one footer button, merging project config with component defaults. */
export function renderFooterAction(
  name: FooterActionName,
  actions: CrudActions | undefined,
  defaults: FooterActionDefaults
): ReactNode {
  const config = actions?.[name];
  if (config === false) return null;

  const { text, props: extraProps } = config ?? {};
  return (
    <Button
      key={name}
      {...defaults.props}
      {...extraProps}
      onClick={(event) => {
        extraProps?.onClick?.(event);
        defaults.onClick();
      }}
    >
      {text ?? defaults.text}
    </Button>
  );
}
