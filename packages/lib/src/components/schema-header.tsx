import type { ReactNode } from 'react';
import { CLASS_NAME } from '../constants';

interface SchemaHeaderProps {
  title?: ReactNode;
  extra?: ReactNode;
}

export function SchemaHeader({ title, extra }: SchemaHeaderProps) {
  if ((title === undefined || title === null) && (extra === undefined || extra === null))
    return null;

  return (
    <header className={`${CLASS_NAME}__header`}>
      <div className={`${CLASS_NAME}__title`}>{title}</div>
      <div className={`${CLASS_NAME}__extra`}>{extra}</div>
    </header>
  );
}
