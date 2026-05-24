// .eslintrc.js — Wave 0 (plan 01-01)
//
// Pitfall 6 enforcement: forbid hand-rolled '+91' phone-number construction.
// The single allowed path to E.164 is toE164(input, 'IN') from src/utils/phone.ts
// (lands in plan 01-03). The current LoginScreen.tsx `+91${digits}` template
// literal on line ~85 is the legacy violation this rule is designed to flag;
// plan 01-04 removes it.

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  env: { es2022: true, node: true, browser: true },
  ignorePatterns: ['node_modules/', '.expo/', 'android/', 'ios/', 'dist/', 'web-build/'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        // Block string concat literals like '+91' + digits
        selector: "BinaryExpression[operator='+'] > Literal[value=/^\\+91/]",
        message:
          "Don't hand-concatenate '+91'. Use toE164(input, 'IN') from src/utils/phone.ts (Pitfall 6).",
      },
      {
        // Block template literals like `+91${digits}` (cooked text starts with +91)
        selector: "TemplateLiteral > TemplateElement:first-child[value.cooked=/^\\+91/]",
        message:
          "Don't hand-build E.164 with a `+91${...}` template. Use toE164(input, 'IN') from src/utils/phone.ts (Pitfall 6).",
      },
    ],
  },
};
