// src/lib/charts/weekly.js
// 週統計分析圖：把每日總睡眠依星期幾分組取平均。

import { Chart } from './chart-setup.js'
import { chartManager } from './chart-manager.js'
import { drawNoDataMessage } from './no-data.js'

export const renderWeeklyChart = (dailyData) => {
  const canvas = document.getElementById('weeklyCanvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  chartManager.destroyChart('weekly')

  if (!dailyData || dailyData.length === 0) {
    drawNoDataMessage(ctx, canvas, '沒有週統計資料')
    return
  }

  // 計算週統計
  const weeklyStats = Array(7)
    .fill(0)
    .map(() => ({ total: 0, count: 0 }))

  dailyData.forEach((day) => {
    const date = new Date(day.date + 'T00:00:00')
    const dayOfWeek = date.getDay()
    if (day.totalSleep > 0) {
      weeklyStats[dayOfWeek].total += day.totalSleep
      weeklyStats[dayOfWeek].count++
    }
  })

  const weeklyAverages = weeklyStats.map((stat) => (stat.count > 0 ? stat.total / stat.count : 0))
  const dayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']

  const newChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dayNames,
      datasets: [
        {
          label: '平均睡眠時長 (小時)',
          data: weeklyAverages,
          backgroundColor: 'rgba(156, 39, 176, 0.8)',
          borderColor: '#9C27B0',
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: '小時',
          },
        },
      },
      plugins: {
        title: {
          display: true,
          text: '📅 週統計分析',
        },
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const dayIndex = context.dataIndex
              const average = context.parsed.y
              const count = weeklyStats[dayIndex].count
              return `平均: ${average.toFixed(1)}h (基於 ${count} 天的記錄)`
            },
          },
        },
      },
    },
    plugins: [
      {
        id: 'datalabels',
        afterDatasetsDraw: function (chart) {
          const ctx = chart.ctx
          chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex)
            if (!meta.hidden) {
              meta.data.forEach((element, index) => {
                const value = dataset.data[index]
                if (value > 0) {
                  const dataString = value.toFixed(1) + 'h'
                  const fontSize = 12
                  const fontStyle = 'bold'
                  const fontFamily = 'Arial'
                  ctx.fillStyle = '#CE93D8'
                  ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`
                  ctx.textAlign = 'center'
                  ctx.textBaseline = 'bottom'

                  const position = element.tooltipPosition()
                  ctx.fillText(dataString, position.x, position.y - 5)
                }
              })
            }
          })
        },
      },
    ],
  })

  chartManager.setChart('weekly', newChart)
}
