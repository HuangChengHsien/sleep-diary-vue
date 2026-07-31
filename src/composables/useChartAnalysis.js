// composables/useChartAnalysis.js
// 圖表渲染的入口 composable。
//
// 實際的繪圖邏輯已依圖表類型拆到 src/lib/charts/ 之下，這裡只負責：
//   1. 依 chartType 派送到對應的 renderXxxChart
//   2. 管理 isLoading 狀態
//   3. 對外提供 destroyChart（元件 unmount 時清乾淨）
//
// Chart.js 的元件註冊與預設主題由 src/lib/charts/chart-setup.js 在首次 import 時完成。

import { ref } from 'vue'

import { chartManager } from '@/lib/charts/chart-manager.js'
import { processDailySleepData } from '@/lib/chart-calc.js'

import { renderTimelineChart } from '@/lib/charts/timeline.js'
import { renderDurationChart } from '@/lib/charts/duration.js'
import { renderDailyDurationChart } from '@/lib/charts/daily-duration.js'
import { renderBedtimeChart } from '@/lib/charts/bedtime.js'
import { renderLatencyChart } from '@/lib/charts/latency.js'
import { renderWakeCountChart } from '@/lib/charts/wake-count.js'
import { renderWeeklyChart } from '@/lib/charts/weekly.js'

export function useChartAnalysis() {
  const chartInstance = ref(null)
  const isLoading = ref(false)

  // 銷毀現有圖表
  const destroyChart = () => {
    chartManager.destroyAll()
    chartInstance.value = null
  }

  // 依圖表類型派送到對應的繪圖函式
  const renderChart = (
    canvas,
    chartType,
    sleepData,
    eventData = [],
    showEvents = 'true',
    showSleep = 'true',
    baby = null,
  ) => {
    isLoading.value = true

    try {
      // 檢查數據
      if (!sleepData || sleepData.length === 0) {
        isLoading.value = false
        return
      }

      switch (chartType) {
        case 'timeline':
          renderTimelineChart(sleepData, eventData, showEvents === 'true', showSleep === 'true')
          break
        case 'duration':
          renderDurationChart(sleepData)
          break
        case 'dailyDuration': {
          const dailyData = processDailySleepData(sleepData)
          renderDailyDurationChart(dailyData, baby)
          break
        }
        case 'bedtime':
          renderBedtimeChart(sleepData)
          break
        case 'latency':
          renderLatencyChart(sleepData)
          break
        case 'wakeCount':
          renderWakeCountChart(sleepData)
          break
        case 'weekly': {
          const weeklyData = processDailySleepData(sleepData)
          renderWeeklyChart(weeklyData)
          break
        }
        default:
          // 未實現的圖表類型
          break
      }
    } catch {
      // 靜默處理錯誤
    } finally {
      isLoading.value = false
    }
  }

  return {
    chartInstance,
    isLoading,
    renderChart,
    renderDailyDurationChart,
    destroyChart,
  }
}
