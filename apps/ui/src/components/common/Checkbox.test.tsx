import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('should render checkbox with label', () => {
    render(<Checkbox label="Test checkbox" />);

    expect(screen.getByLabelText('Test checkbox')).toBeInTheDocument();
  });

  it('should be checked when checked prop is true', () => {
    render(<Checkbox label="Test" checked onChange={() => {}} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('should be unchecked when checked prop is false', () => {
    render(<Checkbox label="Test" checked={false} onChange={() => {}} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('should call onChange when clicked', async () => {
    const handleChange = vi.fn();
    render(<Checkbox label="Test" onChange={handleChange} />);

    const checkbox = screen.getByRole('checkbox');
    await userEvent.click(checkbox);

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Checkbox label="Test" disabled />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });
});
