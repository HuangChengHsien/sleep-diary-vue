// src/main.js

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// 引入全域樣式 (我們統一使用 src/assets/styles/main.css)
import './assets/styles/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')