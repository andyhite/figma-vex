import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsTab } from './SettingsTab';

describe('SettingsTab', () => {
  const defaultProps = {
    prefix: '',
    onPrefixChange: vi.fn(),
    collections: [
      { id: '1', name: 'Collection 1' },
      { id: '2', name: 'Collection 2' },
    ],
    selectedCollections: ['1'],
    onToggleCollection: vi.fn(),
    collectionsLoading: false,
    includeCollectionComments: true,
    onIncludeCollectionCommentsChange: vi.fn(),
    includeStyles: false,
    onIncludeStylesChange: vi.fn(),
    styleOutputMode: 'variables' as const,
    onStyleOutputModeChange: vi.fn(),
    styleTypes: ['paint', 'text', 'effect', 'grid'] as const,
    onStyleTypesChange: vi.fn(),
    styleCounts: { paintCount: 5, textCount: 3, effectCount: 2, gridCount: 1 },
    stylesLoading: false,
  };

  it('should render prefix input', () => {
    render(<SettingsTab {...defaultProps} />);
    expect(screen.getByText('Variable Prefix (optional)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., ds, theme')).toBeInTheDocument();
  });

  it('should call onPrefixChange when prefix is updated', async () => {
    const onPrefixChange = vi.fn();
    render(<SettingsTab {...defaultProps} onPrefixChange={onPrefixChange} />);

    const input = screen.getByPlaceholderText('e.g., ds, theme');
    await userEvent.type(input, 'ds');

    expect(onPrefixChange).toHaveBeenCalled();
  });

  it('should render collections', () => {
    render(<SettingsTab {...defaultProps} />);
    expect(screen.getByText('Collection 1')).toBeInTheDocument();
    expect(screen.getByText('Collection 2')).toBeInTheDocument();
  });

  it('should show loading state for collections', () => {
    render(<SettingsTab {...defaultProps} collectionsLoading={true} />);
    expect(screen.getByText('Loading collections...')).toBeInTheDocument();
  });

  it('should show empty state when no collections', () => {
    render(<SettingsTab {...defaultProps} collections={[]} />);
    expect(screen.getByText('No collections found')).toBeInTheDocument();
  });

  it('should call onToggleCollection when collection checkbox is clicked', async () => {
    const onToggleCollection = vi.fn();
    render(<SettingsTab {...defaultProps} onToggleCollection={onToggleCollection} />);

    const checkbox = screen.getByLabelText('Collection 2');
    await userEvent.click(checkbox);

    expect(onToggleCollection).toHaveBeenCalledWith('2');
  });

  it('should render include collection comments checkbox', () => {
    render(<SettingsTab {...defaultProps} />);
    expect(screen.getByLabelText('Include collection comments')).toBeInTheDocument();
  });

  it('should render include styles checkbox', () => {
    render(<SettingsTab {...defaultProps} />);
    expect(screen.getByText(/Include styles/)).toBeInTheDocument();
  });
});
