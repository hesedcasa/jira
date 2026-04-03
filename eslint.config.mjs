import {includeIgnoreFile} from '@eslint/compat'
import oclif from 'eslint-config-oclif'
import prettier from 'eslint-config-prettier'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const gitignorePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.gitignore')

export default [
  includeIgnoreFile(gitignorePath),
  {ignores: ['coverage/']},
  ...oclif,
  prettier,
  // eslint-import-resolver-typescript crashes with ESLint 10 (falls back to the
  // typescript compiler package which has an invalid resolver interface).
  // Disable the affected import rules until eslint-config-oclif is updated.
  // mocha/consistent-spacing-between-blocks uses context.getSourceCode() removed in ESLint 10.
  {
    plugins: {},
    rules: {
      'import/default': 'off',
      'import/export': 'off',
      'import/named': 'off',
      'import/namespace': 'off',
      'import/no-deprecated': 'off',
      'import/no-duplicates': 'off',
      'import/no-extraneous-dependencies': 'off',
      'import/no-mutable-exports': 'off',
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
      'import/no-unresolved': 'off',
      'mocha/consistent-spacing-between-blocks': 'off',
    },
  },
]
