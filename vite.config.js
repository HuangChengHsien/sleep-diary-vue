// vite.config.js (最終版本)

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
        name: '兒童青少年睡眠健康平台',
        short_name: '睡眠日誌',
        description: '記錄與分析兒童青少年睡眠品質，資料完全儲存於本機裝置。',
        theme_color: '#0A1020',
        background_color: '#0A1020',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            // 圖示路徑是相對於 public 資料夾的
            // 請確認 public 資料夾下有這個檔案
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            // 請確認 public 資料夾下有這個檔案
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            // Maskable icon，讓圖示在 Android 上顯示得更好看
            // 請確認 public 資料夾下有這個檔案
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
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
})
