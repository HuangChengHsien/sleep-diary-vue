// src/main.js

import { createApp } from 'vue'

import App from './App.vue'
import router from './router'

// 全域樣式：設計 token 在 tokens.css，基礎樣式在 main.css
import './assets/styles/tokens.css'
import './assets/styles/main.css'
import { initTheme } from './lib/theme.js'

// 接手 index.html inline script 已套用的主題，並開始跟隨系統深淺變化
initTheme()

const app = createApp(App)

app.use(router)

app.mount('#app')
