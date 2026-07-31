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
        // 請根據您的應用程式修改以下資訊
        name: '睡眠日誌',
        short_name: '睡眠日誌',
        description: '記錄與分析兒童青少年睡眠品質，資料完全儲存於本機裝置。',
        theme_color: '#0A1020',
        background_color: '#0A1020',
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
        runtimeCaching: [
          {
            // Google Fonts 快取
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
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
