import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OutputArea } from './OutputArea';

describe('OutputArea', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render textarea with default label', () => {
    render(<OutputArea value="test content" readOnly />);

    expect(screen.getByText('Output')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should render textarea with custom label', () => {
    render(<OutputArea label="Custom Label" value="test" readOnly />);

    expect(screen.getByText('Custom Label')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should display value', () => {
    render(<OutputArea value="test content" readOnly />);

    const textarea = screen.getByDisplayValue('test content');
    expect(textarea).toHaveValue('test content');
  });

  it('should display status message as label when success', () => {
    render(<OutputArea value="test" readOnly statusMessage="Success!" statusType="success" />);

    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('should display status message as label when error', () => {
    render(<OutputArea value="test" readOnly statusMessage="Error!" statusType="error" />);

    expect(screen.getByText('Error!')).toBeInTheDocument();
  });

  it('should revert to original label after success timeout', () => {
    render(
      <OutputArea
        label="Output"
        value="test"
        readOnly
        statusMessage="Success!"
        statusType="success"
      />
    );

    expect(screen.getByText('Success!')).toBeInTheDocument();

    // Wrap in act() to flush React state updates from setTimeout
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // After timeout, label should revert
    expect(screen.getByText('Output')).toBeInTheDocument();
  });

  it('should revert to original label after error timeout', () => {
    render(
      <OutputArea label="Output" value="test" readOnly statusMessage="Error!" statusType="error" />
    );

    expect(screen.getByText('Error!')).toBeInTheDocument();

    // Wrap in act() to flush React state updates from setTimeout
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // After timeout, label should revert
    expect(screen.getByText('Output')).toBeInTheDocument();
  });

  it('should render actions', () => {
    render(<OutputArea value="test" readOnly actions={<button>Action Button</button>} />);

    expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<OutputArea value="test" readOnly className="custom-class" />);

    const textarea = container.querySelector('textarea');
    expect(textarea?.className).toContain('custom-class');
  });

  it('should pass through other textarea props', () => {
    render(<OutputArea value="test" readOnly placeholder="Enter text" rows={10} />);

    const textarea = screen.getByPlaceholderText('Enter text');
    expect(textarea).toHaveAttribute('placeholder', 'Enter text');
    expect(textarea).toHaveAttribute('rows', '10');
  });
});
