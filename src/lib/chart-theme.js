// src/lib/chart-theme.js
// 圖表用色：從 tokens.css 讀出目前主題（淺色／深色）的實際色碼給 Chart.js 用（移植自眠序）。
// Chart.js 畫在 canvas 上，不能直接用 CSS 變數，所以在重畫前讀一次。
// 依 <html data-theme> 快取，切換主題後自動換一組。

import { Chart } from 'chart.js'

// 讀不到 CSS 變數時（例如測試環境）的後備值＝淺色 token
const FALLBACK = {
  series: ['#946f14', '#256abf', '#d55181'],
  ink: '#594f44',
  text: '#231c15',
  grid: '#e5ded0',
  borderStrong: '#877b6a',
  surface: '#ffffff',
  success: '#256d3f',
  warning: '#944f00',
}

// '#rrggbb' 或 '#rgb' 加上透明度，回傳 rgba()
export const withAlpha = (hex, alpha) => {
  let h = String(hex).trim().replace('#', '')
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return hex
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

let cache = { key: null, theme: null }

// forceLight：列印時用，不管畫面目前是哪個主題，都讀淺色 token（列印永遠是淺色紙本）
export const readChartTheme = ({ forceLight = false } = {}) => {
  if (typeof document === 'undefined') return FALLBACK
  const root = document.documentElement
  const key = forceLight ? 'light' : root.dataset.theme || 'light'
  if (cache.key === key) return cache.theme

  let style
  if (forceLight && root.dataset.theme !== 'light') {
    // 用一個掛在 data-theme="light" 底下的隱形元素讀淺色值，不動到畫面本身
    const probe = document.createElement('div')
    probe.dataset.theme = 'light'
    probe.style.display = 'none'
    document.body.appendChild(probe)
    const computed = getComputedStyle(probe)
    const values = {}
    for (const n of TOKEN_NAMES) values[n] = computed.getPropertyValue(n)
    probe.remove()
    style = { getPropertyValue: (n) => values[n] ?? '' }
  } else {
    style = getComputedStyle(root)
  }

  const v = (name, fallback) => style.getPropertyValue(name).trim() || fallback
  const theme = {
    series: [
      v('--chart-1', FALLBACK.series[0]),
      v('--chart-2', FALLBACK.series[1]),
      v('--chart-3', FALLBACK.series[2]),
    ],
    ink: v('--text-2', FALLBACK.ink),
    text: v('--text', FALLBACK.text),
    grid: v('--border', FALLBACK.grid),
    borderStrong: v('--border-strong', FALLBACK.borderStrong),
    surface: v('--surface', FALLBACK.surface),
    success: v('--success', FALLBACK.success),
    warning: v('--warning', FALLBACK.warning),
  }
  cache = { key, theme }
  return theme
}

const TOKEN_NAMES = [
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--text-2',
  '--text',
  '--border',
  '--border-strong',
  '--surface',
  '--success',
  '--warning',
]

// 把目前主題設成 Chart.js 的全域預設（文字、格線、標題、圖例）。
// 主題切換或列印前後呼叫，之後重畫圖表才會生效。
export const applyChartTheme = (theme = readChartTheme()) => {
  Chart.defaults.color = theme.ink
  Chart.defaults.borderColor = theme.grid
  Chart.defaults.plugins.title.color = theme.text
  Chart.defaults.plugins.legend.labels.color = theme.ink
  return theme
}
