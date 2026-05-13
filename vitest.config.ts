import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    env: { NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: 'demo' },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
