import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Ignore patterns
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/.cache/**',
      '**/node_modules/**',
      '**/*.gen.ts',
      '**/routeTree.gen.ts',
      'extension/.wxt/**',
      'extension/.output/**',
      'extension/chrome/**',
      'web/.wrangler/**',
      'web/worker/db/migrations/**',
      '**/*.d.ts',
      'vite.config.ts',
      'drizzle.config.ts',
      'wxt.config.ts',
      '**/*.config.js',
      '**/*.config.ts',
      '**/*.config.mjs',
      'packages/example-configs/**',
    ],
  },

  // Base configuration
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // TypeScript specific configuration without project references
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-empty-object-type': 'off',

      // General rules matching VSCode settings
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-body-style': ['error', 'as-needed'],
    },
  },

  // React specific configuration for .tsx files
  {
    files: ['**/*.{tsx,jsx}'],
    rules: {
      // React specific rules can be added here
    },
  },

  // Disable style rules that conflict with Prettier
  prettierConfig
);
