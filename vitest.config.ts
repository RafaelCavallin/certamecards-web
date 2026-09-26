import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['src/test-setup.ts'],
    isolate: true,
    coverage: {
      exclude: [
        'src/main.ts',
        'src/app/app.config.ts',
        'src/environments/**',
        'src/**/*.routes.ts',
        'src/**/fixtures/**',
        'src/test-setup.ts',
        'src/app/testing/**',
      ],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
        'src/app/core/{scheduler,study,sync,auth,library}/**': {
          lines: 90,
          branches: 90,
          functions: 90,
          statements: 90,
        },
      },
    },
  },
});
