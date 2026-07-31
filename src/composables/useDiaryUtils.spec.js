// src/composables/useDiaryUtils.spec.js
// 純函式測試：涵蓋日期、時長、跨日等容易出錯的邊界情境。
// UI／DOM／localStorage 相關（toggleTheme、applyTheme）刻意不測。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useDiaryUtils } from './useDiaryUtils'

// 每次呼叫都拿新的 utils（避免不同測試之間共用 currentTheme ref 造成干擾）
const utils = () => useDiaryUtils()

describe('calculateAge', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T12:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('沒有生日回傳「未設定」', () => {
    expect(utils().calculateAge(null)).toBe('未設定')
    expect(utils().calculateAge('')).toBe('未設定')
    expect(utils().calculateAge(undefined)).toBe('未設定')
  })

  // 實作使用 Math.ceil，語意是「進入第 N 天」（12/31 生、1/15 = 第 16 天）
  it('未滿 30 天以「N 天」表示', () => {
    expect(utils().calculateAge('2025-12-31')).toBe('16 天')
  })

  it('30~364 天以「N 個月 N 天」表示', () => {
    // 2025-10-15 → 93 天 = 3 個月 3 天（30 天當作一個月的近似）
    expect(utils().calculateAge('2025-10-15')).toBe('3 個月 3 天')
  })

  it('滿一年以「N 歲 N 個月」表示', () => {
    // 2023-01-15 → 3 年
    expect(utils().calculateAge('2023-01-15')).toBe('3 歲 0 個月')
  })
})

describe('formatDuration', () => {
  const { formatDuration } = utils()

  it('0、null、負數皆回傳「0小時0分鐘」', () => {
    expect(formatDuration(0)).toBe('0小時0分鐘')
    expect(formatDuration(null)).toBe('0小時0分鐘')
    expect(formatDuration(undefined)).toBe('0小時0分鐘')
    expect(formatDuration(-30)).toBe('0小時0分鐘')
  })

  it('小於 60 分鐘只顯示分鐘', () => {
    expect(formatDuration(45)).toBe('0小時45分鐘')
  })

  it('整數小時', () => {
    expect(formatDuration(120)).toBe('2小時0分鐘')
  })

  it('小時 + 分鐘', () => {
    expect(formatDuration(150)).toBe('2小時30分鐘')
  })
})

describe('normalizeTimestamp', () => {
  const { normalizeTimestamp } = utils()

  it('null / undefined 回傳 null', () => {
    expect(normalizeTimestamp(null)).toBeNull()
    expect(normalizeTimestamp(undefined)).toBeNull()
  })

  it('Date 物件原樣回傳', () => {
    const d = new Date('2026-01-01T08:00:00')
    expect(normalizeTimestamp(d)).toBeInstanceOf(Date)
  })

  it('ISO 字串轉為 Date', () => {
    const result = normalizeTimestamp('2026-01-01T08:00:00Z')
    expect(result).toBeInstanceOf(Date)
    expect(result.toISOString()).toBe('2026-01-01T08:00:00.000Z')
  })

  it('無效字串回傳 null', () => {
    expect(normalizeTimestamp('not a date')).toBeNull()
  })

  it('支援 Firestore 風格的 { toDate() }', () => {
    const fakeTs = { toDate: () => new Date('2026-01-01T08:00:00Z') }
    const result = normalizeTimestamp(fakeTs)
    expect(result).toBeInstanceOf(Date)
    expect(result.toISOString()).toBe('2026-01-01T08:00:00.000Z')
  })
})

describe('getLocalDateString', () => {
  const { getLocalDateString } = utils()

  it('空值回傳空字串', () => {
    expect(getLocalDateString(null)).toBe('')
    expect(getLocalDateString(undefined)).toBe('')
  })

  it('Date 物件取出日期部分', () => {
    // 使用 UTC 中午避免時區跨日
    const d = new Date('2026-01-15T12:00:00Z')
    expect(getLocalDateString(d)).toBe('2026-01-15')
  })

  it('接受 ISO 字串', () => {
    expect(getLocalDateString('2026-01-15T12:00:00Z')).toBe('2026-01-15')
  })
})

describe('calculateSleepDuration', () => {
  const { calculateSleepDuration } = utils()

  it('任一時間缺失回傳 null', () => {
    expect(calculateSleepDuration(null, new Date())).toBeNull()
    expect(calculateSleepDuration(new Date(), null)).toBeNull()
    expect(calculateSleepDuration(null, null)).toBeNull()
  })

  it('同日：13:00 睡到 15:30 = 150 分鐘（午睡）', () => {
    const sleep = new Date('2026-01-15T13:00:00')
    const wake  = new Date('2026-01-15T15:30:00')
    expect(calculateSleepDuration(sleep, wake)).toBe(150)
  })

  it('跨日：22:00 → 隔天 06:00 = 480 分鐘（8 小時）', () => {
    // 只有時間部分「看起來早於入睡」時觸發跨日修正
    const sleep = new Date('2026-01-15T22:00:00')
    const wake  = new Date('2026-01-15T06:00:00') // 同日期物件，時間較早 → 應被 +1 天
    expect(calculateSleepDuration(sleep, wake)).toBe(480)
  })

  it('無效輸入回傳 null', () => {
    expect(calculateSleepDuration('not a date', new Date())).toBeNull()
  })
})

describe('calculateFallAsleepDuration', () => {
  const { calculateFallAsleepDuration } = utils()

  it('任一時間缺失回傳 null', () => {
    expect(calculateFallAsleepDuration(null, new Date())).toBeNull()
    expect(calculateFallAsleepDuration(new Date(), null)).toBeNull()
  })

  it('上床 21:30、入睡 21:45 = 15 分鐘', () => {
    const bed   = new Date('2026-01-15T21:30:00')
    const sleep = new Date('2026-01-15T21:45:00')
    expect(calculateFallAsleepDuration(bed, sleep)).toBe(15)
  })

  it('跨日：上床 23:50、入睡 00:20 = 30 分鐘', () => {
    const bed   = new Date('2026-01-15T23:50:00')
    const sleep = new Date('2026-01-15T00:20:00') // 時間較早 → +1 天
    expect(calculateFallAsleepDuration(bed, sleep)).toBe(30)
  })

  it('上床即秒睡 = 0 分鐘', () => {
    const bed   = new Date('2026-01-15T21:30:00')
    const sleep = new Date('2026-01-15T21:30:00')
    expect(calculateFallAsleepDuration(bed, sleep)).toBe(0)
  })
})

describe('isNightSleep', () => {
  const { isNightSleep } = utils()

  it('空值回傳 false', () => {
    expect(isNightSleep(null)).toBe(false)
    expect(isNightSleep(undefined)).toBe(false)
  })

  // 邊界：18:00 起算「夜間」，09:00 起算「白天」
  it('18:00 屬夜間', () => {
    expect(isNightSleep(new Date('2026-01-15T18:00:00'))).toBe(true)
  })
  it('17:59 不算夜間', () => {
    expect(isNightSleep(new Date('2026-01-15T17:59:00'))).toBe(false)
  })
  it('08:59 屬夜間', () => {
    expect(isNightSleep(new Date('2026-01-15T08:59:00'))).toBe(true)
  })
  it('09:00 不算夜間', () => {
    expect(isNightSleep(new Date('2026-01-15T09:00:00'))).toBe(false)
  })
  it('凌晨 03:00 屬夜間', () => {
    expect(isNightSleep(new Date('2026-01-15T03:00:00'))).toBe(true)
  })
  it('中午 12:00 不算夜間', () => {
    expect(isNightSleep(new Date('2026-01-15T12:00:00'))).toBe(false)
  })
})
