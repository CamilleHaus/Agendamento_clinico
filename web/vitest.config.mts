import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the "@/..." alias declared in tsconfig.json. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts', '**/*.spec.tsx'],
    // Component tests opt into jsdom with a `// @vitest-environment jsdom` comment.
    environment: 'node',
  },
});
