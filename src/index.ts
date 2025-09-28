// Default variables source (process.env in Node environments)
const defaults: Record<string, string | undefined> =
  typeof process !== "undefined" ? process.env : {};

/**
 * Plain object type representing a record with string keys and unknown values.
 * Used internally for type-safe object traversal during interpolation.
 */
type PlainObject = Record<string, unknown>;

/**
 * Union type representing all valid input types that can be processed by the interpolate function.
 * Supports strings, plain objects, and arrays for recursive interpolation.
 *
 * @example
 * // String input
 * const stringInput: Input = 'Hello ${NAME:Guest}!';
 *
 * @example
 * // Object input
 * const objectInput: Input = { greeting: 'Hello ${NAME:Guest}!' };
 *
 * @example
 * // Array input
 * const arrayInput: Input = ['${GREETING:Hello}', '${NAME:World}'];
 */
export type Input = string | PlainObject | Array<unknown>;

/**
 * Configuration options for controlling interpolation behavior.
 *
 * @example
 * // Enable escape processing (default)
 * const options: InterpolateOptions = { escape: true };
 * interpolate('Use \\${LITERAL} text', {}, options);
 * // Returns: 'Use ${LITERAL} text'
 *
 * @example
 * // Disable escape processing
 * const options: InterpolateOptions = { escape: false };
 * interpolate('Keep \\${LITERAL} unchanged', {}, options);
 * // Returns: 'Keep \\${LITERAL} unchanged'
 *
 * @example
 * // Custom maximum interpolation passes
 * const options: InterpolateOptions = { maxPasses: 5 };
 * interpolate('${A:${B:${C:default}}}', {}, options);
 * // Limits nested resolution to 5 passes maximum
 */
export interface InterpolateOptions {
  /**
   * Enable escape processing for placeholders. When true, backslashes can be used
   * to escape placeholders: `\\${VAR}` becomes literal `${VAR}` (single escaping).
   * Pairs of backslashes are reduced to single backslashes. Defaults to true.
   */
  escape?: boolean;
  /**
   * Maximum number of interpolation passes to prevent infinite loops with
   * self-referential or deeply nested placeholders. Each pass attempts to
   * resolve all placeholders in the string. Defaults to 10.
   *
   * Lower values can prevent excessive processing time for complex nested
   * structures, while higher values allow for deeper nesting resolution.
   */
  maxPasses?: number;
}

// Precompiled validation regex for variable names (letters, numbers, underscore)
const VAR_NAME_RE = /^[A-Z0-9_]+$/i;
const MAX_INTERPOLATION_PASSES = 10;

/**
 * Removes wrapping quotes from a string if they match (both single or both double).
 * Only removes quotes if the string starts and ends with the same quote type.
 * Preserves mismatched quotes and nested quotes.
 *
 * @param s The string to unquote
 * @returns The string with matching wrapping quotes removed
 *
 * @example
 * unquote('"hello"') // returns: hello
 * unquote("'world'") // returns: world
 * unquote('"mixed\'') // returns: "mixed' (no change)
 * unquote('unquoted') // returns: unquoted (no change)
 */
function unquote(s: string): string {
  return (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
    ? s.slice(1, -1)
    : s;
}

/**
 * Finds the next placeholder in a string of the form `${...}` while supporting
 * nested braces (e.g. `${OUTER:${INNER:Default}}`). Returns metadata needed for
 * replacement or `null` if none found.
 *
 * This function performs brace-balanced parsing to correctly handle nested placeholders
 * within default values. It scans from a given index and returns detailed information
 * about the first complete placeholder found.
 *
 * @param str The string to search for placeholders.
 * @param fromIndex The starting index for the search. Defaults to 0.
 * @returns An object containing placeholder metadata (start, end, inner content, full text) or null if no placeholder is found.
 *
 * @example
 * // Simple placeholder
 * findNextPlaceholder('Hello ${NAME:Guest}!');
 * // Returns: { start: 6, end: 17, inner: 'NAME:Guest', full: '${NAME:Guest}' }
 *
 * @example
 * // Nested placeholder in default value
 * findNextPlaceholder('${GREETING:Hello ${USER:Guest}}');
 * // Returns: { start: 0, end: 30, inner: 'GREETING:Hello ${USER:Guest}', full: '${GREETING:Hello ${USER:Guest}}' }
 *
 * @example
 * // No placeholder found
 * findNextPlaceholder('Just a regular string');
 * // Returns: null
 *
 * @example
 * // Searching from a specific index
 * findNextPlaceholder('${A:1} and ${B:2}', 7);
 * // Returns: { start: 9, end: 14, inner: 'B:2', full: '${B:2}' }
 */
function findNextPlaceholder(
  str: string,
  fromIndex = 0,
): { start: number; end: number; inner: string; full: string } | null {
  let start = -1;
  for (let i = fromIndex; i < str.length - 1; i++) {
    if (str[i] === "$" && str[i + 1] === "{") {
      start = i;
      break;
    }
  }
  if (start === -1) return null;

  // Scan forward counting braces to locate the matching closing `}`
  let braceCount = 1; // we have already seen the opening `${`
  for (let i = start + 2; i < str.length; i++) {
    const ch = str[i];
    if (ch === "{") braceCount++;
    else if (ch === "}") {
      braceCount--;
      if (braceCount === 0) {
        return {
          start,
          end: i,
          // substring without the wrapping `${` and `}`
          inner: str.substring(start + 2, i),
          full: str.substring(start, i + 1),
        };
      }
    }
  }
  return null; // Unbalanced braces – treat as no further placeholders
}

/**
 * Parses the inner content of a placeholder, splitting at the first `:` into
 * variable key and optional default value. Colons appearing later (e.g. inside
 * JSON or quoted strings) are preserved in the default portion.
 */
function parsePlaceholder(inner: string): {
  key: string;
  defaultValue?: string;
} {
  const idx = inner.indexOf(":");
  if (idx === -1) return { key: inner };
  return {
    key: inner.substring(0, idx),
    defaultValue: inner.substring(idx + 1),
  };
}

/**
 * Indicates whether a candidate variable name is valid. Invalid names cause the
 * placeholder to be left unchanged.
 */
function isValidVarName(key: string): boolean {
  return VAR_NAME_RE.test(key);
}

/**
 * Interpolates a single string with the provided variables using recursive placeholder resolution.
 * This is the core string interpolation function that handles the ${VARIABLE:default} syntax.
 *
 * The function supports escape sequences with backslashes, nested placeholder resolution,
 * and iterative processing until no more changes occur. Variable names must contain only
 * letters, numbers, and underscores to be considered valid.
 *
 * @param content The string content to interpolate.
 * @param variables A map of variable names to their string values. Defaults to `process.env`.
 * @param options Configuration options including escape processing behavior.
 * @returns The interpolated string with all placeholders resolved.
 *
 * @example
 * // Basic variable replacement
 * replace('Hello ${NAME:World}!', { NAME: 'Alice' });
 * // Returns: 'Hello Alice!'
 *
 * @example
 * // Using default values
 * replace('Server: ${HOST:localhost}:${PORT:8080}', { HOST: 'api.example.com' });
 * // Returns: 'Server: api.example.com:8080'
 *
 * @example
 * // Nested placeholder resolution
 * replace('${GREETING:Hello ${USER:Guest}}!', { USER: 'Bob' });
 * // Returns: 'Hello Bob!'
 *
 * @example
 * // Escaped placeholders (when escape option is true)
 * replace('Use \\${LITERAL} for literal text', {}, { escape: true });
 * // Returns: 'Use ${LITERAL} for literal text'
 *
 * @example
 * // Invalid variable names are left unchanged
 * replace('${invalid-name:default}', {});
 * // Returns: '${invalid-name:default}'
 */
function replace(
  content: string,
  variables: Record<string, string | undefined> = defaults,
  options: InterpolateOptions = { escape: true },
): string {
  let result = content;
  let previous: string | undefined;
  const { escape = true, maxPasses = MAX_INTERPOLATION_PASSES } = options;

  // Iterate until no more changes (supports nested placeholders resolved via defaults)
  let passes = 0;
  do {
    previous = result;
    passes++;
    if (passes > maxPasses) break;

    let searchFrom = 0;
    let anyChange = false;

    // Process all placeholders in the current string in one pass
    while (true) {
      const match = findNextPlaceholder(result, searchFrom);
      if (!match) break;

      const { start, end, inner, full } = match;
      const { key, defaultValue } = parsePlaceholder(inner);
      // Count preceding backslashes
      let backslashes = 0;
      let cursor = start - 1;
      while (cursor >= 0 && result[cursor] === "\\") {
        backslashes++;
        cursor--;
      }

      if (escape && backslashes > 0 && backslashes % 2 === 1) {
        // Odd number of preceding backslashes escapes placeholder.
        // Consume one backslash for escaping, keep the rest as pairs.
        const remainingBackslashes = Math.floor(backslashes / 2);
        const prefix =
          result.substring(0, start - backslashes) +
          "\\".repeat(remainingBackslashes);
        const literal = result.substring(start, end + 1);
        result = prefix + literal + result.substring(end + 1);
        // Skip past the escaped placeholder to avoid processing it again
        searchFrom = prefix.length + literal.length;
        // Note: escaped placeholders are processed but don't count as "changes" for nested resolution
        continue;
      }

      if (!isValidVarName(key)) {
        // Leave placeholder literal; normalize backslashes (remove one if odd)
        const removeOne = escape && backslashes % 2 === 1 ? 1 : 0;
        result =
          result.substring(0, start - backslashes) +
          "\\".repeat(backslashes - removeOne) +
          "${" +
          result.substring(start + 2);
        // Move search position past this placeholder to avoid infinite loop
        searchFrom = start - backslashes + (backslashes - removeOne) + 2;
        anyChange = true;
        continue;
      }

      const value = variables[key];
      let replacement = full; // default: keep original

      if (value !== undefined) {
        replacement = String(value);
        anyChange = true;
      } else if (defaultValue !== undefined) {
        // Empty default (e.g. ${NAME:}) => keep original placeholder
        if (defaultValue !== "") {
          // Strip wrapping quotes if present (both single and double)
          replacement = unquote(defaultValue);
          anyChange = true;
        }
      }

      // Interpolation path: handle backslashes appropriately
      // For escape mode: pairs of backslashes become single backslashes
      // For non-escape mode: backslashes are kept as-is
      let finalBackslashes = backslashes;
      if (escape && backslashes > 0) {
        finalBackslashes = Math.floor(backslashes / 2);
      }
      const prefix =
        result.substring(0, start - backslashes) +
        "\\".repeat(finalBackslashes);
      result = prefix + replacement + result.substring(end + 1);

      // Continue searching from after the replacement
      searchFrom = prefix.length + replacement.length;
    }

    // If no changes were made in this pass, we're done
    if (!anyChange) break;
  } while (result !== previous);

  return result;
}

function traverse(
  value: unknown,
  replacer: (s: string) => string,
  seen = new WeakMap(),
): unknown {
  if (typeof value === "string") return replacer(value);

  if (value && typeof value === "object") {
    if (seen.has(value as object)) return seen.get(value as object);

    if (Array.isArray(value)) {
      const out: unknown[] = [];
      seen.set(value as object, out);
      for (const item of value as Array<unknown>) {
        out.push(traverse(item, replacer, seen));
      }
      return out;
    }

    const out: Record<string, unknown> = {};
    seen.set(value as object, out);
    for (const k of Object.keys(value as Record<string, unknown>)) {
      out[k] = traverse((value as Record<string, unknown>)[k], replacer, seen);
    }
    return out;
  }

  return value;
}

/**
 * Recursively interpolates string values within a nested input structure using a provided
 * variables map. Supports strings, arrays, and plain objects.
 *
 * Variables are specified using ${VARIABLE_NAME:default_value} syntax. If a variable
 * is not found in the variables map, the default value is used. If no default is
 * provided, the placeholder is left unchanged. The interpolation process supports
 * nested structures and recursive placeholder resolution, allowing defaults to
 * contain their own placeholders.
 *
 * @param content The input to process. May be a string, array, or object graph.
 * @param variables A map of variable names to their string values. Defaults to `process.env`.
 * @param options Configuration options for interpolation behavior.
 * @returns A new structure of the same shape as the input with all strings processed.
 *
 * @example
 * // Simple string interpolation
 * interpolate('Hello ${NAME:Guest}!', { NAME: 'Alice' });
 * // Returns: 'Hello Alice!'
 *
 * @example
 * // Object interpolation
 * interpolate({ greeting: 'Hello ${NAME:Guest}!' }, { NAME: 'Bob' });
 * // Returns: { greeting: 'Hello Bob!' }
 *
 * @example
 * // Array interpolation with defaults
 * interpolate(['${GREETING:Hello}', '${NAME:World}'], { NAME: 'TypeScript' });
 * // Returns: ['Hello', 'TypeScript']
 *
 * @example
 * // Nested placeholder resolution
 * interpolate('${MESSAGE:Hello ${USER:Guest}}', { USER: 'Alice' });
 * // Returns: 'Hello Alice'
 *
 * @example
 * // Complex object with multiple placeholders
 * interpolate({
 *   title: '${TITLE:Welcome}',
 *   message: 'Hello ${NAME:Guest}, you have ${COUNT:0} messages',
 *   meta: { env: '${NODE_ENV:development}' }
 * }, { NAME: 'John', COUNT: '5' });
 * // Returns: { title: 'Welcome', message: 'Hello John, you have 5 messages', meta: { env: 'development' } }
 *
 * @example
 * // Using process.env (default variables source)
 * process.env.API_URL = 'https://api.example.com';
 * interpolate('Connecting to ${API_URL:localhost}');
 * // Returns: 'Connecting to https://api.example.com'
 */
export function interpolate<T extends Input>(
  content: T,
  variables: Record<string, string | undefined> = defaults,
  options?: InterpolateOptions,
): T {
  const replacer = (str: string) => replace(str, variables, options);
  return traverse(content, replacer) as T;
}

// Export internal functions for testing
export { findNextPlaceholder, replace };
