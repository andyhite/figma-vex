/// <reference types="@figma/plugin-typings" />

import type { PluginMessage, ExportOptions, UIMessage } from '@shared/types';
import { exportToCss } from './exporters/cssExporter';
import { exportToScss } from './exporters/scssExporter';
import { exportToJson } from './exporters/jsonExporter';
import { exportToTypeScript } from './exporters/typescriptExporter';
import { sendGitHubDispatch } from './services/githubService';

// UI dimensions
const UI_WIDTH = 520;
const UI_HEIGHT_COMPACT = 600; // Height when no output is shown

/**
 * Sends a message to the UI.
 */
function postToUI(message: UIMessage): void {
  figma.ui.postMessage(message);
}

/**
 * Gets the default export options.
 */
function getDefaultOptions(): ExportOptions {
  return {
    includeCollectionComments: true,
    includeModeComments: true,
    selector: ':root',
    useModesAsSelectors: false,
  };
}

/**
 * Main message handler.
 */
async function handleMessage(msg: PluginMessage): Promise<void> {
  const variables = await figma.variables.getLocalVariablesAsync();
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const fileName = figma.root.name;

  switch (msg.type) {
    case 'get-collections': {
      postToUI({
        type: 'collections-list',
        collections: collections.map((c) => ({ id: c.id, name: c.name })),
      });
      break;
    }

    case 'export-css': {
      const options = msg.options != null ? msg.options : getDefaultOptions();
      const css = await exportToCss(variables, collections, fileName, options);
      postToUI({ type: 'css-result', css });
      break;
    }

    case 'export-scss': {
      const options =
        msg.options != null ? msg.options : { ...getDefaultOptions(), includeModeComments: false };
      const scss = await exportToScss(variables, collections, fileName, options);
      postToUI({ type: 'scss-result', scss });
      break;
    }

    case 'export-json': {
      const json = await exportToJson(variables, collections, msg.options);
      postToUI({ type: 'json-result', json });
      break;
    }

    case 'export-typescript': {
      const options =
        msg.options != null
          ? msg.options
          : {
              ...getDefaultOptions(),
              includeCollectionComments: false,
              includeModeComments: false,
            };
      const typescript = await exportToTypeScript(variables, collections, fileName, options);
      postToUI({ type: 'typescript-result', typescript });
      break;
    }

    case 'github-dispatch': {
      if (!msg.githubOptions) {
        throw new Error('GitHub options are required');
      }

      const exports: Record<string, string> = {};
      const baseOptions = msg.githubOptions.exportOptions;

      if (msg.githubOptions.exportTypes.includes('css')) {
        exports.css = await exportToCss(variables, collections, fileName, {
          ...baseOptions,
          includeCollectionComments:
            baseOptions.includeCollectionComments != null
              ? baseOptions.includeCollectionComments
              : true,
          includeModeComments:
            baseOptions.includeModeComments != null ? baseOptions.includeModeComments : true,
        });
      }

      if (msg.githubOptions.exportTypes.includes('scss')) {
        exports.scss = await exportToScss(variables, collections, fileName, {
          ...baseOptions,
          includeCollectionComments:
            baseOptions.includeCollectionComments != null
              ? baseOptions.includeCollectionComments
              : true,
          includeModeComments: false,
        });
      }

      if (msg.githubOptions.exportTypes.includes('json')) {
        exports.json = await exportToJson(variables, collections, baseOptions);
      }

      if (msg.githubOptions.exportTypes.includes('typescript')) {
        exports.typescript = await exportToTypeScript(variables, collections, fileName, {
          ...baseOptions,
          includeCollectionComments: false,
          includeModeComments: false,
        });
      }

      await sendGitHubDispatch(msg.githubOptions, exports, fileName);
      postToUI({
        type: 'github-dispatch-success',
        message: 'Successfully sent to GitHub! The workflow should start shortly.',
      });
      break;
    }

    case 'resize-window': {
      const width = msg.width ?? UI_WIDTH;
      const height = msg.height;
      figma.ui.resize(width, height);
      break;
    }

    case 'cancel': {
      figma.closePlugin();
      break;
    }

    default: {
      console.warn('Unknown message type:', (msg as { type: string }).type);
      break;
    }
  }
}

// Initialize plugin
figma.showUI(__html__, { width: UI_WIDTH, height: UI_HEIGHT_COMPACT });

figma.ui.onmessage = async (msg: PluginMessage) => {
  try {
    await handleMessage(msg);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    postToUI({
      type: 'error',
      message: `Export failed: ${errorMessage}`,
    });
    console.error('Plugin error:', error);
  }
};
