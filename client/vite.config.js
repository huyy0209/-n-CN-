import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Khi chạy dev, mọi lời gọi /api được chuyển tiếp sang máy chủ Express ở cổng 4000
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } },
});
