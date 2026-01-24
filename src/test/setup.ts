// src/test/setup.ts
// Global test setup - add mocks and utilities as needed
import { vi } from 'vitest';

// Mock Figma plugin API for plugin tests
export const mockFigmaAPI = {
  variables: {
    getLocalVariablesAsync: vi.fn(),
    getLocalVariableCollectionsAsync: vi.fn(),
  },
  root: {
    name: 'Test File',
  },
  showUI: vi.fn(),
  ui: {
    postMessage: vi.fn(),
    onmessage: null as ((msg: unknown) => void) | null,
  },
  closePlugin: vi.fn(),
};

// Helper to reset mocks between tests
export function resetFigmaMocks() {
  mockFigmaAPI.variables.getLocalVariablesAsync.mockReset();
  mockFigmaAPI.variables.getLocalVariableCollectionsAsync.mockReset();
  mockFigmaAPI.ui.postMessage.mockReset();
  mockFigmaAPI.showUI.mockReset();
  mockFigmaAPI.closePlugin.mockReset();
}
