// src/lib/theme.js
// 主題（淺色／深色）的唯一來源，移植自眠序。偏好存在 localStorage 'theme'：'system'（預設）| 'light' | 'dark'。
// 首屏前由 index.html 的 inline script 先套用一次（避免半夜打開先閃一整面亮色），
// App 啟動後由 initTheme() 接手並監聽系統主題變化。

export const THEME_STORAGE_KEY = 'theme'
export const THEME_PREFERENCES = ['system', 'light', 'dark']

// 狀態列／瀏覽器 UI 顏色，與 tokens.css 的 --bg 一致（index.html 的 inline script 也寫了同一組）
export const THEME_COLORS = { light: '#FAF7F0', dark: '#14100C' }

export const normalizePreference = (stored) =>
  THEME_PREFERENCES.includes(stored) ? stored : 'system'

export const resolveTheme = (preference, systemPrefersDark) => {
  const pref = normalizePreference(preference)
  if (pref === 'system') return systemPrefersDark ? 'dark' : 'light'
  return pref
}

// ── 以下為瀏覽器端 ──

// MediaQueryList 的 change 監聽。Safari 13 以前沒有 addEventListener，只有 addListener。
// 回傳取消監聽的函式。
export const onMediaQueryChange = (mql, fn) => {
  if (!mql) return () => {}
  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', fn)
    return () => mql.removeEventListener('change', fn)
  }
  mql.addListener?.(fn)
  return () => mql.removeListener?.(fn)
}

const darkQuery = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

// localStorage 無法使用（無痕模式、WebView 限制）時，本次畫面改用記憶體中的偏好
let memoryPreference = null

const readPreference = () => {
  // 本次工作階段明確選過就以它為準（也涵蓋「讀得到、寫不進去」的情況）
  if (memoryPreference) return memoryPreference
  try {
    return normalizePreference(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'system'
  }
}

export const getPreference = readPreference

export const getResolvedTheme = () => resolveTheme(readPreference(), darkQuery()?.matches)

export const applyTheme = (resolved) => {
  const root = document.documentElement
  root.dataset.theme = resolved
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLORS[resolved])
}

const listeners = new Set()

export const onThemeChange = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

const refresh = () => {
  const resolved = getResolvedTheme()
  applyTheme(resolved)
  listeners.forEach((fn) => fn(resolved))
  return resolved
}

export const setPreference = (preference) => {
  memoryPreference = normalizePreference(preference)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, memoryPreference)
  } catch {
    // 無痕模式等情況寫不進去時，readPreference 會改用 memoryPreference 套用到本次畫面
  }
  return refresh()
}

let initialized = false

export const initTheme = () => {
  if (initialized) return getResolvedTheme()
  initialized = true
  onMediaQueryChange(darkQuery(), () => {
    if (readPreference() === 'system') refresh()
  })
  return refresh()
}
