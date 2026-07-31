// src/lib/charts/duration.js
// 每次睡眠時間長度趨勢圖（最近 28 筆有效記錄）。

import { Chart } from './chart-setup.js'
import { chartManager } from './chart-manager.js'
import { drawNoDataMessage } from './no-data.js'
import { normalizeTimestamp, getLocalDateString } from '@/lib/chart-calc.js'

export const renderDurationChart = (sleepData) => {
  const canvas = document.getElementById('durationCanvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  chartManager.destroyChart('duration')

  const processedData = sleepData
    .map((record) => {
      const sleepTime = normalizeTimestamp(record.sleepTimestamp)
      const wakeTime = normalizeTimestamp(record.wakeTimestamp)
      if (sleepTime && wakeTime && wakeTime > sleepTime) {
        return {
          x: getLocalDateString(sleepTime),
          y: (wakeTime - sleepTime) / 3600000,
          timestamp: sleepTime,
        }
      }
      return null
    })
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-28) // 最近28天
    .map((item) => ({
      x: item.x,
      y: item.y,
    }))

  if (processedData.length === 0) {
    drawNoDataMessage(ctx, canvas, '沒有足夠的睡眠記錄')
    return
  }

  const newChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: processedData.map((d) => d.x),
      datasets: [
        {
          label: '睡眠時長 (小時)',
          data: processedData.map((d) => d.y),
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          tension: 0.3,
          fill: true,
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
          text: '📊 睡眠時長趨勢',
        },
        datalabels: {
          display: true,
          align: 'top',
          anchor: 'end',
          color: '#2196F3',
          font: {
            size: 11,
            weight: 'bold',
          },
          formatter: function (value) {
            return value.toFixed(1) + 'h'
          },
          padding: 4,
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
                const dataString = dataset.data[index].toFixed(1) + 'h'
                const fontSize = 11
                const fontStyle = 'bold'
                const fontFamily = 'Arial'
                ctx.fillStyle = '#64B5F6'
                ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`
                ctx.textAlign = 'center'
                ctx.textBaseline = 'bottom'
                const position = element.tooltipPosition()
                ctx.fillText(dataString, position.x, position.y - 8)
              })
            }
          })
        },
      },
    ],
  })

  chartManager.setChart('duration', newChart)
}
