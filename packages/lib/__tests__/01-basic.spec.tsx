/**
 * 基础渲染测试
 * 验证 AntdFormSchemaCrud 组件的基本渲染行为，包括：
 * - 默认 className 是否正确应用
 * - 自定义 className 是否能正确合并
 * - children 内容是否正常渲染
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AntdFormSchemaCrud from '../src';

describe('AntdFormSchemaCrud', () => {
  it('should render with default className', () => {
    render(<AntdFormSchemaCrud>hello</AntdFormSchemaCrud>);
    const el = screen.getByText('hello');
    expect(el).toBeInTheDocument();
    expect(el.closest('[data-component="antd-form-schema-crud"]')).toBeInTheDocument();
  });

  it('should merge custom className', () => {
    const { container } = render(<AntdFormSchemaCrud className="custom-class">test</AntdFormSchemaCrud>);
    expect(container.firstChild).toHaveClass('antd-form-schema-crud', 'custom-class');
  });

  it('should render children', () => {
    render(<AntdFormSchemaCrud>child content</AntdFormSchemaCrud>);
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('should pass through rest props', () => {
    render(<AntdFormSchemaCrud id="custom-id" data-role="test" />);
    expect(document.getElementById('custom-id')).toHaveAttribute('data-role', 'test');
  });

  it('should not allow overriding data-component', () => {
    const { container } = render(<AntdFormSchemaCrud data-component="custom" />);
    expect(container.firstChild).toHaveAttribute('data-component', 'antd-form-schema-crud');
  });
});
