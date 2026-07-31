// src/router/index.js
// 路由設定 - 本地版（不需要認證）

import { createRouter, createWebHistory } from 'vue-router'
import DiaryView from '@/views/DiaryView.vue'

// AnalysisView 走 route-level code splitting：Chart.js 及相關的計算檔案
// 只有在使用者進到 /analysis 時才會下載，讓首頁 initial bundle 更輕
const AnalysisView = () => import('@/views/AnalysisView.vue')

const routes = [
  { path: '/',         redirect: '/diary' },
  { path: '/diary',    name: 'Diary',    component: DiaryView },
  { path: '/analysis', name: 'Analysis', component: AnalysisView },
  // 其他未知路徑
  { path: '/:pathMatch(.*)*', redirect: '/diary' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
