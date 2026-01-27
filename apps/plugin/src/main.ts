/// <reference types="@figma/plugin-typings" />

import type { PluginMessage, UIMessage, StyleCollection, PluginSettings } from '@figma-vex/shared';
import { UI_CONFIG } from '@figma-vex/shared';

const SETTINGS_KEY = 'figma-vex-settings';
import { exportToCss } from './exporters/cssExporter';
import { exportToScss } from './exporters/scssExporter';
import { exportToJson } from './exporters/jsonExporter';
import { exportToTypeScript } from './exporters/typescriptExporter';
import { sendGitHubDispatch, generateExports, fetchAllStyles, resolveExpression } from './services';
import { mergeWithDefaults } from './utils/optionDefaults';
import { parseDescription } from './utils/descriptionParser';
import { DEFAULT_CONFIG } from '@figma-vex/shared';

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

    case 'get-styles': {
      const styles = await fetchAllStyles();
      postToUI({
        type: 'styles-list',
        styles: {
          paintCount: styles.paint.length,
          textCount: styles.text.length,
          effectCount: styles.effect.length,
          gridCount: styles.grid.length,
        },
      });
      break;
    }

    case 'export-css': {
      const options = mergeWithDefaults('css', msg.options);
      let styles: StyleCollection | undefined;
      if (options.includeStyles) {
        styles = await fetchAllStyles();
      }
      const css = await exportToCss(variables, collections, fileName, options, styles);
      postToUI({ type: 'css-result', css });
      break;
    }

    case 'export-scss': {
      const options = mergeWithDefaults('scss', msg.options);
      let styles: StyleCollection | undefined;
      if (options.includeStyles) {
        styles = await fetchAllStyles();
      }
      const scss = await exportToScss(variables, collections, fileName, options, styles);
      postToUI({ type: 'scss-result', scss });
      break;
    }

    case 'export-json': {
      const options = mergeWithDefaults('json', msg.options);
      let styles: StyleCollection | undefined;
      if (options.includeStyles) {
        styles = await fetchAllStyles();
      }
      const json = await exportToJson(variables, collections, options, styles);
      postToUI({ type: 'json-result', json });
      break;
    }

    case 'export-typescript': {
      const options = mergeWithDefaults('typescript', msg.options);
      let styles: StyleCollection | undefined;
      if (options.includeStyles) {
        styles = await fetchAllStyles();
      }
      const typescript = await exportToTypeScript(variables, collections, fileName, options, styles);
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

    case 'save-settings': {
      const settingsJson = JSON.stringify(msg.settings);
      figma.root.setPluginData(SETTINGS_KEY, settingsJson);
      break;
    }

    case 'load-settings': {
      const settingsJson = figma.root.getPluginData(SETTINGS_KEY);
      let settings: PluginSettings | null = null;
      if (settingsJson) {
        try {
          settings = JSON.parse(settingsJson) as PluginSettings;
        } catch {
          console.warn('Failed to parse saved settings');
        }
      }
      postToUI({ type: 'settings-loaded', settings });
      break;
    }

    case 'sync-calculations': {
      const options = mergeWithDefaults('css', msg.options);
      const prefix = options.prefix ?? '';

      let synced = 0;
      let failed = 0;
      const warnings: string[] = [];

      for (const collection of collections) {
        const collectionVars = variables.filter(
          (v) => v.variableCollectionId === collection.id
        );

        for (const variable of collectionVars) {
          const descConfig = parseDescription(variable.description);
          if (!descConfig.expression) continue;

          const config = { ...DEFAULT_CONFIG, ...descConfig };

          for (const mode of collection.modes) {
            const result = await resolveExpression(
              config,
              mode.modeId,
              variables,
              collections,
              prefix
            );

            if (result.value !== null && result.warnings.length === 0) {
              try {
                await variable.setValueForMode(mode.modeId, result.value);
                synced++;
              } catch (error) {
                failed++;
                const errorMsg = error instanceof Error ? error.message : String(error);
                warnings.push(`Failed to update ${variable.name}: ${errorMsg}`);
              }
            } else {
              failed++;
              warnings.push(
                ...result.warnings.map((w) => `${variable.name}: ${w}`)
              );
            }
          }
        }
      }

      postToUI({ type: 'sync-result', synced, failed, warnings });
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
