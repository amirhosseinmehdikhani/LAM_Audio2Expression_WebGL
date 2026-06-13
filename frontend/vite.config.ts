// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendPort = env.VITE_BACKEND_PORT || '8001'
  const apiTarget = env.VITE_AUDIO2EXPRESSION_API || `http://127.0.0.1:${backendPort}`

  return {
    base: "./",
    plugins: [vue()],
    server: {
      host: '0.0.0.0',
      port: 8080,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
