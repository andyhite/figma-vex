/**
 * DTCG to TypeScript converter
 */

import type { DTCGDocument, DTCGConversionSettings } from '../types';
import { formatCssName } from '../transforms/names';

/**
 * Generates the TypeScript file header comment.
 */
function generateTypeScriptHeader(fileName: string, customHeader?: string): string {
  if (customHeader) {
    return customHeader + '\n';
  }
  return [
    '/**',
    ' * Auto-generated TypeScript types for CSS Custom Properties',
    ` * Exported from Figma: ${fileName}`,
    ` * Generated: ${new Date().toISOString()}`,
    ' */',
    '',
  ].join('\n');
}

/**
 * Collects all CSS variable names from a token group.
 */
function collectVariableNames(
  group: Record<string, unknown>,
  path: string[],
  options: DTCGConversionSettings,
  names: string[]
): void {
  for (const [key, value] of Object.entries(group)) {
    const currentPath = [...path, key];

    if (value && typeof value === 'object' && '$type' in value && '$value' in value) {
      // It's a token
      const cssName = formatCssName(currentPath, options);
      names.push(`  | "--${cssName}"`);
    } else if (value && typeof value === 'object') {
      // It's a nested group - recurse
      collectVariableNames(value as Record<string, unknown>, currentPath, options, names);
    }
  }
}

/**
 * Converts a DTCG document to TypeScript type definitions.
 */
export function convertToTypeScript(
  document: DTCGDocument,
  options: DTCGConversionSettings
): string {
  const fileName = document.$metadata?.figmaFile || 'Figma';
  const lines: string[] = [
    generateTypeScriptHeader(fileName, options.headerBanner),
    'export type CSSVariableName =',
  ];

  const variableNames: string[] = [];

  // Filter collections if specified
  const collections = options.selectedCollections
    ? Object.fromEntries(
        Object.entries(document.collections).filter(([name]) =>
          options.selectedCollections!.includes(name)
        )
      )
    : document.collections;

  // Determine whether to include collection name in path
  const includeCollectionName = options.includeCollectionName ?? true;

  // Collect variable names from collections
  for (const [collectionName, collectionGroup] of Object.entries(collections)) {
    collectVariableNames(
      collectionGroup as Record<string, unknown>,
      includeCollectionName ? [collectionName] : [],
      options,
      variableNames
    );
  }

  // Collect style variable names if in variables mode
  if (options.includeStyles && document.$styles && options.styleOutputMode !== 'classes') {
    const styleTypes = options.styleTypes || ['paint', 'text', 'effect', 'grid'];

    for (const styleType of styleTypes) {
      const styleGroup = document.$styles[styleType as keyof typeof document.$styles];
      if (styleGroup) {
        collectVariableNames(
          styleGroup as Record<string, unknown>,
          [styleType],
          options,
          variableNames
        );
      }
    }
  }

  if (variableNames.length === 0) {
    return '// No variables found in this file';
  }

  lines.push(...variableNames);
  lines.push(';');
  lines.push('');
  lines.push("declare module 'csstype' {");
  lines.push('  interface Properties {');
  lines.push('    [key: CSSVariableName]: string | number;');
  lines.push('  }');
  lines.push('}');

  // Add style class name types if in classes mode
  if (options.includeStyles && document.$styles && options.styleOutputMode === 'classes') {
    const classNames: string[] = [];
    const styleTypes = options.styleTypes || ['paint', 'text', 'effect', 'grid'];

    // Collect class names from styles
    for (const styleType of styleTypes) {
      const styleGroup = document.$styles[styleType as keyof typeof document.$styles];
      if (styleGroup) {
        collectVariableNames(
          styleGroup as Record<string, unknown>,
          [styleType],
          options,
          classNames
        );
      }
    }

    if (classNames.length > 0) {
      // Transform variable names to class names
      const transformedClassNames = classNames.map((name) => {
        // Remove the "--" prefix and convert to class name format
        const varName = name.replace(/^\s*\|\s*"--/, '').replace(/"$/, '');
        const className = varName.replace(/-/g, '-');
        return `  | "${className}"`;
      });

      lines.push('');
      lines.push('export type StyleClassName =');
      lines.push(...transformedClassNames);
      lines.push(';');
    }
  }

  return lines.join('\n');
}
