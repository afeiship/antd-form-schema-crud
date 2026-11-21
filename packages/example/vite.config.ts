import { defineConfig } from 'vite';
import sdf from '@jswork/simple-date-format';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5076',
        changeOrigin: true,
      },
    },
  },
  define: {
    BUILD_TIME: JSON.stringify(sdf('datetime')),
  },
});
