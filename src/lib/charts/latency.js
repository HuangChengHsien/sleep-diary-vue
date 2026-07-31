// src/lib/charts/latency.js
// 入睡耗時趨勢圖（僅夜晚睡眠、0–180 分鐘的合理值，最近 28 筆），
// 疊上理想 / 可接受範圍的參考色帶。

import { Chart } from './chart-setup.js'
import { chartManager } from './chart-manager.js'
import { drawNoDataMessage } from './no-data.js'
import { normalizeTimestamp, getLocalDateString } from '@/lib/chart-calc.js'
import { getLatencyChartBands } from '@/lib/sleep-references.js'

export const renderLatencyChart = (sleepData) => {
  const canvas = document.getElementById('latencyCanvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  chartManager.destroyChart('latency')

  const nightRecordsWithLatency = sleepData
    .map((r) => {
      const bedTime = normalizeTimestamp(r.bedTimestamp)
      const sleepTime = normalizeTimestamp(r.sleepTimestamp)

      if (bedTime && sleepTime && sleepTime > bedTime) {
        // 只計算夜晚睡眠（18:00 - 9:00）
        if (sleepTime.getHours() >= 18 || sleepTime.getHours() < 9) {
          const latencyMinutes = (sleepTime - bedTime) / 60000
          // 只考慮合理的入睡時間（0-180分鐘）
          if (latencyMinutes >= 0 && latencyMinutes <= 180) {
            return {
              date: getLocalDateString(sleepTime),
              latency: Math.round(latencyMinutes),
              timestamp: sleepTime,
              // 創建唯一的x軸標籤：日期 + 時間
              uniqueLabel: `${getLocalDateString(sleepTime)} ${sleepTime.getHours().toString().padStart(2, '0')}:${sleepTime.getMinutes().toString().padStart(2, '0')}`,
            }
          }
        }
      }
      return null
    })
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-28)
    .map((item) => ({
      date: item.date,
      latency: item.latency,
      label: item.uniqueLabel,
    }))

  if (nightRecordsWithLatency.length === 0) {
    drawNoDataMessage(ctx, canvas, '沒有夜晚入睡耗時記錄')
    return
  }

  // 取得色塊的 y 軸範圍
  const latencyBands = getLatencyChartBands()

  const newChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: nightRecordsWithLatency.map((r) => r.label),
      datasets: [
        {
          label: '入睡耗時 (分鐘)',
          data: nightRecordsWithLatency.map((r) => r.latency),
          borderColor: '#9C27B0',
          backgroundColor: 'rgba(156, 39, 176, 0.1)',
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#9C27B0',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
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
            text: '分鐘',
          },
          ticks: {
            stepSize: 10,
            callback: function (value) {
              return value + '分'
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
          text: '⏱️ 入睡耗時趨勢',
          font: { size: 16 },
        },
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const minutes = context.parsed.y
              if (minutes < 60) {
                return `入睡耗時: ${minutes} 分鐘`
              } else {
                const hours = Math.floor(minutes / 60)
                const remainingMinutes = minutes % 60
                return `入睡耗時: ${hours}小時${remainingMinutes}分鐘`
              }
            },
          },
        },
        // 設定 annotation 插件
        annotation: {
          drawTime: 'beforeDatasetsDraw', // 確保色塊在數據線條的下方
          annotations: {
            // 理想範圍 (綠色)
            goodBand: {
              type: 'box',
              yMin: latencyBands.good.yMin,
              yMax: latencyBands.good.yMax,
              backgroundColor: 'rgba(40, 167, 69, 0.15)', // 淺綠色
              borderColor: 'rgba(40, 167, 69, 0.2)',
              borderWidth: 1,
              label: {
                display: true,
                content: '理想範圍',
                position: 'start', // 標籤位置：start, center, end
                xAdjust: 5, // 水平偏移
                yAdjust: 10, // 垂直偏移
                color: 'rgba(40, 167, 69, 0.8)', // 文字顏色
                backgroundColor: 'rgba(255, 255, 255, 0.8)', // 背景顏色
                font: {
                  size: 12,
                  weight: 'bold',
                },
                padding: 4,
                borderRadius: 4,
              },
            },
            // 可接受範圍 (黃色)
            acceptableBand: {
              type: 'box',
              yMin: latencyBands.acceptable.yMin,
              yMax: latencyBands.acceptable.yMax,
              backgroundColor: 'rgba(255, 193, 7, 0.15)', // 淺黃色
              borderColor: 'rgba(255, 193, 7, 0.2)',
              borderWidth: 1,
              label: {
                display: true,
                content: '可接受範圍',
                position: 'start', // 標籤位置：start, center, end
                xAdjust: 5, // 水平偏移
                yAdjust: 10, // 垂直偏移
                color: 'rgba(255, 193, 7, 0.9)', // 文字顏色
                backgroundColor: 'rgba(255, 255, 255, 0.8)', // 背景顏色
                font: {
                  size: 12,
                  weight: 'bold',
                },
                padding: 4,
                borderRadius: 4,
              },
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
                const minutes = dataset.data[index]
                const dataString = minutes + '分'
                const fontSize = 11
                const fontStyle = 'bold'
                const fontFamily = 'Arial'
                ctx.fillStyle = '#CE93D8'
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

  chartManager.setChart('latency', newChart)
}
