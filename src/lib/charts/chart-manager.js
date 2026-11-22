// src/lib/charts/chart-manager.js
// 圖表記憶體管理器：以圖表類型為 key 保存 Chart 實例，重繪前先銷毀舊的，
// 避免 Chart.js 在同一個 canvas 上重複掛載造成記憶體洩漏。

import { readChartTheme } from '@/lib/chart-theme.js'

class ChartMemoryManager {
  constructor() {
    this.chartInstances = new Map()
  }

  setChart(type, chartInstance) {
    if (this.chartInstances.has(type)) {
      const oldChart = this.chartInstances.get(type)
      if (oldChart && typeof oldChart.destroy === 'function') {
        try {
          oldChart.destroy()
        } catch {
          // 靜默處理錯誤
        }
      }
    }
    this.chartInstances.set(type, chartInstance)
  }

  destroyChart(type) {
    const chart = this.chartInstances.get(type)
    if (chart && typeof chart.destroy === 'function') {
      try {
        chart.destroy()
      } catch {
        // 靜默處理錯誤
      }
    }
    this.chartInstances.delete(type)
  }

  destroyAll() {
    for (const chart of this.chartInstances.values()) {
      if (chart && typeof chart.destroy === 'function') {
        try {
          chart.destroy()
        } catch {
          // 靜默處理錯誤
        }
      }
    }
    this.chartInstances.clear()
  }
}

export { ChartMemoryManager }

export const chartManager = new ChartMemoryManager()

// ── 每次繪圖的共用設定 ─────────────────────────────────
// 圖表顏色一律在繪圖當下由 readChartTheme() 讀（不在 module scope 快取），主題切換後重畫就會換色。
// 列印與下載 PNG 要強制淺色、且不跑動畫（同步畫完才能馬上列印），所以每個 renderXxxChart
// 都接受最後一個參數 { theme, animate }；經由 useChartAnalysis.renderChart 間接呼叫、
// 無法直接傳參數時，用 withRenderOptions() 包住同步的繪圖呼叫。

// canvas 上自己畫的文字（數值標籤、事件說明）用的字體，與 tokens.css 的 --font-sans 同一組系統字體
export const CHART_FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'PingFang TC', 'Noto Sans TC', 'Microsoft JhengHei', system-ui, sans-serif"

let renderOverride = null

// 在 fn 執行期間（必須是同步繪圖）套用 { theme, animate }，結束後恢復
export const withRenderOptions = (options, fn) => {
  const previous = renderOverride
  renderOverride = options
  try {
    return fn()
  } finally {
    renderOverride = previous
  }
}

// renderXxxChart 開頭呼叫：參數 > withRenderOptions > 目前主題
export const resolveRenderOptions = (options = {}) => ({
  theme: options.theme ?? renderOverride?.theme ?? readChartTheme(),
  animate: options.animate ?? renderOverride?.animate ?? true,
})

// 關掉動畫時 new Chart() 會同步畫完，列印前呼叫才不會印到畫一半的圖
export const animationOption = (animate, animation) =>
  animate ? (animation === undefined ? {} : { animation }) : { animation: false }
