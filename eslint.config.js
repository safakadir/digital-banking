import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

export default [
  // Base JavaScript config
  js.configs.recommended,
  
  // TypeScript files configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // Base ESLint recommended rules
      ...js.configs.recommended.rules,
      
      // TypeScript recommended rules (base only - no type checking required)
      ...tsPlugin.configs.recommended.rules,
      
      // Custom overrides (only non-type-checking rules)
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      // Removed type-checking rules for monorepo compatibility
      
      // Code quality rules
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'prefer-destructuring': ['error', {
        'array': true,
        'object': true
      }, {
        'enforceForRenamedProperties': false
      }],
      
      // Prettier rules
      'prettier/prettier': 'error',
      
      // General rules
      'no-console': 'warn',
      'no-unused-vars': 'off', // Turn off base rule as it can report incorrect errors
      'no-debugger': 'error',
      'no-alert': 'error',
      'consistent-return': 'off',
      'curly': ['error', 'all'],
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-return-assign': 'error',
    },
  },
  
  // Prettier configuration (disable conflicting rules)
  prettierConfig,
  
  // Ignore patterns
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/*.config.ts',
      '**/webpack.config.js',
    ],
  },
];
