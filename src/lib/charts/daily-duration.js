// src/lib/charts/daily-duration.js
// 每日睡眠分析圖（總計 / 夜晚 / 白天），並依年齡疊上建議睡眠時數的參考色帶。

import { Chart } from './chart-setup.js'
import { chartManager } from './chart-manager.js'
import { drawNoDataMessage } from './no-data.js'
import { calculateAgeInMonths } from '@/lib/chart-calc.js'
import { getTotalSleepReferenceForAge, getTotalSleepRating } from '@/lib/sleep-references.js'

export const renderDailyDurationChart = (dailyData, baby, dayRange = '14') => {
  const canvas = document.getElementById('dailyDurationCanvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  chartManager.destroyChart('dailyDuration')

  if (!dailyData || dailyData.length === 0) {
    drawNoDataMessage(ctx, canvas, '沒有每日睡眠資料')
    return
  }

  // 根據篩選器動態決定顯示天數
  let daysToShow
  if (dayRange === 'all') {
    daysToShow = dailyData.length // 顯示全部數據
  } else {
    daysToShow = Math.min(parseInt(dayRange), dailyData.length) // 確保不超過現有數據
  }

  // 根據篩選器取得對應的數據範圍
  const recentData = dailyData.slice(-daysToShow) // 取最近N天的數據
  const labels = recentData.map((d) => d.date)
  const totalSleep = recentData.map((d) => d.totalSleep)
  const nightSleep = recentData.map((d) => d.nightSleep)
  const daySleep = recentData.map((d) => d.daySleep)

  // 獲取年齡層建議睡眠時數 - 支援多種日期欄位名稱
  const birthDate = baby?.dob || baby?.birthDate

  const ageInMonths = calculateAgeInMonths(birthDate)

  const sleepReference = getTotalSleepReferenceForAge(ageInMonths)

  // 強制 Y 軸從 0 開始
  let yAxisMin = 0
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

  // 動態生成圖表標題，包含篩選範圍信息
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
          // 強制設定 Y 軸範圍
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
          text: chartTitle,
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
