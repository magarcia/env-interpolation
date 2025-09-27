# env-interpolation

Recursively resolve `${VAR}` style placeholders in strings, objects, or arrays using environment variables or custom maps.

## Features
- Works with strings, plain objects, and arrays without mutating the original input.
- Falls back to `process.env` automatically; pass your own variable map for custom contexts.
- Supports defaults (`${NAME:Guest}`) including quoted values and nested placeholders.
- Handles nested interpolation across multiple passes while preventing infinite loops.
- Escape placeholders with backslashes (`\\${VAR}`) or disable escaping entirely when needed.
- Ships with full TypeScript definitions and preserves the structural type of the input.

## Installation

```sh
npm install env-interpolation
# or
yarn add env-interpolation
# or
pnpm add env-interpolation
```

**Requirements:**
- Node.js 18 or higher
- ESM-only module (does not support CommonJS `require()`)

## Quick Start

```ts
import { interpolate } from "env-interpolation";

const greeting = interpolate("Hello ${NAME:Guest}!", { NAME: "Ada" });
// "Hello Ada!"

const config = interpolate({
  url: "${API_URL:https://api.example.com}",
  timeout: "${TIMEOUT:5000}",
  features: ["${FEATURE_PRIMARY:alpha}", "${FEATURE_SECONDARY:beta}"],
});
// All placeholders resolved using process.env by default
```

## Placeholder syntax
- ``${VAR}`` — looks up `VAR` in the variable map or `process.env`.
- ``${VAR:Default}`` — uses `Default` when `VAR` is missing or `undefined`.
- ``${VAR:"Quoted value"}`` — quotes let you keep colons or other placeholders in defaults.
- Invalid variable names (anything beyond letters, numbers, and `_`) are left untouched.
- Defaults can contain nested placeholders; they are resolved in subsequent passes.

## API

### `interpolate<T>(content, variables?, options?)`
- `content` (`T extends string | Record<string, unknown> | unknown[]`): value (or structure) to process.
- `variables` (`Record<string, string | undefined>`): optional override map. Defaults to `process.env` when available.
- `options`:
  - `escape` (`boolean`, default `true`): when enabled, a single preceding backslash escapes a placeholder (`\\${VAR}` → `${VAR}`). Disable to treat backslashes as literal characters.

Returns the interpolated value while preserving the original shape and TypeScript type.

### Behavior notes
- Resolution runs up to 10 passes to support nesting while protecting against infinite substitution loops.
- Empty defaults (`${VAR:}`) leave the placeholder intact so you can detect missing configuration.
- Arrays and objects are traversed deeply; non-string primitives are returned untouched.

## Escaping examples

```ts
import { interpolate } from "env-interpolation";

interpolate("Literal \\${PASSWORD}");
// "Literal ${PASSWORD}" (escape enabled, the placeholder is left as-is)

interpolate("Literal \\${PASSWORD}", { PASSWORD: "secret" }, { escape: false });
// "Literal \\secret" (escape disabled, placeholder still resolves)
```

## TypeScript aware
The exported function is fully typed. The returned value retains the structural type of the input, so narrowed types stay intact:

```ts
import { interpolate } from "env-interpolation";

const settings = {
  port: "${PORT:3000}",
  flags: ["${PRIMARY_FLAG:enabled}", "${SECONDARY_FLAG:disabled}"],
} as const;

const result = interpolate(settings);
// result has the same readonly structure as `settings`
```

## Testing & development
- `npm run test` – run the Vitest suite (covers string, object, and array interpolation).
- `npm run lint` – lint sources with ESLint.
- `npm run build` – produce the bundled output via tsup.

## Contributing
Contributions and bug reports are welcome! Read the [CONTRIBUTING.md](CONTRIBUTING.md) guide and adhere to the [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) when participating. Issues and pull requests live at the [GitHub repository](https://github.com/magarcia/env-interpolation).

## License
Released under the [MIT License](LICENSE).
