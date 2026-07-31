// src/lib/charts/bedtime.js
// 就寢時間趨勢圖（僅夜晚 18:00–06:00 的就寢記錄，最近 50 筆）。
// Y 軸用 16–30 的「延伸小時」表示，讓跨午夜的時間可以連續呈現。

import { Chart } from './chart-setup.js'
import { chartManager } from './chart-manager.js'
import { drawNoDataMessage } from './no-data.js'
import { normalizeTimestamp, getLocalDateString } from '@/lib/chart-calc.js'

export const renderBedtimeChart = (sleepData) => {
  const canvas = document.getElementById('bedtimeCanvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  chartManager.destroyChart('bedtime')

  const bedtimeRecords = sleepData
    .map((r) => {
      const bedTime = normalizeTimestamp(r.bedTimestamp)
      const sleepTime = normalizeTimestamp(r.sleepTimestamp)

      if (bedTime && sleepTime) {
        const bedHour = bedTime.getHours()
        if (bedHour >= 18 || bedHour <= 6) {
          const bedTimeMinutes =
            bedHour >= 18
              ? bedHour * 60 + bedTime.getMinutes()
              : (bedHour + 24) * 60 + bedTime.getMinutes()

          return {
            date: getLocalDateString(bedTime),
            bedTimeMinutes: bedTimeMinutes,
            bedTimeDisplay: `${String(bedHour).padStart(2, '0')}:${String(bedTime.getMinutes()).padStart(2, '0')}`,
            timestamp: bedTime,
          }
        }
      }
      return null
    })
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-50) // 增加數據量

  if (bedtimeRecords.length === 0) {
    drawNoDataMessage(ctx, canvas, '沒有夜晚就寢時間記錄')
    return
  }

  // 創建唯一的標籤，確保每個記錄都有獨立的X軸位置
  const uniqueLabels = bedtimeRecords.map(
    (r, index) => `${r.date.slice(-5)}-${index}`, // MM-DD-索引
  )

  const newChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: uniqueLabels,
      datasets: [
        {
          label: '就寢時間',
          data: bedtimeRecords.map((r) => r.bedTimeMinutes / 60),
          borderColor: '#FF5722',
          backgroundColor: 'rgba(255, 87, 34, 0.1)',
          tension: 0.2, // 直線連接
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: '#FF5722',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: '記錄時間序列' },
          ticks: {
            maxTicksLimit: 10,
            callback: function (value, index) {
              // 只顯示日期部分，隱藏索引
              return bedtimeRecords[index] ? bedtimeRecords[index].date.slice(-5) : ''
            },
          },
        },
        y: {
          min: 16,
          max: 30,
          title: { display: true, text: '時間' },
          ticks: {
            stepSize: 2,
            callback: function (value) {
              const hour = Math.floor(value) % 24
              return `${String(hour).padStart(2, '0')}:00`
            },
          },
        },
      },
      plugins: {
        title: {
          display: true,
          text: '🛏️ 就寢時間趨勢 (完整記錄)',
        },
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: function (context) {
              const index = context[0].dataIndex
              return bedtimeRecords[index].date
            },
            label: function (context) {
              const record = bedtimeRecords[context.dataIndex]
              return `就寢時間: ${record.bedTimeDisplay}`
            },
            afterLabel: function (context) {
              const currentDate = bedtimeRecords[context.dataIndex].date
              const sameDate = bedtimeRecords.filter((r) => r.date === currentDate)
              if (sameDate.length > 1) {
                return `當天共 ${sameDate.length} 次記錄`
              }
              return null
            },
          },
        },
      },
    },
    plugins: [
      {
        id: 'timeLabels', // 顯示時間標籤
        afterDatasetsDraw: function (chart) {
          const ctx = chart.ctx
          bedtimeRecords.forEach((record, index) => {
            const meta = chart.getDatasetMeta(0)
            const element = meta.data[index]

            if (element) {
              const timeText = record.bedTimeDisplay
              ctx.save()

              // 文字樣式
              ctx.font = 'bold 10px Arial'
              ctx.textAlign = 'center'
              ctx.textBaseline = 'bottom'

              const position = element.tooltipPosition()

              // 深色背景
              const textWidth = ctx.measureText(timeText).width
              ctx.fillStyle = 'rgba(10, 16, 32, 0.85)'
              ctx.fillRect(position.x - textWidth / 2 - 2, position.y - 16, textWidth + 4, 12)

              // 文字
              ctx.fillStyle = '#FF8A65'
              ctx.fillText(timeText, position.x, position.y - 6)

              ctx.restore()
            }
          })
        },
      },
    ],
  })

  chartManager.setChart('bedtime', newChart)
}
