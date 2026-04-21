// src/router/index.js
// 路由設定 - 本地版（不需要認證）

import { createRouter, createWebHistory } from 'vue-router'
import DiaryView from '@/views/DiaryView.vue'
import AnalysisView from '@/views/AnalysisView.vue'

const routes = [
  { path: '/',         redirect: '/diary' },
  { path: '/diary',    name: 'Diary',    component: DiaryView },
  { path: '/analysis', name: 'Analysis', component: AnalysisView },
  // 相容舊的 /login 路徑（重導向到日誌頁）
  { path: '/login',    redirect: '/diary' },
  // 其他未知路徑
  { path: '/:pathMatch(.*)*', redirect: '/diary' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
