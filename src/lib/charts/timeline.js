// src/lib/charts/timeline.js
// 睡眠時間軸圖表：每一列是一天，橫軸 0–24 時，畫出睡眠區段、入睡準備區段與事件標記。

import { Chart } from './chart-setup.js'
import { chartManager } from './chart-manager.js'
import { drawNoDataMessage } from './no-data.js'
import { normalizeTimestamp, getLocalDateString } from '@/lib/chart-calc.js'
import { MAX_PLAUSIBLE_LATENCY_MINUTES } from '@/lib/sleep-record-input.js'

export const renderTimelineChart = (sleepData, eventData, showEvents, showSleep) => {
  const canvas = document.getElementById('timelineCanvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  chartManager.destroyChart('timeline')

  const allPossibleSleepDates = sleepData.flatMap((record) => {
    const dates = []
    const sleepStart = normalizeTimestamp(record.sleepTimestamp)
    const wakeUp = normalizeTimestamp(record.wakeTimestamp)
    const bedTime = normalizeTimestamp(record.bedTimestamp)
    if (bedTime) dates.push(getLocalDateString(bedTime))
    if (sleepStart) dates.push(getLocalDateString(sleepStart))
    if (wakeUp) dates.push(getLocalDateString(wakeUp))
    return dates
  })

  const allPossibleEventDates = eventData
    .map((e) => (e.dateTime ? getLocalDateString(e.dateTime) : null))
    .filter(Boolean)
  const allDates = [...new Set([...allPossibleSleepDates, ...allPossibleEventDates])].sort(
    (a, b) => new Date(a) - new Date(b),
  )

  // 依資料筆數動態設定高度（每列 40px，最少 300px）
  // 用注入 <style> + !important 的方式鎖住高度，阻止 Chart.js ResizeObserver 造成無限循環
  const dynamicHeight = Math.max(300, allDates.length * 40 + 60)
  let styleEl = document.getElementById('timeline-canvas-style')
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'timeline-canvas-style'
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = `#timelineCanvas { height: ${dynamicHeight}px !important; }`

  const processedSleepData = []
  const timeToHours = (date) => date.getHours() + date.getMinutes() / 60

  if (showSleep) {
    sleepData.forEach((record) => {
      const sleepStart = normalizeTimestamp(record.sleepTimestamp)
      const wakeUp = normalizeTimestamp(record.wakeTimestamp)
      const bedTime = normalizeTimestamp(record.bedTimestamp)
      if (sleepStart && wakeUp && wakeUp > sleepStart) {
        const sleepStartDateStr = getLocalDateString(sleepStart)
        const wakeUpDateStr = getLocalDateString(wakeUp)
        if (sleepStartDateStr !== wakeUpDateStr) {
          processedSleepData.push({
            x: [timeToHours(sleepStart), 24],
            y: sleepStartDateStr,
            type: 'sleep',
          })
          processedSleepData.push({
            x: [0, timeToHours(wakeUp)],
            y: wakeUpDateStr,
            type: 'sleep',
          })
        } else {
          processedSleepData.push({
            x: [timeToHours(sleepStart), timeToHours(wakeUp)],
            y: sleepStartDateStr,
            type: 'sleep',
          })
        }
      }
      if (bedTime && sleepStart && sleepStart > bedTime) {
        const bedTimeDateStr = getLocalDateString(bedTime)
        const sleepStartDateStr = getLocalDateString(sleepStart)
        if ((sleepStart - bedTime) / 60000 < MAX_PLAUSIBLE_LATENCY_MINUTES) {
          if (bedTimeDateStr !== sleepStartDateStr) {
            processedSleepData.push({
              x: [timeToHours(bedTime), 24],
              y: bedTimeDateStr,
              type: 'latency',
            })
            processedSleepData.push({
              x: [0, timeToHours(sleepStart)],
              y: sleepStartDateStr,
              type: 'latency',
            })
          } else {
            processedSleepData.push({
              x: [timeToHours(bedTime), timeToHours(sleepStart)],
              y: bedTimeDateStr,
              type: 'latency',
            })
          }
        }
      }
    })
  }

  if (allDates.length === 0) {
    drawNoDataMessage(ctx, canvas, '此區間沒有任何記錄可顯示')
    return
  }

  // 準備事件數據（用於自定義繪製）
  let eventMarkers = []
  if (showEvents && eventData && eventData.length > 0) {
    const dateToIndexMap = new Map(allDates.map((date, index) => [date, index]))

    eventData.forEach((event) => {
      if (!event.dateTime) {
        return
      }

      const eventDateStr = getLocalDateString(event.dateTime)
      const eventHour = timeToHours(event.dateTime)
      const yIndex = dateToIndexMap.get(eventDateStr)

      if (yIndex !== undefined) {
        eventMarkers.push({
          x: eventHour,
          yIndex: yIndex,
          description: event.description || '事件',
        })
      }
    })
  }

  const textColor = 'rgba(241, 237, 224, 0.65)'

  const newChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: allDates,
      datasets: [
        {
          data: processedSleepData,
          backgroundColor: function (ctx) {
            if (ctx.raw && ctx.raw.type === 'sleep') {
              return '#4CAF50'
            }
            return 'rgba(128, 128, 128, 0.5)'
          },
          barPercentage: 0.5,
          borderSkipped: false,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 0,
          max: 24,
          position: 'top',
          ticks: {
            stepSize: 3,
            callback: (v) => `${String(v).padStart(2, '0')}:00`,
            color: textColor,
          },
          grid: {
            color: 'rgba(128, 128, 128, 0.2)',
          },
        },
        y: {
          type: 'category',
          ticks: {
            color: textColor,
          },
          grid: {
            display: false,
          },
        },
      },
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: '💤 睡眠時間軸圖表',
          font: { size: 16 },
          color: textColor,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const data = context.raw
              if (!data) return ''
              const hoursToTime = (h) =>
                `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h - Math.floor(h)) * 60)).padStart(2, '0')}`
              const type = data.type === 'sleep' ? '睡眠' : '入睡準備'
              const duration = Math.round(Math.abs(data.x[1] - data.x[0]) * 60)
              return `${type}: ${hoursToTime(data.x[0])} - ${hoursToTime(data.x[1])} (${duration}分鐘)`
            },
          },
        },
      },
    },
    plugins: [
      {
        id: 'eventMarkers',
        afterDatasetsDraw: function (chart) {
          if (!showEvents || eventMarkers.length === 0) {
            return
          }

          const ctx = chart.ctx
          const chartArea = chart.chartArea
          const yScale = chart.scales.y
          const xScale = chart.scales.x

          eventMarkers.forEach((marker) => {
            // 計算事件標記的位置
            const xPos = xScale.getPixelForValue(marker.x)
            const yPos = yScale.getPixelForValue(marker.yIndex)

            ctx.save()

            // 繪製垂直線
            ctx.strokeStyle = '#E91E63'
            ctx.lineWidth = 3
            ctx.setLineDash([8, 4])
            ctx.beginPath()
            ctx.moveTo(xPos, yPos - 20)
            ctx.lineTo(xPos, yPos + 20)
            ctx.stroke()
            ctx.setLineDash([])

            // 繪製事件標記點（更大更明顯）
            ctx.fillStyle = '#E91E63'
            ctx.beginPath()
            ctx.arc(xPos, yPos, 6, 0, 2 * Math.PI)
            ctx.fill()

            // 繪製白色邊框讓圓點更明顯
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth = 2
            ctx.stroke()

            // 繪製事件描述背景框
            const text = marker.description
            ctx.font = 'bold 11px Arial'
            const textMetrics = ctx.measureText(text)
            const textWidth = textMetrics.width
            const textHeight = 16

            // 計算文字位置（避免超出圖表邊界）
            let textX = xPos
            let textY = yPos - 35

            // 如果文字會超出右邊界，就往左移
            if (textX + textWidth / 2 + 8 > chartArea.right) {
              textX = chartArea.right - textWidth / 2 - 8
            }
            // 如果文字會超出左邊界，就往右移
            if (textX - textWidth / 2 - 8 < chartArea.left) {
              textX = chartArea.left + textWidth / 2 + 8
            }

            // 繪製文字背景
            ctx.fillStyle = 'rgba(233, 30, 99, 0.9)'
            ctx.fillRect(
              textX - textWidth / 2 - 6,
              textY - textHeight / 2 - 4,
              textWidth + 12,
              textHeight + 8,
            )

            // 繪製文字邊框
            ctx.strokeStyle = '#E91E63'
            ctx.lineWidth = 1
            ctx.strokeRect(
              textX - textWidth / 2 - 6,
              textY - textHeight / 2 - 4,
              textWidth + 12,
              textHeight + 8,
            )

            // 繪製文字
            ctx.fillStyle = '#ffffff'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(text, textX, textY)

            // 繪製連接線（從圓點到文字框）
            ctx.strokeStyle = '#E91E63'
            ctx.lineWidth = 1
            ctx.setLineDash([2, 2])
            ctx.beginPath()
            ctx.moveTo(xPos, yPos - 6)
            ctx.lineTo(textX, textY + textHeight / 2 + 4)
            ctx.stroke()
            ctx.setLineDash([])

            ctx.restore()
          })
        },
      },
    ],
  })

  chartManager.setChart('timeline', newChart)
}
