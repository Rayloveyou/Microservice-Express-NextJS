import nextPlugin from '@next/eslint-plugin-next'

export default [
  {
    ignores: ['node_modules', '.next', 'dist', 'build']
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      '@next/next': nextPlugin
    },
    rules: {
      ...nextPlugin.configs['core-web-vitals'].rules,
      'no-console': 'warn',
      '@next/next/no-img-element': 'off'
    }
  }
]
