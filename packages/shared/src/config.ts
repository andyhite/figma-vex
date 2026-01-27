/**
 * Shared configuration constants
 */

/**
 * Plugin UI configuration
 */
export const UI_CONFIG = {
  /** Default width of the plugin UI */
  WIDTH: 520,
  /** Height when no output is shown */
  HEIGHT_COMPACT: 600,
} as const;

/**
 * Value resolution configuration
 */
export const RESOLUTION_CONFIG = {
  /** Maximum depth for variable alias resolution to prevent circular references */
  MAX_ALIAS_DEPTH: 10,
} as const;

/**
 * GitHub API configuration
 */
export const GITHUB_API_CONFIG = {
  /** Base URL for GitHub API */
  BASE_URL: 'https://api.github.com',
  /** API version header value */
  API_VERSION: '2022-11-28',
} as const;

/**
 * Default CSS selector for variable exports
 */
export const DEFAULT_CSS_SELECTOR = ':root';
