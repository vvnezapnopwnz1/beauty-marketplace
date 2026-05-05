const parser = require('@typescript-eslint/parser');

module.exports = [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: parser,
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
    },
  },
];