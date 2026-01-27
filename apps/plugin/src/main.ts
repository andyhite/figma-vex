/// <reference types="@figma/plugin-typings" />

import type { PluginMessage, UIMessage } from '@figma-vex/shared';
import { UI_CONFIG } from '@figma-vex/shared';
import { exportToCss } from './exporters/cssExporter';
import { exportToScss } from './exporters/scssExporter';
import { exportToJson } from './exporters/jsonExporter';
import { exportToTypeScript } from './exporters/typescriptExporter';
import { sendGitHubDispatch, generateExports } from './services';
import { mergeWithDefaults } from './utils/optionDefaults';

/**
 * Sends a message to the UI.
 */
function postToUI(message: UIMessage): void {
  figma.ui.postMessage(message);
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
      const options = mergeWithDefaults('css', msg.options);
      const css = await exportToCss(variables, collections, fileName, options);
      postToUI({ type: 'css-result', css });
      break;
    }

    case 'export-scss': {
      const options = mergeWithDefaults('scss', msg.options);
      const scss = await exportToScss(variables, collections, fileName, options);
      postToUI({ type: 'scss-result', scss });
      break;
    }

    case 'export-json': {
      const options = mergeWithDefaults('json', msg.options);
      const json = await exportToJson(variables, collections, options);
      postToUI({ type: 'json-result', json });
      break;
    }

    case 'export-typescript': {
      const options = mergeWithDefaults('typescript', msg.options);
      const typescript = await exportToTypeScript(variables, collections, fileName, options);
      postToUI({ type: 'typescript-result', typescript });
      break;
    }

    case 'github-dispatch': {
      if (!msg.githubOptions) {
        throw new Error('GitHub options are required');
      }

      const exports = await generateExports(
        variables,
        collections,
        fileName,
        msg.githubOptions.exportTypes,
        msg.githubOptions.exportOptions
      );

      await sendGitHubDispatch(msg.githubOptions, exports, fileName);
      postToUI({
        type: 'github-dispatch-success',
        message: 'Successfully sent to GitHub! The workflow should start shortly.',
      });
      break;
    }

    case 'resize-window': {
      const width = msg.width ?? UI_CONFIG.WIDTH;
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
figma.showUI(__html__, { width: UI_CONFIG.WIDTH, height: UI_CONFIG.HEIGHT_COMPACT });

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
