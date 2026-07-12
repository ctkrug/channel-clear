import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        location: 'readonly',
        matchMedia: 'readonly',
        devicePixelRatio: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        performance: 'readonly',
        URLSearchParams: 'readonly',
        ResizeObserver: 'readonly',
        getComputedStyle: 'readonly',
      },
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        beforeEach: 'readonly',
        it: 'readonly',
        HTMLCanvasElement: 'readonly',
        Event: 'readonly',
      },
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
];
