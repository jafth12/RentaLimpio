import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server:{
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true
    /*allowedHosts: [
      '190.62.2.18',
      '192.168.1.7',
      'localhost'
    ]*/
  }
})
