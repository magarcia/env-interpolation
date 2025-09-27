// Default variables source (process.env in Node environments)
const defaults: Record<string, string | undefined> =
  typeof process !== "undefined" ? process.env : {};

// Public input shape supported by interpolate
type PlainObject = Record<string, unknown>;
export type Input = string | PlainObject | Array<unknown>;

export interface InterpolateOptions {
  /** Enable escape processing: `\\${VAR}` becomes literal `${VAR}` (single escaping). */
  escape?: boolean;
}

// Precompiled validation regex for variable names (letters, numbers, underscore)
const VAR_NAME_RE = /^[A-Z0-9_]+$/i;
const MAX_INTERPOLATION_PASSES = 10;

/**
 * Finds the next placeholder in a string of the form `${...}` while supporting
 * nested braces (e.g. `${OUTER:${INNER:Default}}`). Returns metadata needed for
 * replacement or `null` if none found.
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
 * Interpolates a string with the provided variables.
 *
 * @param content The string content to interpolate.
 * @param variables The variables to use for interpolation.
 * @returns The interpolated string.
 */
function replace(
  content: string,
  variables: Record<string, string | undefined> = defaults,
  options: InterpolateOptions = { escape: true },
): string {
  let result = content;
  let previous: string | undefined;
  const { escape = true } = options;

  // Iterate until no more changes (supports nested placeholders resolved via defaults)
  let passes = 0;
  do {
    previous = result;
    passes++;
    if (passes > MAX_INTERPOLATION_PASSES) break;

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
        const removeOne = backslashes % 2 === 1 ? 1 : 0;
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
          // Strip wrapping quotes if present
          replacement = defaultValue.replace(/^"|"$/g, "");
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

function traverse(value: unknown, replacer: (str: string) => string): unknown {
  if (typeof value === "string") return replacer(value);

  if (Array.isArray(value)) {
    return value.map((item) => traverse(item, replacer));
  }

  if (typeof value === "object" && value !== null) {
    const input = value as PlainObject;
    const output: PlainObject = {};
    for (const key of Object.keys(input)) {
      output[key] = traverse(input[key], replacer);
    }
    return output;
  }

  return value;
}

/**
 * Recursively interpolates string values within a nested input structure using a provided
 * variables map. Supports strings, arrays, and plain objects.
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
