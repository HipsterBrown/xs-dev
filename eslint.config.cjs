const loveConfig = require('eslint-config-love')

module.exports = [
  {
    ...loveConfig,
    files: ['src/**/*.ts'],
    ignores: ['**/__tests__/**'],
  },
]
