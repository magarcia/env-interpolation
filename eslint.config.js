import jsdoc from "eslint-plugin-jsdoc";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["dist", "coverage"],
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    plugins: {
      jsdoc,
      prettier,
    },
    rules: {
      "prettier/prettier": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      // JSDoc consistency rules (errors)
      "jsdoc/check-param-names": "warn",
      "jsdoc/check-tag-names": "error",
      "jsdoc/check-types": "error",
      "jsdoc/valid-types": "error",
      // JSDoc documentation quality rules (warnings)
      "jsdoc/require-param-description": "warn",
      "jsdoc/require-returns-description": "warn",
      "jsdoc/require-jsdoc": [
        "warn",
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
          publicOnly: true,
        },
      ],
      // TypeScript-specific JSDoc settings
      "jsdoc/no-types": "error", // Types in TS files are redundant
      "jsdoc/require-param-type": "off",
      "jsdoc/require-returns-type": "off",
    },
  },
  prettierConfig, // Must be last to disable conflicting rules
];
