import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import * as useCollections from './hooks/useCollections';
import * as useAutoResize from './hooks/useAutoResize';
import * as useSettings from './hooks/useSettings';
import * as useStyles from './hooks/useStyles';
import { DEFAULT_SETTINGS } from './hooks/useSettings';

vi.mock('./hooks/useCollections');
vi.mock('./hooks/useAutoResize');
vi.mock('./hooks/useSettings');
vi.mock('./hooks/useStyles');

describe('App', () => {
  const mockToggleCollection = vi.fn();
  const mockContainerRef = { current: null };
  let mockSettings: typeof DEFAULT_SETTINGS;
  let mockUpdateSettings: ReturnType<typeof vi.fn>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    vi.clearAllMocks();
    renderResult = undefined!;

    mockSettings = { ...DEFAULT_SETTINGS };
    mockUpdateSettings = vi.fn((updates) => {
      Object.assign(mockSettings, updates);
      // Force re-render after settings update if component is still mounted
      if (renderResult && renderResult.container) {
        try {
          renderResult.rerender(<App />);
        } catch {
          // Component may have been unmounted, ignore
        }
      }
    });

    // Create a getter function that always returns current settings
    vi.spyOn(useSettings, 'useSettings').mockImplementation(() => ({
      settings: { ...mockSettings },
      loading: false,
      updateSettings: mockUpdateSettings,
    }));

    vi.spyOn(useStyles, 'useStyles').mockReturnValue({
      styleCounts: { paintCount: 5, textCount: 3, effectCount: 2, gridCount: 1 },
      totalStyles: 11,
      loading: false,
    });

    vi.spyOn(useCollections, 'useCollections').mockReturnValue({
      collections: [
        { id: '1', name: 'Collection 1' },
        { id: '2', name: 'Collection 2' },
      ],
      selectedCollections: ['1', '2'],
      toggleCollection: mockToggleCollection,
      loading: false,
    });

    vi.spyOn(useAutoResize, 'useAutoResize').mockReturnValue(mockContainerRef);
  });

  it('should render tab bar with all tabs', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'CSS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'JSON' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TypeScript' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'GitHub' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument();
  });

  it('should start with CSS tab active', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'Generate CSS' })).toBeInTheDocument();
  });

  it('should switch tabs when clicked', async () => {
    renderResult = render(<App />);

    const jsonTab = screen.getByRole('button', { name: 'JSON' });
    await userEvent.click(jsonTab);

    // Wait for the tab to switch and JSON content to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Generate JSON' })).toBeInTheDocument();
    });
  });

  it('should render collections checkbox list on settings tab', async () => {
    renderResult = render(<App />);

    const settingsTab = screen.getByRole('button', { name: 'Settings' });
    await userEvent.click(settingsTab);

    await waitFor(() => {
      expect(screen.getByLabelText('Collection 1')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Collection 2')).toBeInTheDocument();
  });

  it('should toggle collection when checkbox is clicked', async () => {
    renderResult = render(<App />);

    const settingsTab = screen.getByRole('button', { name: 'Settings' });
    await userEvent.click(settingsTab);

    const checkbox = screen.getByLabelText('Collection 1');
    await userEvent.click(checkbox);

    expect(mockToggleCollection).toHaveBeenCalledWith('1');
  });

  it('should render prefix input on settings tab', async () => {
    renderResult = render(<App />);

    const settingsTab = screen.getByRole('button', { name: 'Settings' });
    await userEvent.click(settingsTab);

    // Navigate to Variables sub-tab where prefix input is located
    const variablesSubTab = screen.getByRole('button', { name: 'Variables' });
    await userEvent.click(variablesSubTab);

    await waitFor(() => {
      expect(screen.getByText('Name Prefix')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('e.g., ds, theme')).toBeInTheDocument();
  });

  it('should update prefix when input changes', async () => {
    renderResult = render(<App />);

    const settingsTab = screen.getByRole('button', { name: 'Settings' });
    await userEvent.click(settingsTab);

    // Navigate to Variables sub-tab where prefix input is located
    const variablesSubTab = screen.getByRole('button', { name: 'Variables' });
    await userEvent.click(variablesSubTab);

    const input = screen.getByPlaceholderText('e.g., ds, theme');
    await userEvent.type(input, 'ds-');

    expect(input).toHaveValue('ds-');
  });

  it('should render include collection comments checkbox on settings tab', async () => {
    renderResult = render(<App />);

    const settingsTab = screen.getByRole('button', { name: 'Settings' });
    await userEvent.click(settingsTab);

    await waitFor(() => {
      expect(screen.getByLabelText('Include collection comments')).toBeInTheDocument();
    });
  });

  it('should toggle include collection comments', async () => {
    renderResult = render(<App />);

    const settingsTab = screen.getByRole('button', { name: 'Settings' });
    await userEvent.click(settingsTab);

    const checkbox = screen.getByLabelText('Include collection comments');
    await userEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
  });

  it('should show loading state when collections are loading', async () => {
    vi.spyOn(useCollections, 'useCollections').mockReturnValue({
      collections: [],
      selectedCollections: [],
      toggleCollection: mockToggleCollection,
      loading: true,
    });

    renderResult = render(<App />);

    const settingsTab = screen.getByRole('button', { name: 'Settings' });
    await userEvent.click(settingsTab);

    await waitFor(() => {
      expect(screen.getByText('Loading collections...')).toBeInTheDocument();
    });
  });

  it('should show message when no collections found', async () => {
    vi.spyOn(useCollections, 'useCollections').mockReturnValue({
      collections: [],
      selectedCollections: [],
      toggleCollection: mockToggleCollection,
      loading: false,
    });

    renderResult = render(<App />);

    const settingsTab = screen.getByRole('button', { name: 'Settings' });
    await userEvent.click(settingsTab);

    await waitFor(() => {
      expect(screen.getByText('No collections found')).toBeInTheDocument();
    });
  });

  it('should hide global settings on help tab', async () => {
    render(<App />);

    const helpTab = screen.getByRole('button', { name: 'Help' });
    await userEvent.click(helpTab);

    expect(screen.queryByText('Name Prefix')).not.toBeInTheDocument();
    expect(screen.queryByText('Collections')).not.toBeInTheDocument();
  });

  it('should hide global settings on export tabs', () => {
    render(<App />);

    // CSS tab is active by default
    expect(screen.queryByText('Name Prefix')).not.toBeInTheDocument();
    expect(screen.queryByText('Collections')).not.toBeInTheDocument();
  });

  it('should display tab description', () => {
    render(<App />);

    expect(
      screen.getByText(
        'Export variables as CSS custom properties with customizable selectors and formatting options.'
      )
    ).toBeInTheDocument();
  });
});
