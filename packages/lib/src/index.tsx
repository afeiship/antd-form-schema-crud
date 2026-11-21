import cx from 'classnames';
import { ReactNode, FC, HTMLAttributes } from "react";

const CLASS_NAME = "antd-form-schema-crud";

export type AntdFormSchemaCrudProps = {
  /**
   * The extended className for component.
   * @default ''
   */
  className?: string;
  /**
   * The children element.
   */
  children?: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

type AntdFormSchemaCrudComponent = FC<AntdFormSchemaCrudProps> & { version?: string };

const AntdFormSchemaCrud: AntdFormSchemaCrudComponent = ({ className, children, ...rest }) => (
  <div {...rest} data-component={CLASS_NAME} className={cx(CLASS_NAME, className)}>
    {children}
  </div>
);

AntdFormSchemaCrud.displayName = CLASS_NAME;
AntdFormSchemaCrud.version = __VERSION__;

export default AntdFormSchemaCrud;
