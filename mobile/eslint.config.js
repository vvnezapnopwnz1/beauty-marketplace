const parser = require('@typescript-eslint/parser');

module.exports = [
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/shared/theme/**'],
    languageOptions: {
      parser: parser,
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'no-restricted-syntax': [
        'warn',
        {
          selector: "Literal[value=/^#(?:[0-9a-fA-F]{3}){1,2}$/]",
          message: 'Use theme tokens/colors instead of hardcoded hex',
        },
      ],
    },
  },
];