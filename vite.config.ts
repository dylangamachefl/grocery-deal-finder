import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/grocery-deal-finder/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env': {
      API_KEY: JSON.stringify(process.env.API_KEY),
    },
  },
  optimizeDeps: {
    exclude: ['@xenova/transformers'],
  },
});
