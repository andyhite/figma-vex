import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportSettingsModal } from './ImportSettingsModal';

describe('ImportSettingsModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    filename: 'settings.json',
  };

  it('should not render when closed', () => {
    render(<ImportSettingsModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(<ImportSettingsModal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Import Settings')).toBeInTheDocument();
  });

  it('should display the filename', () => {
    render(<ImportSettingsModal {...defaultProps} filename="my-settings.json" />);

    expect(screen.getByText('my-settings.json')).toBeInTheDocument();
  });

  it('should display warnings when provided', () => {
    const warnings = ['Collection "Legacy" not found', 'Variable path not found'];
    render(<ImportSettingsModal {...defaultProps} warnings={warnings} />);

    expect(screen.getByText('Warnings:')).toBeInTheDocument();
    expect(screen.getByText('Collection "Legacy" not found')).toBeInTheDocument();
    expect(screen.getByText('Variable path not found')).toBeInTheDocument();
  });

  it('should not display warnings section when empty', () => {
    render(<ImportSettingsModal {...defaultProps} warnings={[]} />);

    expect(screen.queryByText('Warnings:')).not.toBeInTheDocument();
  });

  it('should call onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    render(<ImportSettingsModal {...defaultProps} onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onConfirm when Import is clicked', async () => {
    const onConfirm = vi.fn();
    render(<ImportSettingsModal {...defaultProps} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should close on Escape key', async () => {
    const onClose = vi.fn();
    render(<ImportSettingsModal {...defaultProps} onClose={onClose} />);

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('error mode', () => {
    it('should display error message', () => {
      render(<ImportSettingsModal {...defaultProps} error="Invalid file format" />);

      expect(screen.getByText('Import Error')).toBeInTheDocument();
      expect(screen.getByText('Invalid file format')).toBeInTheDocument();
    });

    it('should show Close button instead of Cancel in error mode', () => {
      render(<ImportSettingsModal {...defaultProps} error="Invalid file format" />);

      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    });

    it('should not show Import button in error mode', () => {
      render(<ImportSettingsModal {...defaultProps} error="Invalid file format" />);

      expect(screen.queryByRole('button', { name: 'Import' })).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading indicator when loading', () => {
      render(<ImportSettingsModal {...defaultProps} loading={true} />);

      expect(screen.getByText('Processing settings...')).toBeInTheDocument();
    });

    it('should disable Import button when loading', () => {
      render(<ImportSettingsModal {...defaultProps} loading={true} />);

      expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
    });

    it('should not show warnings when loading', () => {
      const warnings = ['Collection not found'];
      render(<ImportSettingsModal {...defaultProps} warnings={warnings} loading={true} />);

      expect(screen.queryByText('Warnings:')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ImportSettingsModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('should focus the Cancel/Close button when opened', () => {
      render(<ImportSettingsModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    });
  });
});
