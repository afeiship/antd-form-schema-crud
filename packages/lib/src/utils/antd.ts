import type { ReactNode } from 'react';
import { version as antdVersion } from 'antd';

export const ANTD_MAJOR = Number.parseInt(String(antdVersion).split('.')[0], 10) || 5;

/** antd v5 uses `message`, antd v6 renamed it to `title`. */
export const alertTitleProps = (text: ReactNode) =>
  (ANTD_MAJOR >= 6 ? { title: text } : { message: text }) as {
    title?: ReactNode;
    message?: ReactNode;
  };
