import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportTab } from './ExportTab';
import * as usePluginMessage from '../../hooks/usePluginMessage';
import * as useClipboard from '../../hooks/useClipboard';

vi.mock('../../hooks/usePluginMessage');
vi.mock('../../hooks/useClipboard');

describe('ExportTab', () => {
  const defaultProps = {
    selectedFormats: ['css', 'json', 'typescript'] as ('css' | 'json' | 'typescript')[],
    onSelectedFormatsChange: vi.fn(),
    prefix: '',
    selectedCollections: [],
    includeCollectionComments: true,
    includeModeComments: true,
    headerBanner: undefined,
    syncCalculations: false,
    includeStyles: false,
    styleOutputMode: 'variables' as const,
    styleTypes: ['paint', 'text', 'effect', 'grid'] as ('paint' | 'text' | 'effect' | 'grid')[],
    remBaseVariableId: null,
    nameFormatRules: [],
    syncCodeSyntax: false,
    numberPrecision: 4,
    includeCollectionName: true,
    useModesAsSelectors: false,
    exportAsCalcExpressions: false,
    selector: ':root',
    githubRepository: '',
    githubToken: '',
  };

  let mockSendMessage: ReturnType<typeof vi.fn>;
  let mockListenToMessage: ReturnType<typeof vi.fn>;
  let mockCopyToClipboard: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSendMessage = vi.fn();
    mockListenToMessage = vi.fn().mockReturnValue(() => {});
    mockCopyToClipboard = vi.fn().mockResolvedValue(true);

    vi.spyOn(usePluginMessage, 'usePluginMessage').mockReturnValue({
      sendMessage: mockSendMessage,
      listenToMessage: mockListenToMessage,
    });

    vi.spyOn(useClipboard, 'useClipboard').mockReturnValue({
      copyToClipboard: mockCopyToClipboard,
      copied: false,
    });
  });

  it('should render format selection checkboxes', () => {
    render(<ExportTab {...defaultProps} />);

    // Check that format checkboxes are present
    expect(screen.getByLabelText('CSS')).toBeInTheDocument();
    expect(screen.getByLabelText('JSON')).toBeInTheDocument();
    expect(screen.getByLabelText('TypeScript')).toBeInTheDocument();
  });

  it('should render format descriptions', () => {
    render(<ExportTab {...defaultProps} />);

    expect(
      screen.getByText('Export as CSS custom properties with configurable selectors')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Export as JSON for Style Dictionary or other token tools')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Generate TypeScript type definitions for CSS variables')
    ).toBeInTheDocument();
  });

  it('should render Generate button', () => {
    render(<ExportTab {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument();
  });

  it('should disable Generate button when no formats selected', () => {
    render(<ExportTab {...defaultProps} selectedFormats={[]} />);

    expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();
  });

  it('should enable Generate button when formats are selected', () => {
    render(<ExportTab {...defaultProps} selectedFormats={['css']} />);

    expect(screen.getByRole('button', { name: 'Generate' })).not.toBeDisabled();
  });

  it('should call onSelectedFormatsChange when format is toggled', async () => {
    const onSelectedFormatsChange = vi.fn();
    render(
      <ExportTab
        {...defaultProps}
        selectedFormats={['css', 'json']}
        onSelectedFormatsChange={onSelectedFormatsChange}
      />
    );

    // Find and click the CSS checkbox (uncheck it)
    const cssCheckbox = screen.getByLabelText('CSS');
    await userEvent.click(cssCheckbox);

    expect(onSelectedFormatsChange).toHaveBeenCalledWith(['json']);
  });

  it('should add format when checkbox is checked', async () => {
    const onSelectedFormatsChange = vi.fn();
    render(
      <ExportTab
        {...defaultProps}
        selectedFormats={['css']}
        onSelectedFormatsChange={onSelectedFormatsChange}
      />
    );

    const jsonCheckbox = screen.getByLabelText('JSON');
    await userEvent.click(jsonCheckbox);

    expect(onSelectedFormatsChange).toHaveBeenCalledWith(['css', 'json']);
  });

  it('should send export messages when Generate is clicked', async () => {
    render(<ExportTab {...defaultProps} selectedFormats={['css', 'json']} />);

    const generateButton = screen.getByRole('button', { name: 'Generate' });
    await userEvent.click(generateButton);

    expect(mockSendMessage).toHaveBeenCalledTimes(2);
    expect(mockSendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'export-css' }));
    expect(mockSendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'export-json' }));
  });

  it('should show output navigation tabs for selected formats', () => {
    render(<ExportTab {...defaultProps} selectedFormats={['css', 'json']} />);

    // The navigation should show tabs for selected formats
    const navTabs = screen.getAllByRole('tab');
    const navLabels = navTabs.map((b) => b.textContent);

    expect(navLabels).toContain('CSS');
    expect(navLabels).toContain('JSON');
  });

  it('should not show output area when no formats selected', () => {
    render(<ExportTab {...defaultProps} selectedFormats={[]} />);

    // OutputArea should not be present
    expect(screen.queryByText('CSS Output')).not.toBeInTheDocument();
    expect(screen.queryByText('JSON Output')).not.toBeInTheDocument();
  });

  it('should show placeholder text in output area', () => {
    render(<ExportTab {...defaultProps} selectedFormats={['css']} />);

    expect(screen.getByPlaceholderText("Click 'Generate' to export CSS...")).toBeInTheDocument();
  });

  it('should update output when result message is received', async () => {
    let messageCallback: ((msg: unknown) => void) | null = null;
    mockListenToMessage.mockImplementation((cb: (msg: unknown) => void) => {
      messageCallback = cb;
      return () => {};
    });

    render(<ExportTab {...defaultProps} selectedFormats={['css']} />);

    // Simulate receiving a CSS result
    await waitFor(() => {
      expect(messageCallback).not.toBeNull();
    });

    messageCallback!({ type: 'css-result', css: ':root { --color: red; }' });

    await waitFor(() => {
      expect(screen.getByDisplayValue(':root { --color: red; }')).toBeInTheDocument();
    });
  });
});
