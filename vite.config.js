// vite.config.js (最終版本)

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// 建置日期。列印出來的報告會帶上這個戳記 —— 統計算法會隨版本調整，
// 事後有人問「這份報告的數字怎麼算的」，這是唯一能回答的線索。
const BUILD_DATE = new Date().toISOString().slice(0, 10)

export default defineConfig({
  define: {
    'import.meta.env.VITE_BUILD_DATE': JSON.stringify(BUILD_DATE),
  },
  // --- 基礎設定 ---
  plugins: [
    vue(),
    // --- PWA 設定 ---
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false,
      },
      // Manifest 檔案設定
      manifest: {
        // 品牌背書寫法「X · by KidnSleep」；主畫面圖示下方只放得下 short_name
        name: '眠手帳 · by KidnSleep',
        short_name: '眠手帳',
        lang: 'zh-TW',
        description: '眠手帳：免登入的兒童青少年睡眠日誌。記錄與分析睡眠作息，資料只存在本機裝置。',
        // manifest 只能放一個值，兩者都用深色 token --bg #14100C：
        // background_color 是啟動畫面與 CSS 載入前的底色，多在睡前開啟，用紙色會先閃一下亮白。
        // 實際狀態列顏色由 index.html 的 inline script 依淺色／深色主題動態改 meta theme-color。
        theme_color: '#14100C',
        background_color: '#14100C',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      // Workbox 快取設定
      workbox: {
        // 自動清理過期的快取
        cleanupOutdatedCaches: true,
        // 需要被預先快取的檔案類型
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,vue,txt,woff2}'],
      },
    }),
  ],
  // --- 路徑別名設定 ---
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // --- Vitest ---
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.spec.js'],
  },
})
