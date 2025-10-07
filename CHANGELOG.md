## [1.1.1](https://github.com/magarcia/env-interpolation/compare/v1.1.0...v1.1.1) (2025-10-07)

### Bug Fixes

- add issues write permission to dependency-check workflow ([99164a2](https://github.com/magarcia/env-interpolation/commit/99164a2fd0900563fda3e19ff0fe7739ca462b44))
- remove GitHub Discussions requirement from release config ([d52cf5a](https://github.com/magarcia/env-interpolation/commit/d52cf5a1e67c6a37def33601f1b64bd22c2907b7))

# [1.1.0](https://github.com/magarcia/env-interpolation/compare/v1.0.0...v1.1.0) (2025-09-28)

### Bug Fixes

- add missing maxPasses docs and fix semantic-release template ([1bd3ce8](https://github.com/magarcia/env-interpolation/commit/1bd3ce84f647234777fb4037696cbdb493cb7a96))
- backslash handling consistency for invalid placeholders ([b72ad09](https://github.com/magarcia/env-interpolation/commit/b72ad098f7cf85d40c1c9f5d9703f071800f3cef))
- correct import examples in documentation ([9d42ed5](https://github.com/magarcia/env-interpolation/commit/9d42ed5d70f159d9dd4c3ad19806fa580a1abc89))
- integrate eslint-config-prettier to disable conflicting rules ([f1f2dec](https://github.com/magarcia/env-interpolation/commit/f1f2dec2829508eb3e23a165f449e7664b41d170))
- prevent traversal of inherited object properties ([d28b1a0](https://github.com/magarcia/env-interpolation/commit/d28b1a08d553e88a2c7ea548c979d31367d7499f))
- remove node:process import for universal compatibility ([d13801f](https://github.com/magarcia/env-interpolation/commit/d13801f261904a81fef1347a5a668918ecb3499d))
- remove redundant TypeScript ESLint dependencies ([95da705](https://github.com/magarcia/env-interpolation/commit/95da705cd74476618d9051c0e2888014618d1419))
- resolve ESLint flat-config plugin mismatch ([f6d2b24](https://github.com/magarcia/env-interpolation/commit/f6d2b24dd4f63b6f1b3fcfd15fdec22f3b00f37d))
- resolve MAX_INTERPOLATION_PASSES counting placeholders instead of passes ([75baa0c](https://github.com/magarcia/env-interpolation/commit/75baa0c75110545814e74e0c7182d79f6077e885))
- respect escape option for invalid placeholders ([0a90ec3](https://github.com/magarcia/env-interpolation/commit/0a90ec3036d12784cf4c6227400db5835424951b))

### Features

- add CommonJS support alongside ESM ([cb2172d](https://github.com/magarcia/env-interpolation/commit/cb2172debb844a2e1d8462eebeda4a28b9d4f22c))
- add cycle-safe object traversal ([256071f](https://github.com/magarcia/env-interpolation/commit/256071f01c663b0db52896cd8a63ef2c0ad683ab))
- add linting to pre-push hook ([bfbc490](https://github.com/magarcia/env-interpolation/commit/bfbc490a61e608fec022d9ca2fde3fd7d16ceca7))
- enable npm provenance for supply chain security ([76ff057](https://github.com/magarcia/env-interpolation/commit/76ff057dc9cff8cb83dc97520155ed84d287f563))
- hide internal helpers from public API ([da36741](https://github.com/magarcia/env-interpolation/commit/da3674196705859515f9190301acf013fee171bc))
- make interpolation pass limit configurable ([25f86ab](https://github.com/magarcia/env-interpolation/commit/25f86abc78812515c64a245efc7b98bca42a8acd))
- support both single and double quotes in defaults ([b65837e](https://github.com/magarcia/env-interpolation/commit/b65837e128e849c101d06d1a5b0db196b32912cf))

# 1.0.0 (2025-09-27)

### Features

- initial commit ([3dd7ea4](https://github.com/magarcia/env-interpolation/commit/3dd7ea44eeb02f2e1b21d89c21817b730fbc6342))
