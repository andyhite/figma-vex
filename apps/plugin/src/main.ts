/// <reference types="@figma/plugin-typings" />

import type { PluginMessage, UIMessage, StyleCollection, PluginSettings } from '@figma-vex/shared';
import { UI_CONFIG } from '@figma-vex/shared';
import { exportToCss } from './exporters/cssExporter';
import { exportToScss } from './exporters/scssExporter';
import { exportToJson } from './exporters/jsonExporter';
import { exportToTypeScript } from './exporters/typescriptExporter';
import { sendGitHubDispatch, generateExports, fetchAllStyles, resolveExpression } from './services';
import { mergeWithDefaults } from './utils/optionDefaults';
import { parseDescription } from './utils/descriptionParser';
import { DEFAULT_CONFIG } from '@figma-vex/shared';
import { toCustomCssName } from './utils/globMatcher';
import { lookupByPath } from './utils/variableLookup';
import type { NameFormatRule } from '@figma-vex/shared';

const SETTINGS_KEY = 'figma-vex-settings';

/**
 * Sends a message to the UI.
 */
function postToUI(message: UIMessage): void {
  figma.ui.postMessage(message);
}

/**
 * Syncs calculated values back to Figma variables.
 * Called when syncCalculations option is enabled during export.
 */
async function syncCalculatedValues(
  variables: Variable[],
  collections: VariableCollection[],
  prefix: string
): Promise<{ synced: number; failed: number; warnings: string[] }> {
  let synced = 0;
  let failed = 0;
  const warnings: string[] = [];

  for (const collection of collections) {
    const collectionVars = variables.filter((v) => v.variableCollectionId === collection.id);

    for (const variable of collectionVars) {
      const descConfig = parseDescription(variable.description);
      if (!descConfig.expression) continue;

      const config = { ...DEFAULT_CONFIG, ...descConfig };

      for (const mode of collection.modes) {
        const result = await resolveExpression(config, mode.modeId, variables, collections, prefix);

        if (result.value !== null && result.warnings.length === 0) {
          try {
            await variable.setValueForMode(mode.modeId, result.value);
            synced++;
          } catch (error) {
            failed++;
            const errorMsg = error instanceof Error ? error.message : String(error);
            warnings.push(`Failed to update ${variable.name}: ${errorMsg}`);
          }
        } else if (result.warnings.length > 0) {
          failed++;
          warnings.push(...result.warnings.map((w) => `${variable.name}: ${w}`));
        }
      }
    }
  }

  return { synced, failed, warnings };
}

/**
 * Syncs variable code syntax (CSS variable names) to Figma's codeSyntax.WEB field.
 * Transforms variable names using matching rules and writes them to Figma.
 *
 * @param variables - All variables to sync
 * @param rules - Name format rules to apply
 * @param prefix - Optional CSS variable prefix
 * @returns Counts of synced and skipped variables
 */
async function syncVariableCodeSyntax(
  variables: Variable[],
  rules: NameFormatRule[],
  prefix?: string
): Promise<{ synced: number; skipped: number }> {
  let synced = 0;
  let skipped = 0;

  for (const variable of variables) {
    const customName = toCustomCssName(variable.name, rules);

    if (customName) {
      // Apply prefix if set, add -- for CSS custom property
      const cssVarName = prefix ? `--${prefix}-${customName}` : `--${customName}`;

      try {
        variable.setVariableCodeSyntax('WEB', cssVarName);
        synced++;
      } catch {
        // Silently skip on error (e.g., variable is read-only)
        skipped++;
      }
    } else {
      skipped++; // No matching rule, leave codeSyntax unchanged
    }
  }

  return { synced, skipped };
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

    case 'get-numeric-variables': {
      const numericVars = variables
        .filter((v) => v.resolvedType === 'FLOAT')
        .map((v) => {
          const collection = collections.find((c) => c.id === v.variableCollectionId);
          const path = collection ? `${collection.name}/${v.name}` : v.name;
          return {
            id: v.id,
            name: v.name,
            path,
          };
        });
      postToUI({
        type: 'numeric-variables-list',
        variables: numericVars,
      });
      break;
    }

    case 'get-variable-names': {
      const variableNames = variables.map((v) => {
        const collection = collections.find((c) => c.id === v.variableCollectionId);
        return collection ? `${collection.name}/${v.name}` : v.name;
      });
      postToUI({
        type: 'variable-names-list',
        names: variableNames,
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
      // Sync calculated values to Figma if enabled
      if (options.syncCalculations) {
        await syncCalculatedValues(variables, collections, options.prefix ?? '');
      }
      // Sync code syntax to Figma if enabled
      if (options.syncCodeSyntax && options.nameFormatRules?.length) {
        await syncVariableCodeSyntax(variables, options.nameFormatRules, options.prefix);
      }
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
      // Sync calculated values to Figma if enabled
      if (options.syncCalculations) {
        await syncCalculatedValues(variables, collections, options.prefix ?? '');
      }
      // Sync code syntax to Figma if enabled
      if (options.syncCodeSyntax && options.nameFormatRules?.length) {
        await syncVariableCodeSyntax(variables, options.nameFormatRules, options.prefix);
      }
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
      // Sync calculated values to Figma if enabled
      if (options.syncCalculations) {
        await syncCalculatedValues(variables, collections, options.prefix ?? '');
      }
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
      // Sync calculated values to Figma if enabled
      if (options.syncCalculations) {
        await syncCalculatedValues(variables, collections, options.prefix ?? '');
      }
      let styles: StyleCollection | undefined;
      if (options.includeStyles) {
        styles = await fetchAllStyles();
      }
      const typescript = await exportToTypeScript(
        variables,
        collections,
        fileName,
        options,
        styles
      );
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
        const collectionVars = variables.filter((v) => v.variableCollectionId === collection.id);

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
              warnings.push(...result.warnings.map((w) => `${variable.name}: ${w}`));
            }
          }
        }
      }

      postToUI({ type: 'sync-result', synced, failed, warnings });
      break;
    }

    case 'sync-code-syntax': {
      const result = await syncVariableCodeSyntax(
        variables,
        msg.options.nameFormatRules,
        msg.options.prefix
      );
      postToUI({
        type: 'sync-code-syntax-result',
        synced: result.synced,
        skipped: result.skipped,
      });
      break;
    }

    case 'resolve-collection-names': {
      const results = msg.names.map((name) => {
        const collection = collections.find((c) => c.name === name);
        return {
          name,
          id: collection?.id ?? null,
        };
      });
      postToUI({
        type: 'collection-names-resolved',
        results,
      });
      break;
    }

    case 'resolve-variable-path': {
      try {
        const entry = lookupByPath(msg.path, variables, collections);
        postToUI({
          type: 'variable-path-resolved',
          path: msg.path,
          id: entry?.variable.id ?? null,
        });
      } catch {
        // If lookup fails (e.g., ambiguous path), return null
        postToUI({
          type: 'variable-path-resolved',
          path: msg.path,
          id: null,
        });
      }
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
