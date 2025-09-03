import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  // 设置基础路径，用于GitHub Pages部署
  // 如果部署在根域名下，使用空字符串''
  // 如果部署在子路径下，设置为仓库名称，如'/Stellagogue/'
  // 注意：错误的base路径会导致GitHub Pages上出现"Failed to resolve module specifier"错误
  base: '', // 已修改为项目在GitHub Pages上的实际路径
  
  plugins: [
    vue(),
    // 只在开发环境使用vue-devtools
    process.env.NODE_ENV !== 'production' && vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url))
    },
  },
  
  // 配置构建输出，确保所有依赖都被正确打包
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // 确保所有代码都被正确打包，解决ES模块在GitHub Pages上的解析问题
    rollupOptions: {
      // 不将任何依赖视为外部依赖，确保Vue等依赖被打包到输出文件中
      external: [],
      output: {
        // 使用IIFE格式，避免在GitHub Pages上的模块解析问题
        format: 'iife',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        // 确保生成的模块ID使用相对路径，解决GitHub Pages上的路径解析问题
        manualChunks: undefined,
        // 确保脚本标签不使用type="module"属性
        esModule: false
      }
    },
    // 确保HTML中资源引用正确处理
    assetsInlineLimit: 0
  }
})
