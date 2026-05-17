import { defineWorkspace } from 'vitest/config';
import path from 'node:path';

const alias = {
  '@': path.resolve(__dirname, 'src'),
};

export default defineWorkspace([
  {
    test: {
      name: 'unit-mock',
      environment: 'node',
      include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    },
    resolve: { alias },
  },
  {
    test: {
      name: 'integration-db',
      environment: 'node',
      include: ['tests/integration-db/**/*.test.ts'],
      testTimeout: 30_000,
    },
    resolve: { alias },
  },
]);
