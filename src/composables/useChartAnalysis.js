// composables/useChartAnalysis.js

import { ref } from 'vue'

// 1. 從 'chart.js' 導入所有需要的核心元件
import {
  Chart,
  LineController,
  BarController,
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

// 2. 導入日期適配器和 annotation 插件 (全部使用標準 import)
import 'chartjs-adapter-date-fns'
import annotationPlugin from 'chartjs-plugin-annotation'

// 3. 從您自己的檔案導入函式
import {
  getLatencyRating,
  getTotalSleepRating,
  getSleepOnsetRating,
  getLatencyChartBands,
  getTotalSleepReferenceForAge,
} from './sleep-references.js'

// 4. ✅ 一次性註冊所有元件和插件，保持整潔
Chart.register(
  // 核心元件...
  LineController,
  BarController,
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin,
)

const DARK_THEME = {
  color: 'rgba(241, 237, 224, 0.65)',
  borderColor: 'rgba(241, 237, 224, 0.1)',
  titleColor: '#F1EDE0',
  legendColor: 'rgba(241, 237, 224, 0.65)',
  canvasBg: '#131B33',
}

const LIGHT_THEME = {
  color: '#444',
  borderColor: 'rgba(0, 0, 0, 0.12)',
  titleColor: '#111',
  legendColor: '#444',
  canvasBg: '#ffffff',
}

const applyChartTheme = (theme) => {
  Chart.defaults.color = theme.color
  Chart.defaults.borderColor = theme.borderColor
  Chart.defaults.plugins.title.color = theme.titleColor
  Chart.defaults.plugins.legend.labels.color = theme.legendColor
}

// 全域套用深色主題（預設）
applyChartTheme(DARK_THEME)

// 工具函數
const normalizeTimestamp = (ts) => {
  if (!ts) return null
  if (typeof ts.toDate === 'function') {
    return ts.toDate()
  }
  const date = new Date(ts)
  return isNaN(date.getTime()) ? null : date
}

const getLocalDateString = (date) => {
  const pad = (n) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// 計算寶寶月齡的輔助函式
const calculateAgeInMonths = (dob) => {
  if (!dob) return null
  const birthDate = normalizeTimestamp(dob) // 確保 dob 是 Date 物件
  if (!birthDate) return null

  const today = new Date()
  let months = (today.getFullYear() - birthDate.getFullYear()) * 12
  months -= birthDate.getMonth()
  months += today.getMonth()
  return months <= 0 ? 0 : months
}

// 圖表記憶體管理器
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
        } catch (error) {
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
      } catch (error) {
        // 靜默處理錯誤
      }
    }
    this.chartInstances.delete(type)
  }

  destroyAll() {
    for (const [type, chart] of this.chartInstances) {
      if (chart && typeof chart.destroy === 'function') {
        try {
          chart.destroy()
        } catch (error) {
          // 靜默處理錯誤
        }
      }
    }
    this.chartInstances.clear()
  }
}

const chartManager = new ChartMemoryManager()

// 繪製無數據訊息
const drawNoDataMessage = (ctx, canvas, message) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = 'rgba(241, 237, 224, 0.35)'
  ctx.font = '20px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(message, canvas.width / 2, canvas.height / 2)
}

export function useChartAnalysis() {
  const chartInstance = ref(null)
  const isLoading = ref(false)

  // 銷毀現有圖表
  const destroyChart = () => {
    chartManager.destroyAll()
    chartInstance.value = null
  }

  // 計算睡眠統計（修改函式簽名以接收 baby 物件）
  const calculateSleepStatistics = (sleepData, baby) => {
    // 計算睡眠統計
    if (!sleepData || sleepData.length === 0) {
      return {
        totalRecords: 0,
        avgDailySleep: '0.0',
        avgSleepLatency: 0,
        avgNightBedtime: '--:--',
        avgSleepOnset: '--:--',
        avgWakeUpTime: '--:--',
        dateRange: '-',
      }
    }

    const records = sleepData
      .map((r) => ({
        ...r,
        bedTime: normalizeTimestamp(r.bedTimestamp),
        sleepTime: normalizeTimestamp(r.sleepTimestamp),
        wakeTime: normalizeTimestamp(r.wakeTimestamp),
      }))
      .filter((r) => r.sleepTime && r.wakeTime)
      .sort((a, b) => a.sleepTime - b.sleepTime)

    if (records.length === 0) {
      return {
        totalRecords: 0,
        avgDailySleep: '0.0',
        avgSleepLatency: 0,
        avgNightBedtime: '--:--',
        avgSleepOnset: '--:--',
        avgWakeUpTime: '--:--',
        dateRange: '-',
      }
    }

    // 計算每日總睡眠時間
    const dailyTotals = {}
    records.forEach((r) => {
      const durationHours = (r.wakeTime - r.sleepTime) / 3600000
      const dateKey = getLocalDateString(r.sleepTime)
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + durationHours
    })

    const dailySleepValues = Object.values(dailyTotals)
    const avgDailySleep =
      dailySleepValues.length > 0
        ? dailySleepValues.reduce((a, b) => a + b, 0) / dailySleepValues.length
        : 0

    // 分析邏輯夜晚數據
    const logicalNights = {}
    records.forEach((r) => {
      if (!r.bedTime) return
      const bedHour = r.bedTime.getHours()
      if (bedHour >= 9 && bedHour < 18) return // 排除白天睡眠

      let logicalDateStr = getLocalDateString(r.bedTime)
      if (bedHour < 9) {
        const logicalDate = new Date(r.bedTime)
        logicalDate.setDate(logicalDate.getDate() - 1)
        logicalDateStr = getLocalDateString(logicalDate)
      }

      if (!logicalNights[logicalDateStr]) {
        logicalNights[logicalDateStr] = {
          firstBedtime: r.bedTime,
          firstSleepTime: r.sleepTime,
          lastWakeTime: r.wakeTime,
          latencySum: (r.sleepTime - r.bedTime) / 60000,
          latencyCount: 1,
        }
      } else {
        logicalNights[logicalDateStr].lastWakeTime = r.wakeTime
      }
    })

    const nightsArray = Object.values(logicalNights)
    if (nightsArray.length === 0) {
      return {
        totalRecords: records.length,
        avgDailySleep: avgDailySleep.toFixed(1),
        avgSleepLatency: 0,
        avgNightBedtime: '--:--',
        avgSleepOnset: '--:--',
        avgWakeUpTime: '--:--',
        dateRange: '-',
      }
    }

    // 計算平均入睡延遲
    const totalLatency = nightsArray.reduce((sum, night) => sum + night.latencySum, 0)
    const avgSleepLatency = Math.round(totalLatency / nightsArray.length)

    // 計算平均時間的輔助函數
    const toTimeValue = (date) =>
      (date.getHours() < 12 ? date.getHours() + 24 : date.getHours()) * 60 + date.getMinutes()

    const calculateAverageTime = (dates) => {
      if (dates.length === 0) return '--:--'
      const avgValue = dates.reduce((sum, date) => sum + toTimeValue(date), 0) / dates.length
      const finalMinutes = Math.round(avgValue) % 1440
      const hours = Math.floor(finalMinutes / 60)
      const minutes = finalMinutes % 60
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }

    const avgNightBedtime = calculateAverageTime(nightsArray.map((n) => n.firstBedtime))
    const avgSleepOnset = calculateAverageTime(nightsArray.map((n) => n.firstSleepTime))
    const avgWakeUpTime = calculateAverageTime(nightsArray.map((n) => n.lastWakeTime))

    // 計算日期範圍
    const allDates = records.map((r) => r.sleepTime).sort((a, b) => a - b)
    const dateRange =
      allDates.length > 0
        ? `${getLocalDateString(allDates[0])} ~ ${getLocalDateString(allDates[allDates.length - 1])}`
        : '-'

    // 1. 先收集所有計算出的統計數據
    const stats = {
      totalRecords: records.length,
      avgDailySleep: avgDailySleep.toFixed(1),
      avgSleepLatency: avgSleepLatency >= 0 ? avgSleepLatency : 0,
      avgNightBedtime,
      avgSleepOnset,
      avgWakeUpTime,
      dateRange,
    }

    // 2. 計算寶寶月齡
    const ageInMonths = calculateAgeInMonths(baby?.dob)

    // 3. 根據統計數據和月齡獲取評級
    const ratings = {
      totalSleepRating: getTotalSleepRating(parseFloat(stats.avgDailySleep), ageInMonths),
      latencyRating: getLatencyRating(stats.avgSleepLatency),
      onsetRating: getSleepOnsetRating(stats.avgSleepOnset, ageInMonths),
      // 簡單的起床時間評級邏輯
      wakeupRating: (() => {
        const wakeupTime = stats.avgWakeUpTime
        if (wakeupTime === '--:--') return { level: 'unknown', message: '數據不足' }

        const [hours, minutes] = wakeupTime.split(':').map(Number)
        const totalMinutes = hours * 60 + minutes

        // 6:00-8:00 為理想起床時間
        if (totalMinutes >= 360 && totalMinutes <= 480) {
          return { level: 'good', message: '起床時間適中' }
        } else if (totalMinutes < 360) {
          return { level: 'early', message: '起床時間較早' }
        } else {
          return { level: 'late', message: '起床時間較晚' }
        }
      })(),
    }

    // 4. 將統計數據和評級合併後返回
    return {
      ...stats,
      ...ratings,
    }
  }

  // 處理每日睡眠數據
  const processDailySleepData = (sleepData) => {
    const dailyTotals = {}

    sleepData.forEach((record) => {
      const sleepTime = normalizeTimestamp(record.sleepTimestamp)
      const wakeTime = normalizeTimestamp(record.wakeTimestamp)

      if (!sleepTime || !wakeTime || wakeTime <= sleepTime) {
        return
      }

      const sleepDateStr = getLocalDateString(sleepTime)
      const wakeDateStr = getLocalDateString(wakeTime)
      const isOvernight = sleepDateStr !== wakeDateStr

      if (isOvernight) {
        // 跨夜睡眠處理
        const midnight = new Date(sleepTime)
        midnight.setHours(24, 0, 0, 0)
        const durationOnFirstDay = (midnight - sleepTime) / 3600000
        const durationOnSecondDay = (wakeTime - midnight) / 3600000

        if (!dailyTotals[sleepDateStr]) {
          dailyTotals[sleepDateStr] = {
            date: sleepDateStr,
            daySleep: 0,
            nightSleep: 0,
            totalSleep: 0,
          }
        }
        dailyTotals[sleepDateStr].nightSleep += durationOnFirstDay
        dailyTotals[sleepDateStr].totalSleep += durationOnFirstDay

        if (!dailyTotals[wakeDateStr]) {
          dailyTotals[wakeDateStr] = {
            date: wakeDateStr,
            daySleep: 0,
            nightSleep: 0,
            totalSleep: 0,
          }
        }
        dailyTotals[wakeDateStr].nightSleep += durationOnSecondDay
        dailyTotals[wakeDateStr].totalSleep += durationOnSecondDay
      } else {
        // 同日睡眠處理
        const durationHours = (wakeTime - sleepTime) / 3600000
        const dateKey = sleepDateStr

        if (!dailyTotals[dateKey]) {
          dailyTotals[dateKey] = { date: dateKey, daySleep: 0, nightSleep: 0, totalSleep: 0 }
        }

        const sleepHour = sleepTime.getHours()
        const isNightSleep = sleepHour >= 18 || sleepHour < 9

        if (isNightSleep) {
          dailyTotals[dateKey].nightSleep += durationHours
        } else {
          dailyTotals[dateKey].daySleep += durationHours
        }
        dailyTotals[dateKey].totalSleep += durationHours
      }
    })

    return Object.values(dailyTotals).sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  // 簡化的圖表渲染函數
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

      // 根據圖表類型渲染簡化版圖表
      switch (chartType) {
        case 'timeline':
          renderTimelineChart(sleepData, eventData, showEvents === 'true', showSleep === 'true')
          break
        case 'duration':
          renderDurationChart(sleepData)
          break
        case 'dailyDuration':
          const dailyData = processDailySleepData(sleepData)
          renderDailyDurationChart(dailyData, baby)
          break
        case 'bedtime':
          renderBedtimeChart(sleepData)
          break
        case 'latency':
          renderLatencyChart(sleepData)
          break
        case 'wakeCount':
          renderWakeCountChart(sleepData)
          break
        case 'weekly':
          const weeklyData = processDailySleepData(sleepData)
          renderWeeklyChart(weeklyData)
          break
        default:
          // 未實現的圖表類型
          break
      }
    } catch (error) {
      // 靜默處理錯誤
    } finally {
      isLoading.value = false
    }
  }

  // 簡化的時間軸圖表
  const renderTimelineChart = (sleepData, eventData, showEvents, showSleep) => {
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
          if ((sleepStart - bedTime) / 60000 < 180) {
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

      eventData.forEach((event, index) => {
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

            eventMarkers.forEach((marker, index) => {
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

  // 簡化的睡眠時長趨勢圖
  const renderDurationChart = (sleepData) => {
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

  // 🆕 修改後的每日睡眠分析圖 - 支援篩選器連動

  const renderDailyDurationChart = (dailyData, baby, dayRange = '14') => {
    const canvas = document.getElementById('dailyDurationCanvas')
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    chartManager.destroyChart('dailyDuration')

    if (!dailyData || dailyData.length === 0) {
      drawNoDataMessage(ctx, canvas, '沒有每日睡眠資料')
      return
    }

    // 🆕 根據篩選器動態決定顯示天數
    let daysToShow
    if (dayRange === 'all') {
      daysToShow = dailyData.length // 顯示全部數據
    } else {
      daysToShow = Math.min(parseInt(dayRange), dailyData.length) // 確保不超過現有數據
    }

    // 🆕 根據篩選器取得對應的數據範圍
    const recentData = dailyData.slice(-daysToShow) // 取最近N天的數據
    const labels = recentData.map((d) => d.date)
    const totalSleep = recentData.map((d) => d.totalSleep)
    const nightSleep = recentData.map((d) => d.nightSleep)
    const daySleep = recentData.map((d) => d.daySleep)

    // 獲取年齡層建議睡眠時數 - 支援多種日期欄位名稱
    const birthDate = baby?.dob || baby?.birthDate

    const ageInMonths = calculateAgeInMonths(birthDate)

    const sleepReference = getTotalSleepReferenceForAge(ageInMonths)

    // 👇 強制 Y 軸從 0 開始
    let yAxisMin = 0 // 🎯 關鍵修改：始終從 0 開始
    let yAxisMax = Math.max(...totalSleep) * 1.2 // 預設為最大值的 120%

    if (sleepReference) {
      const dataMax = Math.max(...totalSleep)
      const referenceMax = sleepReference.appropriate.max

      // Y 軸最大值：確保包含最大參考值，並留有餘裕
      yAxisMax = Math.max(
        dataMax * 1.2, // 數據最大值的 120%
        referenceMax + 2, // 參考最大值 + 2 小時餘裕
      )
    }

    // 準備 annotation 配置
    let annotations = {}
    if (sleepReference) {
      // 理想範圍 (綠色)
      annotations.recommendedBand = {
        type: 'box',
        yMin: sleepReference.recommended.min,
        yMax: sleepReference.recommended.max,
        backgroundColor: 'rgba(40, 167, 69, 0.15)',
        borderColor: 'rgba(40, 167, 69, 0.3)',
        borderWidth: 1,
        label: {
          enabled: true,
          content: `理想: ${sleepReference.recommended.min}-${sleepReference.recommended.max}h`,
          position: 'start',
          backgroundColor: 'rgba(40, 167, 69, 0.8)',
          color: 'white',
          font: {
            size: 11,
          },
        },
      }

      // 可接受範圍下限 (黃色)
      if (sleepReference.appropriate.min < sleepReference.recommended.min) {
        annotations.appropriateLowerBand = {
          type: 'box',
          yMin: sleepReference.appropriate.min,
          yMax: sleepReference.recommended.min,
          backgroundColor: 'rgba(255, 193, 7, 0.15)',
          borderColor: 'rgba(255, 193, 7, 0.3)',
          borderWidth: 1,
        }
      }

      // 可接受範圍上限 (黃色)
      if (sleepReference.appropriate.max > sleepReference.recommended.max) {
        annotations.appropriateUpperBand = {
          type: 'box',
          yMin: sleepReference.recommended.max,
          yMax: sleepReference.appropriate.max,
          backgroundColor: 'rgba(255, 193, 7, 0.15)',
          borderColor: 'rgba(255, 193, 7, 0.3)',
          borderWidth: 1,
          label: {
            enabled: true,
            content: `可接受: ${sleepReference.appropriate.min}-${sleepReference.appropriate.max}h`,
            position: 'end',
            backgroundColor: 'rgba(255, 193, 7, 0.8)',
            color: 'white',
            font: {
              size: 11,
            },
          },
        }
      }

      // 理想範圍邊界線
      annotations.recommendedMinLine = {
        type: 'line',
        yMin: sleepReference.recommended.min,
        yMax: sleepReference.recommended.min,
        borderColor: 'rgba(40, 167, 69, 0.8)',
        borderWidth: 2,
        borderDash: [5, 5],
      }

      annotations.recommendedMaxLine = {
        type: 'line',
        yMin: sleepReference.recommended.max,
        yMax: sleepReference.recommended.max,
        borderColor: 'rgba(40, 167, 69, 0.8)',
        borderWidth: 2,
        borderDash: [5, 5],
      }
    }

    // 🆕 動態生成圖表標題，包含篩選範圍信息
    let chartTitle = '📈 每日睡眠分析'
    if (dayRange !== 'all') {
      chartTitle += ` (最近 ${dayRange} 天)`
    } else {
      chartTitle += ` (全部 ${recentData.length} 天)`
    }

    const newChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: '總睡眠',
            data: totalSleep,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            borderWidth: 3,
            fill: false,
            tension: 0.1,
          },
          {
            label: '夜晚睡眠',
            data: nightSleep,
            borderColor: '#885ead',
            borderWidth: 2,
            fill: false,
            tension: 0.1,
          },
          {
            label: '白天睡眠',
            data: daySleep,
            borderColor: '#ff9800',
            borderWidth: 2,
            fill: false,
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            // 🎯 關鍵：強制設定 Y 軸範圍
            min: yAxisMin, // 始終從 0 開始
            max: yAxisMax, // 確保參考值可見
            title: {
              display: true,
              text: '小時',
            },
            ticks: {
              stepSize: 1, // 每 1 小時一個刻度
              callback: function (value) {
                return value.toFixed(0) + 'h'
              },
            },
            grid: {
              color: 'rgba(128, 128, 128, 0.1)',
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
            text: chartTitle, // 🆕 使用動態標題
          },
          // annotation 插件配置
          annotation: sleepReference
            ? {
                drawTime: 'beforeDatasetsDraw',
                annotations: annotations,
              }
            : undefined,
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              generateLabels: function (chart) {
                const original = Chart.defaults.plugins.legend.labels.generateLabels(chart)

                // 如果有睡眠參考數據，添加參考線圖例
                if (sleepReference) {
                  original.push({
                    text: `🟢 理想範圍 (${sleepReference.recommended.min}-${sleepReference.recommended.max}h)`,
                    fillStyle: 'rgba(40, 167, 69, 0.3)',
                    strokeStyle: 'rgba(40, 167, 69, 0.8)',
                    lineWidth: 2,
                  })
                  original.push({
                    text: `🟡 可接受範圍 (${sleepReference.appropriate.min}-${sleepReference.appropriate.max}h)`,
                    fillStyle: 'rgba(255, 193, 7, 0.3)',
                    strokeStyle: 'rgba(255, 193, 7, 0.8)',
                    lineWidth: 1,
                  })
                }

                return original
              },
              usePointStyle: true,
              padding: 15,
            },
          },
          tooltip: {
            callbacks: {
              afterBody: function (context) {
                if (sleepReference && context.length > 0) {
                  const value = context[0].parsed.y
                  const rating = getTotalSleepRating(value, ageInMonths)

                  let statusText = ''
                  if (rating === 'good') statusText = '✅ 理想範圍'
                  else if (rating === 'acceptable') statusText = '⚠️ 可接受範圍'
                  else if (rating === 'improvement') statusText = '❗ 需要關注'

                  return statusText ? [`狀態: ${statusText}`] : []
                }
                return []
              },
            },
          },
        },
        animation: {
          duration: 1000,
          easing: 'easeInOutQuart',
        },
      },
    })

    chartManager.setChart('dailyDuration', newChart)
  }

  // 🆕 新增：包裝函數，方便從 Vue 組件中調用
  const renderDailyDurationChartWithFilter = (dailyData, baby, chartFilter) => {
    const dayRange = chartFilter?.dayRange || '14'
    return renderDailyDurationChart(dailyData, baby, dayRange)
  }
  //就寢時間
  const renderBedtimeChart = (sleepData) => {
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

    // 🔧 創建唯一的標籤，確保每個記錄都有獨立的X軸位置
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
          id: 'timeLabels', // 🆕 顯示時間標籤
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

  // 入睡耗時趨勢圖
  const renderLatencyChart = (sleepData) => {
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

  // 清醒次數趨勢圖
  const renderWakeCountChart = (sleepData) => {
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
      drawNoDataMessage(ctx, canvas, '沒有夜晚睡眠資料可供分析清醒次數')
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
            borderColor: '#f44336',
            backgroundColor: 'rgba(244, 67, 54, 0.1)',
            tension: 0.3,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: '#f44336',
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
            text: '🌙 夜間清醒次數趨勢',
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

  const renderWeeklyChart = (dailyData) => {
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

  return {
    chartInstance,
    isLoading,
    calculateSleepStatistics,
    processDailySleepData,
    renderChart,
    renderDailyDurationChart,
    destroyChart,
    normalizeTimestamp,
    getLocalDateString,
    calculateAgeInMonths,
    applyChartTheme,
    DARK_THEME,
    LIGHT_THEME,
  }
}
