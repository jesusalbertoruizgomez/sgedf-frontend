/**
 * Configuración de ESLint (formato "flat config", ESLint 9).
 * Define las reglas de calidad y estilo que debe cumplir el código fuente del SGEDF.
 */
'use strict';

const js = require('@eslint/js');
const globals = require('globals');

/** Reglas comunes a todo el código JavaScript del proyecto. */
const reglasComunes = {
  eqeqeq: ['error', 'always'],
  curly: ['error', 'all'],
  'no-var': 'error',
  'prefer-const': 'error',
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-new-func': 'error',
  'no-alert': 'error',
  'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
  'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  'consistent-return': 'error',
  'default-case': 'error',
  'no-shadow': 'error',
  strict: ['error', 'function'],
};

module.exports = [
  {
    ignores: ['node_modules/**'],
  },
  js.configs.recommended,
  {
    // Código del navegador: scripts clásicos que comparten el espacio de nombres SGEDF.
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser },
    },
    rules: reglasComunes,
  },
  {
    // Código que se ejecuta en Node.js: servidor de desarrollo, pruebas y configuración.
    files: ['servidor.js', 'eslint.config.js', 'pruebas/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: { ...reglasComunes, strict: ['error', 'global'], 'no-console': 'off' },
  },
];
