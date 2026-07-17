import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'test-results/**', '.netlify/**'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['error', {argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none'}],
      'no-empty': ['error', {allowEmptyCatch: true}],
    },
  },
  {
    files: ['spec/**/*.js', 'e2e/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
  },
];
