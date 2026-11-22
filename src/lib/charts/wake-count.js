// src/lib/charts/wake-count.js
// 夜間清醒次數趨勢圖（僅夜晚睡眠記錄）。

import { Chart } from './chart-setup.js'
import { chartManager, resolveRenderOptions, animationOption } from './chart-manager.js'
import { withAlpha } from '@/lib/chart-theme.js'
import { drawNoDataMessage } from './no-data.js'
import { normalizeTimestamp, getLocalDateString } from '@/lib/chart-calc.js'

export const renderWakeCountChart = (sleepData, options) => {
  const { theme, animate } = resolveRenderOptions(options)
  const canvas = document.getElementById('wakeCountCanvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  chartManager.destroyChart('wakeCount')

  const nightRecords = sleepData
    .filter((r) => {
      const sleepTime = normalizeTimestamp(r.sleepTimestamp)
      // 只分析夜晚睡眠記錄
      return sleepTime && (sleepTime.getHours() >= 18 || sleepTime.getHours() < 9)
    })
    .sort((a, b) => {
      const aTime = normalizeTimestamp(a.sleepTimestamp)
      const bTime = normalizeTimestamp(b.sleepTimestamp)
      return aTime - bTime
    })

  if (nightRecords.length === 0) {
    drawNoDataMessage(ctx, canvas, '沒有夜晚睡眠資料可供分析清醒次數', theme)
    return
  }

  const chartData = nightRecords.map((r) => {
    const sleepTime = normalizeTimestamp(r.sleepTimestamp)
    return {
      date: getLocalDateString(sleepTime),
      wakeCount: r.wakeCount || 0,
    }
  })

  const newChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.map((d) => d.date),
      datasets: [
        {
          label: '清醒次數',
          data: chartData.map((d) => d.wakeCount),
          // 固定用第二色（藍）：不用紅色表示沒睡好，也不用偏紅的 --chart-3
          borderColor: theme.series[1],
          backgroundColor: withAlpha(theme.series[1], 0.1),
          tension: 0.3,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: theme.series[1],
          pointBorderColor: theme.surface,
          pointBorderWidth: 2,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...animationOption(animate),
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: '次數',
          },
          ticks: {
            stepSize: 1,
            callback: function (value) {
              return value + '次'
            },
          },
        },
        x: {
          title: {
            display: true,
            text: '日期',
          },
        },
      },
      plugins: {
        title: {
          display: true,
          text: '夜間清醒次數趨勢',
          font: { size: 16 },
        },
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const count = context.parsed.y
              if (count === 0) {
                return '夜間清醒: 無'
              } else if (count === 1) {
                return '夜間清醒: 1次'
              } else {
                return `夜間清醒: ${count}次`
              }
            },
          },
        },
      },
    },
  })

  chartManager.setChart('wakeCount', newChart)
}
