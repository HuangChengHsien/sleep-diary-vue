/**
 * 睡眠參考數據
 * 根據使用者提供的專家共識與研究報告
 */

// ======================= 輔助函式：時間轉換 =======================
/**
 * 將 "HH:mm" 格式的時間字串轉換為從午夜起算的總分鐘數
 * @param {string} timeStr - "HH:mm" 格式的時間
 * @returns {number|null} - 總分鐘數或在格式錯誤時返回 null
 */
function timeToMinutes(timeStr) {
  if (!timeStr || !/^\d{1,2}:\d{2}$/.test(timeStr)) {
    return null
  }
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

// ======================= 入睡耗時 (Sleep Latency) =======================
export const sleepLatencyLevels = {
  good: { max: 15, color: '🟢', text: '良好' },
  acceptable: { max: 30, color: '🟡', text: '可接受' },
  improvement: { min: 31, color: '🔴', text: '需改善' },
}

export function getLatencyRating(latencyMinutes) {
  if (latencyMinutes === null || isNaN(latencyMinutes)) return null
  if (latencyMinutes <= sleepLatencyLevels.good.max) return 'good'
  if (latencyMinutes <= sleepLatencyLevels.acceptable.max) return 'acceptable'
  return 'improvement'
}

export function getLatencyChartBands() {
  return {
    good: { yMin: 0, yMax: 15 },
    acceptable: { yMin: 15, yMax: 30 },
  }
}

// ======================= 每日總睡眠 (Total Sleep) =======================
// 數據來源: National Sleep Foundation (NSF)
const totalSleepReference = {
  // key 為年齡區間 (月)
  '0-3': { recommended: { min: 14, max: 17 }, appropriate: { min: 11, max: 19 } },
  '4-11': { recommended: { min: 12, max: 15 }, appropriate: { min: 10, max: 18 } },
  '12-35': { recommended: { min: 11, max: 14 }, appropriate: { min: 9, max: 16 } },
  '36-71': { recommended: { min: 10, max: 13 }, appropriate: { min: 8, max: 14 } },
  '72-167': { recommended: { min: 9, max: 11 }, appropriate: { min: 7, max: 12 } }, // 6-13歲
  '168-215': { recommended: { min: 8, max: 10 }, appropriate: { min: 7, max: 11 } }, // 14-17歲
}

export const totalSleepLevels = {
  good: { color: '🟢', text: '理想範圍' },
  acceptable: { color: '🟡', text: '可接受範圍' },
  improvement: { color: '🔴', text: '需注意' },
}

/**
 * 根據寶寶月齡獲取總睡眠時長的參考範圍
 * @param {number} ageInMonths - 寶寶的月齡
 * @returns {object|null} - 包含 recommended 和 appropriate 範圍的物件，或 null
 */
export function getTotalSleepReferenceForAge(ageInMonths) {
  if (ageInMonths === null || isNaN(ageInMonths)) return null

  if (ageInMonths <= 3) return totalSleepReference['0-3']
  if (ageInMonths <= 11) return totalSleepReference['4-11']
  if (ageInMonths <= 35) return totalSleepReference['12-35']
  if (ageInMonths <= 71) return totalSleepReference['36-71']
  if (ageInMonths <= 167) return totalSleepReference['72-167']
  if (ageInMonths <= 215) return totalSleepReference['168-215']

  return null // 其他年齡段暫無數據
}

/**
 * 根據總睡眠時長（小時）及其年齡獲取品質評級
 * @param {number} durationHours - 平均總睡眠時長（小時）
 * @param {number} ageInMonths - 寶寶的月齡
 * @returns {string|null} - 'good', 'acceptable', 或 'improvement'
 */
export function getTotalSleepRating(durationHours, ageInMonths) {
  const reference = getTotalSleepReferenceForAge(ageInMonths)
  if (!reference || durationHours === null || isNaN(durationHours)) {
    return null
  }

  if (durationHours >= reference.recommended.min && durationHours <= reference.recommended.max) {
    return 'good'
  }
  if (durationHours >= reference.appropriate.min && durationHours <= reference.appropriate.max) {
    return 'acceptable'
  }
  return 'improvement'
}

// ======================= 夜晚入睡時間 (Sleep Onset) =======================
const sleepOnsetTimeReference = {
  // key 為年齡區間 (月), value 為 95% CI 的分鐘數
  '36-71': { min: timeToMinutes('21:18'), max: timeToMinutes('21:44') }, // 3-5歲
  // '72-107' (6-8歲) 的數據不存在，已移除
  '108-143': { min: timeToMinutes('22:51'), max: timeToMinutes('23:28') }, // 9-11歲
  '144-179': { min: timeToMinutes('22:58'), max: timeToMinutes('23:56') }, // 12-14歲
}

export const sleepOnsetLevels = {
  good: { color: '🟢', text: '理想範圍' },
  acceptable: { color: '🟡', text: '可接受範圍' },
  improvement: { color: '🔴', text: '需注意' },
}

/**
 * 根據寶寶月齡獲取入睡時間的參考範圍
 * @param {number} ageInMonths - 寶寶的月齡
 * @returns {object|null} - 包含 min 和 max 分鐘數的物件，或 null
 */
export function getSleepOnsetTimeReferenceForAge(ageInMonths) {
  if (ageInMonths === null || isNaN(ageInMonths)) return null
  if (ageInMonths >= 36 && ageInMonths <= 71) return sleepOnsetTimeReference['36-71']
  // '72-107' (6-8歲) 的條件已移除
  if (ageInMonths >= 108 && ageInMonths <= 143) return sleepOnsetTimeReference['108-143']
  if (ageInMonths >= 144 && ageInMonths <= 179) return sleepOnsetTimeReference['144-179']
  return null
}

/**
 * 根據平均入睡時間及其年齡獲取品質評級
 * @param {string} avgOnsetTimeStr - "HH:mm" 格式的平均入睡時間
 * @param {number} ageInMonths - 寶寶的月齡
 * @returns {string|null} - 'good', 'acceptable', 或 'improvement'
 */
export function getSleepOnsetRating(avgOnsetTimeStr, ageInMonths) {
  const reference = getSleepOnsetTimeReferenceForAge(ageInMonths)
  const avgMinutes = timeToMinutes(avgOnsetTimeStr)

  if (!reference || avgMinutes === null) {
    return null
  }

  // 理想範圍：落在 95% CI 內
  if (avgMinutes >= reference.min && avgMinutes <= reference.max) {
    return 'good'
  }
  // 可接受範圍：在 95% CI 外側 30 分鐘的緩衝區內
  if (avgMinutes >= reference.min - 30 && avgMinutes <= reference.max + 30) {
    return 'acceptable'
  }
  // 需改善範圍：超出緩衝區
  return 'improvement'
}

// ======================= 夜晚起床時間 (Sleep Offset) =======================
const sleepOffsetTimeReference = {
  // key 為年齡區間 (月), value 為 95% CI 的分鐘數
  '36-71': { min: timeToMinutes('6:56'), max: timeToMinutes('7:18') }, // 3-5歲
  '72-107': { min: timeToMinutes('6:09'), max: timeToMinutes('7:28') }, // 6-8歲
  '108-143': { min: timeToMinutes('6:42'), max: timeToMinutes('7:12') }, // 9-11歲
  '144-179': { min: timeToMinutes('7:00'), max: timeToMinutes('7:36') }, // 12-14歲
  '180-227': { min: timeToMinutes('6:58'), max: timeToMinutes('7:45') }, // 15-18歲
}

export const sleepOffsetLevels = {
  good: { color: '🟢', text: '理想範圍' },
  acceptable: { color: '🟡', text: '可接受範圍' },
  improvement: { color: '🔴', text: '需注意' },
}

/**
 * 根據寶寶月齡獲取起床時間的參考範圍
 * @param {number} ageInMonths - 寶寶的月齡
 * @returns {object|null} - 包含 min 和 max 分鐘數的物件，或 null
 */
export function getSleepOffsetTimeReferenceForAge(ageInMonths) {
  if (ageInMonths === null || isNaN(ageInMonths)) return null
  if (ageInMonths >= 36 && ageInMonths <= 71) return sleepOffsetTimeReference['36-71']
  if (ageInMonths >= 72 && ageInMonths <= 107) return sleepOffsetTimeReference['72-107']
  if (ageInMonths >= 108 && ageInMonths <= 143) return sleepOffsetTimeReference['108-143']
  if (ageInMonths >= 144 && ageInMonths <= 179) return sleepOffsetTimeReference['144-179']
  if (ageInMonths >= 180 && ageInMonths <= 227) return sleepOffsetTimeReference['180-227']
  return null
}

/**
 * 根據平均起床時間及其年齡獲取品質評級
 * @param {string} avgOffsetTimeStr - "HH:mm" 格式的平均起床時間
 * @param {number} ageInMonths - 寶寶的月齡
 * @returns {string|null} - 'good', 'acceptable', 或 'improvement'
 */
export function getSleepOffsetRating(avgOffsetTimeStr, ageInMonths) {
  const reference = getSleepOffsetTimeReferenceForAge(ageInMonths)
  const avgMinutes = timeToMinutes(avgOffsetTimeStr)

  if (!reference || avgMinutes === null) {
    return null
  }

  // 理想範圍：落在 95% CI 內
  if (avgMinutes >= reference.min && avgMinutes <= reference.max) {
    return 'good'
  }
  // 可接受範圍：在 95% CI 外側 30 分鐘的緩衝區內
  if (avgMinutes >= reference.min - 30 && avgMinutes <= reference.max + 30) {
    return 'acceptable'
  }
  // 需改善範圍：超出緩衝區
  return 'improvement'
}

// ======================= 時間轉換輔助函式 (給外部使用) =======================
/**
 * 將分鐘數轉換為 "HH:mm" 格式
 * @param {number} minutes - 從午夜起算的總分鐘數
 * @returns {string} - "HH:mm" 格式的時間字串
 */
export function minutesToTime(minutes) {
  if (minutes === null || isNaN(minutes)) return null
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * 將 "HH:mm" 格式的時間字串轉換為從午夜起算的總分鐘數 (匯出版本)
 * @param {string} timeStr - "HH:mm" 格式的時間
 * @returns {number|null} - 總分鐘數或在格式錯誤時返回 null
 */
export function timeStringToMinutes(timeStr) {
  return timeToMinutes(timeStr)
}
