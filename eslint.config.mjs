import eslint from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import eslintPluginImport from 'eslint-plugin-import'
import prettier from 'eslint-plugin-prettier/recommended'
import eslintPluginPromise from 'eslint-plugin-promise'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  globalIgnores(['dist/**/*', 'examples/**/*']),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettier,
  eslintPluginPromise.configs['flat/recommended'],
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      eslintPluginImport.flatConfigs.recommended,
      eslintPluginImport.flatConfigs.typescript
    ],
    rules: {
      'import/order': [
        'error',
        {
          'newlines-between': 'always'
        }
      ]
    }
  },
  {
    languageOptions: {
      globals: {
        ...Object.fromEntries(
          Object.entries(globals.browser).map(([key]) => [key, 'off'])
        ),
        ...globals.commonjs
      },

      parser: tsParser
    },

    rules: {
      'prettier/prettier': 'error',

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off'
    }
  }
)
