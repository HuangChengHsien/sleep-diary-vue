// src/lib/charts/latency.js
// 入睡耗時趨勢圖（僅夜晚睡眠，最近 28 筆），疊上理想 / 可接受範圍的參考色帶。
//
// 不對耗時設上限：入睡困難的夜晚正是這張圖存在的理由，把它們濾掉會讓趨勢
// 看起來比實際好。異常大的值（例如輸入時上下午選錯）也照畫，讓它自己現形。

import { Chart } from './chart-setup.js'
import {
  chartManager,
  resolveRenderOptions,
  animationOption,
  CHART_FONT_FAMILY,
} from './chart-manager.js'
import { withAlpha } from '@/lib/chart-theme.js'
import { drawNoDataMessage } from './no-data.js'
import { normalizeTimestamp, getLocalDateString } from '@/lib/chart-calc.js'
import { getLatencyChartBands } from '@/lib/sleep-references.js'

export const renderLatencyChart = (sleepData, options) => {
  const { theme, animate } = resolveRenderOptions(options)
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
          return {
            date: getLocalDateString(sleepTime),
            latency: Math.round(latencyMinutes),
            timestamp: sleepTime,
            // 創建唯一的x軸標籤：日期 + 時間
            uniqueLabel: `${getLocalDateString(sleepTime)} ${sleepTime.getHours().toString().padStart(2, '0')}:${sleepTime.getMinutes().toString().padStart(2, '0')}`,
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
    drawNoDataMessage(ctx, canvas, '沒有夜晚入睡耗時記錄', theme)
    return
  }

  // 取得色塊的 y 軸範圍
  const latencyBands = getLatencyChartBands()

  // 維持每 10 分鐘一格，但極端值會讓格線多到看不清楚（11 小時 = 70 條），
  // 超過上限就交給 Chart.js 自己挑刻度。
  const maxLatency = Math.max(...nightRecordsWithLatency.map((r) => r.latency))
  const MAX_GRIDLINES = 20
  const latencyStepSize = maxLatency / 10 <= MAX_GRIDLINES ? 10 : undefined

  const newChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: nightRecordsWithLatency.map((r) => r.label),
      datasets: [
        {
          label: '入睡耗時 (分鐘)',
          data: nightRecordsWithLatency.map((r) => r.latency),
          borderColor: theme.series[0],
          backgroundColor: withAlpha(theme.series[0], 0.1),
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: theme.series[0],
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
            text: '分鐘',
          },
          ticks: {
            stepSize: latencyStepSize,
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
          text: '入睡耗時趨勢',
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
            // 理想範圍（--success）
            goodBand: {
              type: 'box',
              yMin: latencyBands.good.yMin,
              yMax: latencyBands.good.yMax,
              backgroundColor: withAlpha(theme.success, 0.18),
              borderColor: withAlpha(theme.success, 0.35),
              borderWidth: 1,
              label: {
                display: true,
                content: '理想範圍',
                position: 'start', // 標籤位置：start, center, end
                xAdjust: 5, // 水平偏移
                yAdjust: 10, // 垂直偏移
                color: theme.success, // 文字顏色
                backgroundColor: theme.surface, // 背景顏色
                font: {
                  size: 12,
                  weight: 'bold',
                },
                padding: 4,
                borderRadius: 4,
              },
            },
            // 可接受範圍（中性 --border-strong，不用警示色）
            acceptableBand: {
              type: 'box',
              yMin: latencyBands.acceptable.yMin,
              yMax: latencyBands.acceptable.yMax,
              backgroundColor: withAlpha(theme.borderStrong, 0.18),
              borderColor: withAlpha(theme.borderStrong, 0.35),
              borderWidth: 1,
              label: {
                display: true,
                content: '可接受範圍',
                position: 'start', // 標籤位置：start, center, end
                xAdjust: 5, // 水平偏移
                yAdjust: 10, // 垂直偏移
                color: theme.ink, // 文字顏色（--border-strong 不當文字色）
                backgroundColor: theme.surface, // 背景顏色
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
                const fontFamily = CHART_FONT_FAMILY
                ctx.fillStyle = theme.ink
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
