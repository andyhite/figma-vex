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
    includeModeComments: false,
    onIncludeModeCommentsChange: vi.fn(),
    headerBanner: undefined,
    onHeaderBannerChange: vi.fn(),
    remBaseVariableId: null,
    onRemBaseVariableChange: vi.fn(),
    numberPrecision: 4,
    onNumberPrecisionChange: vi.fn(),
    cssSelector: ':root',
    onCssSelectorChange: vi.fn(),
    cssExportAsCalcExpressions: false,
    onCssExportAsCalcExpressionsChange: vi.fn(),
    cssUseModesAsSelectors: false,
    onCssUseModesAsSelectorsChange: vi.fn(),
    includeStyles: false,
    onIncludeStylesChange: vi.fn(),
    styleOutputMode: 'variables' as const,
    onStyleOutputModeChange: vi.fn(),
    styleTypes: ['paint', 'text', 'effect', 'grid'] as ('paint' | 'text' | 'effect' | 'grid')[],
    onStyleTypesChange: vi.fn(),
    styleCounts: { paintCount: 5, textCount: 3, effectCount: 2, gridCount: 1 },
    stylesLoading: false,
    nameFormatRules: [] as import('@figma-vex/shared').NameFormatRule[],
    onNameFormatRulesChange: vi.fn(),
    nameFormatCasing: 'kebab' as const,
    onNameFormatCasingChange: vi.fn(),
    nameFormatAdvanced: false,
    onNameFormatAdvancedChange: vi.fn(),
    syncCodeSyntax: true,
    onSyncCodeSyntaxChange: vi.fn(),
    debugMode: false,
    onDebugModeChange: vi.fn(),
    activeSettingsTab: 'general',
    onActiveSettingsTabChange: vi.fn(),
    onExportSettings: vi.fn(),
    onImportSettings: vi.fn(),
    onResetSettings: vi.fn(),
  };

  it('should render prefix input', () => {
    render(<SettingsTab {...defaultProps} activeSettingsTab="variables" />);
    expect(screen.getByText('Name Prefix')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., ds, theme')).toBeInTheDocument();
  });

  it('should call onPrefixChange when prefix is updated', async () => {
    const onPrefixChange = vi.fn();
    render(
      <SettingsTab
        {...defaultProps}
        activeSettingsTab="variables"
        onPrefixChange={onPrefixChange}
      />
    );

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
    render(<SettingsTab {...defaultProps} activeSettingsTab="styles" />);
    expect(screen.getByText(/Include styles/)).toBeInTheDocument();
  });
});
