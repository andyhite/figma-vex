import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('should render button with children', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('should apply primary variant by default', () => {
    const { container } = render(<Button>Primary</Button>);

    const button = container.querySelector('button');
    expect(button?.className).toContain('btn-primary');
  });

  it('should apply secondary variant', () => {
    const { container } = render(<Button variant="secondary">Secondary</Button>);

    const button = container.querySelector('button');
    expect(button?.className).toContain('btn-secondary');
  });

  it('should apply success variant', () => {
    const { container } = render(<Button variant="success">Success</Button>);

    const button = container.querySelector('button');
    expect(button?.className).toContain('bg-figma-success');
  });

  it('should apply custom className', () => {
    const { container } = render(<Button className="custom-class">Custom</Button>);

    const button = container.querySelector('button');
    expect(button?.className).toContain('custom-class');
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button');
    await userEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should pass through other button props', () => {
    render(
      <Button disabled aria-label="Test button">
        Disabled
      </Button>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-label', 'Test button');
  });
});
