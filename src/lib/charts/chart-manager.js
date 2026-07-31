// src/lib/charts/chart-manager.js
// 圖表記憶體管理器：以圖表類型為 key 保存 Chart 實例，重繪前先銷毀舊的，
// 避免 Chart.js 在同一個 canvas 上重複掛載造成記憶體洩漏。

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
