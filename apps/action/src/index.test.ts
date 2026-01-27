import { describe, it, expect } from 'vitest';
import { validateInputs, validatePayload, collectFilesToWrite } from './index.js';
import type { ActionInputs, RepositoryDispatchPayload } from './types.js';
import type { DTCGDocument, DTCGConversionSettings } from '@figma-vex/shared';

const createMockDocument = (): DTCGDocument => ({
  $schema: 'https://design-tokens.github.io/format/',
  collections: {
    Colors: {
      primary: {
        $type: 'color',
        $value: '#0080ff',
      },
    },
  },
  $metadata: {
    figmaFile: 'test.figma',
    generatedAt: '2024-01-01T00:00:00.000Z',
  },
});

const createMockSettings = (): DTCGConversionSettings => ({
  colorFormat: 'hex',
  defaultUnit: 'px',
  remBase: 16,
  includeCollectionComments: false,
  includeModeComments: false,
});

const createMockPayload = (): RepositoryDispatchPayload => ({
  client_payload: {
    document: createMockDocument(),
    settings: createMockSettings(),
    export_types: ['css', 'json'],
    figma_file: 'test.figma',
    generated_at: '2024-01-01T00:00:00.000Z',
    workflow_file: 'update-variables.yml',
  },
});

describe('validateInputs', () => {
  it('should pass when at least one path is provided', () => {
    const inputs: ActionInputs = {
      dryRun: false,
      token: 'test-token',
      prTitle: 'test',
      cssPath: 'styles/tokens.css',
    };
    expect(() => validateInputs(inputs)).not.toThrow();
  });

  it('should pass with multiple paths', () => {
    const inputs: ActionInputs = {
      dryRun: false,
      token: 'test-token',
      prTitle: 'test',
      cssPath: 'styles/tokens.css',
      scssPath: 'styles/tokens.scss',
      jsonPath: 'tokens.json',
      typescriptPath: 'tokens.d.ts',
    };
    expect(() => validateInputs(inputs)).not.toThrow();
  });

  it('should throw when no path is provided', () => {
    const inputs: ActionInputs = {
      dryRun: false,
      token: 'test-token',
      prTitle: 'test',
    };
    expect(() => validateInputs(inputs)).toThrow(
      'At least one path input must be provided (css-path, scss-path, json-path, or typescript-path)'
    );
  });

  it('should throw when all paths are undefined', () => {
    const inputs: ActionInputs = {
      dryRun: false,
      token: 'test-token',
      prTitle: 'test',
      cssPath: undefined,
      scssPath: undefined,
      jsonPath: undefined,
      typescriptPath: undefined,
    };
    expect(() => validateInputs(inputs)).toThrow();
  });
});

describe('validatePayload', () => {
  it('should return true for valid payload', () => {
    const payload = createMockPayload();
    expect(validatePayload(payload)).toBe(true);
  });

  it('should throw for null payload', () => {
    expect(() => validatePayload(null)).toThrow('Invalid event payload: payload is not an object');
  });

  it('should throw for undefined payload', () => {
    expect(() => validatePayload(undefined)).toThrow(
      'Invalid event payload: payload is not an object'
    );
  });

  it('should throw for non-object payload', () => {
    expect(() => validatePayload('string')).toThrow(
      'Invalid event payload: payload is not an object'
    );
  });

  it('should throw when client_payload is missing', () => {
    const payload = {};
    expect(() => validatePayload(payload)).toThrow(
      'Invalid event payload: client_payload is missing or invalid'
    );
  });

  it('should throw when document is missing', () => {
    const payload = {
      client_payload: {
        settings: {},
        export_types: ['css'],
        figma_file: 'test.figma',
        generated_at: '2024-01-01',
      },
    };
    expect(() => validatePayload(payload)).toThrow(
      'Invalid event payload: client_payload.document is missing or invalid'
    );
  });

  it('should throw when settings is missing', () => {
    const payload = {
      client_payload: {
        document: {},
        export_types: ['css'],
        figma_file: 'test.figma',
        generated_at: '2024-01-01',
      },
    };
    expect(() => validatePayload(payload)).toThrow(
      'Invalid event payload: client_payload.settings is missing or invalid'
    );
  });

  it('should throw when export_types is not an array', () => {
    const payload = {
      client_payload: {
        document: {},
        settings: {},
        export_types: 'css',
        figma_file: 'test.figma',
        generated_at: '2024-01-01',
      },
    };
    expect(() => validatePayload(payload)).toThrow(
      'Invalid event payload: client_payload.export_types is missing or invalid'
    );
  });

  it('should throw when figma_file is missing', () => {
    const payload = {
      client_payload: {
        document: {},
        settings: {},
        export_types: ['css'],
        generated_at: '2024-01-01',
      },
    };
    expect(() => validatePayload(payload)).toThrow(
      'Invalid event payload: client_payload.figma_file is missing or invalid'
    );
  });

  it('should throw when generated_at is missing', () => {
    const payload = {
      client_payload: {
        document: {},
        settings: {},
        export_types: ['css'],
        figma_file: 'test.figma',
      },
    };
    expect(() => validatePayload(payload)).toThrow(
      'Invalid event payload: client_payload.generated_at is missing or invalid'
    );
  });

  it('should throw when export_types contains invalid values', () => {
    const payload = {
      client_payload: {
        document: {},
        settings: {},
        export_types: ['css', 'invalid', 'also-invalid'],
        figma_file: 'test.figma',
        generated_at: '2024-01-01',
      },
    };
    expect(() => validatePayload(payload)).toThrow(
      'Invalid event payload: export_types contains invalid values: invalid, also-invalid'
    );
  });

  it('should throw when export_types contains non-string values', () => {
    const payload = {
      client_payload: {
        document: {},
        settings: {},
        export_types: ['css', 123, null],
        figma_file: 'test.figma',
        generated_at: '2024-01-01',
      },
    };
    expect(() => validatePayload(payload)).toThrow(
      'Invalid event payload: export_types contains invalid values'
    );
  });

  it('should throw when export_types is empty', () => {
    const payload = {
      client_payload: {
        document: {},
        settings: {},
        export_types: [],
        figma_file: 'test.figma',
        generated_at: '2024-01-01',
      },
    };
    expect(() => validatePayload(payload)).toThrow(
      'Invalid event payload: export_types must contain at least one export type'
    );
  });

  it('should accept all valid export types', () => {
    const payload = {
      client_payload: {
        document: {},
        settings: {},
        export_types: ['css', 'scss', 'json', 'typescript'],
        figma_file: 'test.figma',
        generated_at: '2024-01-01',
      },
    };
    expect(validatePayload(payload)).toBe(true);
  });
});

describe('collectFilesToWrite', () => {
  it('should collect CSS file when path and export type match', () => {
    const inputs: ActionInputs = {
      dryRun: false,
      token: 'test-token',
      prTitle: 'test',
      cssPath: 'styles/tokens.css',
    };
    const payload = createMockPayload();

    const files = collectFilesToWrite(inputs, payload);

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('styles/tokens.css');
    expect(files[0].content).toContain('--colors-primary');
  });

  it('should collect JSON file when path and export type match', () => {
    const inputs: ActionInputs = {
      dryRun: false,
      token: 'test-token',
      prTitle: 'test',
      jsonPath: 'tokens.json',
    };
    const payload = createMockPayload();

    const files = collectFilesToWrite(inputs, payload);

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('tokens.json');
    expect(JSON.parse(files[0].content)).toEqual(payload.client_payload.document);
  });

  it('should not collect file when path is provided but export type is not', () => {
    const inputs: ActionInputs = {
      dryRun: false,
      token: 'test-token',
      prTitle: 'test',
      scssPath: 'styles/tokens.scss',
    };
    const payload = createMockPayload(); // export_types: ['css', 'json']

    const files = collectFilesToWrite(inputs, payload);

    expect(files).toHaveLength(0);
  });

  it('should collect multiple files when paths and export types match', () => {
    const inputs: ActionInputs = {
      dryRun: false,
      token: 'test-token',
      prTitle: 'test',
      cssPath: 'styles/tokens.css',
      jsonPath: 'tokens.json',
    };
    const payload = createMockPayload();

    const files = collectFilesToWrite(inputs, payload);

    expect(files).toHaveLength(2);
    expect(files.map((f) => f.path)).toContain('styles/tokens.css');
    expect(files.map((f) => f.path)).toContain('tokens.json');
  });

  it('should collect SCSS file when path and export type match', () => {
    const inputs: ActionInputs = {
      dryRun: false,
      token: 'test-token',
      prTitle: 'test',
      scssPath: 'styles/tokens.scss',
    };
    const payload = createMockPayload();
    payload.client_payload.export_types = ['scss'];

    const files = collectFilesToWrite(inputs, payload);

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('styles/tokens.scss');
    expect(files[0].content).toContain('$colors-primary');
  });

  it('should collect TypeScript file when path and export type match', () => {
    const inputs: ActionInputs = {
      dryRun: false,
      token: 'test-token',
      prTitle: 'test',
      typescriptPath: 'tokens.d.ts',
    };
    const payload = createMockPayload();
    payload.client_payload.export_types = ['typescript'];

    const files = collectFilesToWrite(inputs, payload);

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('tokens.d.ts');
    expect(files[0].content).toContain('CSSVariableName');
  });
});
