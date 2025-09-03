import { fileURLToPath, URL } from 'node:url'
import fs from 'fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  // 设置基础路径，用于GitHub Pages部署
  base: './',
  
  plugins: [
    vue(),
    // 只在开发环境使用vue-devtools
    process.env.NODE_ENV !== 'production' && vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  
  // 配置构建输出，确保所有依赖都被正确打包
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // 确保所有代码都被打包到一个文件中，避免模块解析问题
    rollupOptions: {
      // 不将任何依赖视为外部依赖
      external: [],
      output: {
        // 使用iife格式（立即执行函数表达式）而不是es模块
        format: 'iife',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        // 确保Vue被正确打包
        manualChunks: undefined
      }
    }
  }
})
