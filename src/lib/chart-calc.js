// src/lib/chart-calc.js
// 睡眠圖表相關的純計算函式。與 Chart.js / DOM 無依賴，可獨立測試。

import {
  getLatencyRating,
  getTotalSleepRating,
  getSleepOnsetRating,
} from '@/composables/sleep-references.js'

// ── 基本工具 ──────────────────────────────────────

export const normalizeTimestamp = (ts) => {
  if (!ts) return null
  if (typeof ts.toDate === 'function') {
    return ts.toDate()
  }
  const date = new Date(ts)
  return isNaN(date.getTime()) ? null : date
}

export const getLocalDateString = (date) => {
  const pad = (n) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// ── 月齡計算 ──────────────────────────────────────
// 只用 year+month 相減，忽略 day-of-month（見 useChartAnalysis.spec.js 中的釘住測試）

export const calculateAgeInMonths = (dob) => {
  if (!dob) return null
  const birthDate = normalizeTimestamp(dob)
  if (!birthDate) return null

  const today = new Date()
  let months = (today.getFullYear() - birthDate.getFullYear()) * 12
  months -= birthDate.getMonth()
  months += today.getMonth()
  return months <= 0 ? 0 : months
}

// ── 睡眠統計 ──────────────────────────────────────

export const calculateSleepStatistics = (sleepData, baby) => {
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

  const stats = {
    totalRecords: records.length,
    avgDailySleep: avgDailySleep.toFixed(1),
    avgSleepLatency: avgSleepLatency >= 0 ? avgSleepLatency : 0,
    avgNightBedtime,
    avgSleepOnset,
    avgWakeUpTime,
    dateRange,
  }

  const ageInMonths = calculateAgeInMonths(baby?.dob)

  const ratings = {
    totalSleepRating: getTotalSleepRating(parseFloat(stats.avgDailySleep), ageInMonths),
    latencyRating: getLatencyRating(stats.avgSleepLatency),
    onsetRating: getSleepOnsetRating(stats.avgSleepOnset, ageInMonths),
    // 起床時間評級：6:00–8:00 為理想範圍
    wakeupRating: (() => {
      const wakeupTime = stats.avgWakeUpTime
      if (wakeupTime === '--:--') return { level: 'unknown', message: '數據不足' }

      const [hours, minutes] = wakeupTime.split(':').map(Number)
      const totalMinutes = hours * 60 + minutes

      if (totalMinutes >= 360 && totalMinutes <= 480) {
        return { level: 'good', message: '起床時間適中' }
      } else if (totalMinutes < 360) {
        return { level: 'early', message: '起床時間較早' }
      } else {
        return { level: 'late', message: '起床時間較晚' }
      }
    })(),
  }

  return { ...stats, ...ratings }
}

// ── 每日睡眠處理 ──────────────────────────────────

export const processDailySleepData = (sleepData) => {
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
