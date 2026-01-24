import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  it('should render input with label', () => {
    render(<Input label="Test input" />);

    expect(screen.getByText('Test input')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should display value', () => {
    render(<Input label="Test" value="test value" onChange={() => {}} />);

    const input = screen.getByDisplayValue('test value');
    expect(input).toHaveValue('test value');
  });

  it('should call onChange when value changes', async () => {
    const handleChange = vi.fn();
    render(<Input label="Test" value="" onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'new value');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should display placeholder', () => {
    render(<Input label="Test" placeholder="Enter text" />);

    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input label="Test" disabled />);

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('should pass through other input props', () => {
    render(<Input label="Test" type="email" required aria-label="Email input" />);

    const input = screen.getByLabelText('Email input');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toBeRequired();
  });
});
