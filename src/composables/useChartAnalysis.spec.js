// src/composables/useChartAnalysis.spec.js
// 純函式測試：涵蓋不依賴 Chart.js/canvas/DOM 的計算邏輯。
// 這些函式現已抽到 @/lib/chart-calc，測試也直接對純模組作用。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  calculateAgeInMonths,
  getLogicalDateString,
  processDailySleepData,
  calculateSleepStatistics,
} from '@/lib/chart-calc'

describe('calculateAgeInMonths', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T12:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('空值回傳 null', () => {
    expect(calculateAgeInMonths(null)).toBeNull()
    expect(calculateAgeInMonths(undefined)).toBeNull()
    expect(calculateAgeInMonths('')).toBeNull()
  })

  it('無效日期回傳 null', () => {
    expect(calculateAgeInMonths('not a date')).toBeNull()
  })

  it('同月出生 → 0 個月', () => {
    expect(calculateAgeInMonths('2026-01-15')).toBe(0)
  })

  it('滿一年 → 12 個月', () => {
    expect(calculateAgeInMonths('2025-01-15')).toBe(12)
  })

  it('未來日期 → 0（clamp 至非負）', () => {
    expect(calculateAgeInMonths('2027-01-15')).toBe(0)
  })

  it('半年 → 6 個月', () => {
    expect(calculateAgeInMonths('2025-07-01')).toBe(6)
  })

  it('支援 { toDate() } (Firestore-like)', () => {
    const dob = { toDate: () => new Date('2025-01-15') }
    expect(calculateAgeInMonths(dob)).toBe(12)
  })

  // 注意：實作只用 year+month，忽略 day-of-month
  it('忽略 day-of-month（2025-01-31 → 2026-01-15 仍算 12 個月）', () => {
    expect(calculateAgeInMonths('2025-01-31')).toBe(12)
  })
})

describe('getLogicalDateString', () => {
  it('09:00 之後維持當天', () => {
    expect(getLogicalDateString(new Date('2026-01-15T09:00:00'))).toBe('2026-01-15')
    expect(getLogicalDateString(new Date('2026-01-15T13:00:00'))).toBe('2026-01-15')
    expect(getLogicalDateString(new Date('2026-01-15T23:59:00'))).toBe('2026-01-15')
  })

  it('09:00 之前歸屬前一天', () => {
    expect(getLogicalDateString(new Date('2026-01-15T00:00:00'))).toBe('2026-01-14')
    expect(getLogicalDateString(new Date('2026-01-15T03:30:00'))).toBe('2026-01-14')
    expect(getLogicalDateString(new Date('2026-01-15T08:59:00'))).toBe('2026-01-14')
  })

  it('跨月與跨年邊界正確回退', () => {
    expect(getLogicalDateString(new Date('2026-03-01T02:00:00'))).toBe('2026-02-28')
    expect(getLogicalDateString(new Date('2026-01-01T02:00:00'))).toBe('2025-12-31')
  })
})

describe('processDailySleepData', () => {
  it('空陣列回傳空陣列', () => {
    expect(processDailySleepData([])).toEqual([])
  })

  it('缺失 sleepTimestamp 或 wakeTimestamp 的紀錄會被跳過', () => {
    const records = [
      { sleepTimestamp: null, wakeTimestamp: '2026-01-15T06:00:00' },
      { sleepTimestamp: '2026-01-14T22:00:00', wakeTimestamp: null },
    ]
    expect(processDailySleepData(records)).toEqual([])
  })

  it('wakeTime <= sleepTime 會被跳過（無效資料）', () => {
    const records = [
      { sleepTimestamp: '2026-01-15T08:00:00', wakeTimestamp: '2026-01-15T08:00:00' },
      { sleepTimestamp: '2026-01-15T08:00:00', wakeTimestamp: '2026-01-15T07:00:00' },
    ]
    expect(processDailySleepData(records)).toEqual([])
  })

  it('同日夜間睡眠：22:00 → 23:30 記為 1.5 小時 nightSleep', () => {
    const records = [
      { sleepTimestamp: '2026-01-15T22:00:00', wakeTimestamp: '2026-01-15T23:30:00' },
    ]
    expect(processDailySleepData(records)).toEqual([
      { date: '2026-01-15', daySleep: 0, nightSleep: 1.5, totalSleep: 1.5 },
    ])
  })

  it('同日白天睡眠：13:00 → 15:00 記為 2 小時 daySleep', () => {
    const records = [
      { sleepTimestamp: '2026-01-15T13:00:00', wakeTimestamp: '2026-01-15T15:00:00' },
    ]
    expect(processDailySleepData(records)).toEqual([
      { date: '2026-01-15', daySleep: 2, nightSleep: 0, totalSleep: 2 },
    ])
  })

  it('跨夜睡眠：22:00 → 隔天 06:00 拆分為前日 2h + 隔日 6h', () => {
    const records = [
      { sleepTimestamp: '2026-01-14T22:00:00', wakeTimestamp: '2026-01-15T06:00:00' },
    ]
    const result = processDailySleepData(records)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ date: '2026-01-14', nightSleep: 2, totalSleep: 2 })
    expect(result[1]).toMatchObject({ date: '2026-01-15', nightSleep: 6, totalSleep: 6 })
  })

  it('多筆同日：白天與夜間分別累加', () => {
    const records = [
      { sleepTimestamp: '2026-01-15T13:00:00', wakeTimestamp: '2026-01-15T14:00:00' }, // 白天 1h
      { sleepTimestamp: '2026-01-15T15:00:00', wakeTimestamp: '2026-01-15T16:30:00' }, // 白天 1.5h
      { sleepTimestamp: '2026-01-15T22:00:00', wakeTimestamp: '2026-01-15T23:00:00' }, // 夜間 1h
    ]
    expect(processDailySleepData(records)).toEqual([
      { date: '2026-01-15', daySleep: 2.5, nightSleep: 1, totalSleep: 3.5 },
    ])
  })

  it('結果按日期升序排序（不論輸入順序）', () => {
    const records = [
      { sleepTimestamp: '2026-01-20T13:00:00', wakeTimestamp: '2026-01-20T14:00:00' },
      { sleepTimestamp: '2026-01-15T13:00:00', wakeTimestamp: '2026-01-15T14:00:00' },
      { sleepTimestamp: '2026-01-18T13:00:00', wakeTimestamp: '2026-01-18T14:00:00' },
    ]
    const result = processDailySleepData(records)
    expect(result.map((r) => r.date)).toEqual(['2026-01-15', '2026-01-18', '2026-01-20'])
  })
})

describe('calculateSleepStatistics', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T12:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  const empty = {
    totalRecords: 0,
    avgDailySleep: '0.0',
    avgSleepLatency: 0,
    avgNightBedtime: '--:--',
    avgSleepOnset: '--:--',
    avgWakeUpTime: '--:--',
    dateRange: '-',
  }

  it('空/null/undefined 資料回傳 dummy stats', () => {
    expect(calculateSleepStatistics([])).toMatchObject(empty)
    expect(calculateSleepStatistics(null)).toMatchObject(empty)
    expect(calculateSleepStatistics(undefined)).toMatchObject(empty)
  })

  it('全部缺失 sleepTimestamp 或 wakeTimestamp 也回傳 dummy stats', () => {
    const records = [
      { sleepTimestamp: null, wakeTimestamp: '2026-01-15T06:00:00' },
      { sleepTimestamp: '2026-01-15T22:00:00', wakeTimestamp: null },
    ]
    expect(calculateSleepStatistics(records)).toMatchObject(empty)
  })

  it('單筆夜間紀錄：完整計算所有欄位', () => {
    const records = [
      {
        bedTimestamp:   '2026-01-14T21:45:00',
        sleepTimestamp: '2026-01-14T22:00:00',
        wakeTimestamp:  '2026-01-15T06:00:00',
      },
    ]
    const stats = calculateSleepStatistics(records)
    expect(stats).toMatchObject({
      totalRecords: 1,
      avgDailySleep: '8.0',
      avgSleepLatency: 15,
      avgNightBedtime: '21:45',
      avgSleepOnset: '22:00',
      avgWakeUpTime: '06:00',
      dateRange: '2026-01-14 ~ 2026-01-14',
    })
  })

  it('只有白天午睡：時段類欄位為 --:--，avgSleepLatency 為 0', () => {
    // bedHour 13 → 落在白天 [9, 18)，被邏輯夜晚排除
    const records = [
      {
        bedTimestamp:   '2026-01-15T13:00:00',
        sleepTimestamp: '2026-01-15T13:00:00',
        wakeTimestamp:  '2026-01-15T15:00:00',
      },
    ]
    const stats = calculateSleepStatistics(records)
    expect(stats).toMatchObject({
      totalRecords: 1,
      avgSleepLatency: 0,
      avgNightBedtime: '--:--',
      avgSleepOnset: '--:--',
      avgWakeUpTime: '--:--',
    })
  })

  it('凌晨入睡（bedHour < 9）歸類為前一天的邏輯夜晚', () => {
    const records = [
      {
        bedTimestamp:   '2026-01-15T02:30:00',
        sleepTimestamp: '2026-01-15T02:45:00',
        wakeTimestamp:  '2026-01-15T08:00:00',
      },
    ]
    const stats = calculateSleepStatistics(records)
    expect(stats.avgSleepLatency).toBe(15)
    expect(stats.avgNightBedtime).toBe('02:30')
    expect(stats.avgSleepOnset).toBe('02:45')
    expect(stats.avgWakeUpTime).toBe('08:00')
  })

  it('同一邏輯夜晚多筆：以第一筆的 bedtime/sleep、最後一筆的 wake 為準', () => {
    // 兩筆夜間紀錄（22:00 上床、之後又 04:00 回床上）→ 都歸屬 01-14 的邏輯夜晚
    const records = [
      {
        bedTimestamp:   '2026-01-14T21:45:00',
        sleepTimestamp: '2026-01-14T22:00:00',
        wakeTimestamp:  '2026-01-15T02:00:00',
      },
      {
        bedTimestamp:   '2026-01-15T03:30:00',
        sleepTimestamp: '2026-01-15T03:45:00',
        wakeTimestamp:  '2026-01-15T07:30:00',
      },
    ]
    const stats = calculateSleepStatistics(records)
    // 只有一個邏輯夜晚，取第一筆的 bedtime/onset 與最後一筆的 wake
    expect(stats.avgNightBedtime).toBe('21:45')
    expect(stats.avgSleepOnset).toBe('22:00')
    expect(stats.avgWakeUpTime).toBe('07:30')
    // latency 只加第一筆（15 分）
    expect(stats.avgSleepLatency).toBe(15)
    // 兩筆同屬 01-14 這一天 → 4h + 3.75h，不是拆成兩天各自平均
    expect(stats.avgDailySleep).toBe('7.8')
  })

  it('就寢時間漂移過午夜：兩晚各 7.5h 不會被併成一天 15h', () => {
    const records = [
      // 「1/10 的那一夜」，但入睡已經是 1/11 凌晨
      {
        bedTimestamp:   '2026-01-11T00:15:00',
        sleepTimestamp: '2026-01-11T00:30:00',
        wakeTimestamp:  '2026-01-11T08:00:00',
      },
      // 「1/11 的那一夜」
      {
        bedTimestamp:   '2026-01-11T23:15:00',
        sleepTimestamp: '2026-01-11T23:30:00',
        wakeTimestamp:  '2026-01-12T07:00:00',
      },
    ]
    const stats = calculateSleepStatistics(records)
    expect(stats.avgDailySleep).toBe('7.5')
  })

  it('規律作息：整夜不切午夜，平均不受視窗邊界影響', () => {
    // 1/10–1/14 每晚 20:00→隔天 07:00（11h）＋ 每天 13:00 小睡 1.5h → 每天 12.5h
    const records = []
    for (let d = 10; d <= 14; d++) {
      const day = `2026-01-${d}`
      const next = `2026-01-${d + 1}`
      records.push({
        bedTimestamp:   `${day}T19:45:00`,
        sleepTimestamp: `${day}T20:00:00`,
        wakeTimestamp:  `${next}T07:00:00`,
      })
      records.push({
        bedTimestamp:   `${day}T13:00:00`,
        sleepTimestamp: `${day}T13:00:00`,
        wakeTimestamp:  `${day}T14:30:00`,
      })
    }
    const stats = calculateSleepStatistics(records)
    expect(stats.avgDailySleep).toBe('12.5')
  })

  it('白天小睡留在自己的日曆日，不會被搬到前一天', () => {
    const records = [
      {
        bedTimestamp:   '2026-01-15T13:00:00',
        sleepTimestamp: '2026-01-15T13:00:00',
        wakeTimestamp:  '2026-01-15T14:30:00',
      },
      {
        bedTimestamp:   '2026-01-15T19:45:00',
        sleepTimestamp: '2026-01-15T20:00:00',
        wakeTimestamp:  '2026-01-16T06:00:00',
      },
    ]
    const stats = calculateSleepStatistics(records)
    // 1.5h 小睡 + 10h 夜眠 同屬 01-15 這一天
    expect(stats.avgDailySleep).toBe('11.5')
  })

  it('異常大的入睡耗時照算進平均，但同時回報有幾晚超標', () => {
    const records = [
      // 正常：81 分
      {
        bedTimestamp:   '2026-01-13T21:45:00',
        sleepTimestamp: '2026-01-13T23:06:00',
        wakeTimestamp:  '2026-01-14T07:00:00',
      },
      // 異常：上床 19:00 仍屬夜晚，但到 03:00 才入睡 → 480 分
      {
        bedTimestamp:   '2026-01-14T19:00:00',
        sleepTimestamp: '2026-01-15T03:00:00',
        wakeTimestamp:  '2026-01-15T08:00:00',
      },
    ]
    const stats = calculateSleepStatistics(records)
    // 兩晚都算進去，沒有被丟掉：(81 + 480) / 2
    expect(stats.avgSleepLatency).toBe(281)
    expect(stats.extremeLatencyNights).toBe(1)
  })

  it('釘住現況：上床時間落在白天的紀錄整晚不計入夜晚統計', () => {
    // 上下午選錯造成 bedHour=12，落在 [9,18) 白天排除區間。
    // 這一晚完全不進夜晚統計，也因此不會被 extremeLatencyNights 標記出來。
    // 這是已知缺口（白天排除本身沒有任何揭露），尚未處理；先釘住行為避免無聲改變。
    const records = [
      {
        bedTimestamp:   '2026-01-14T12:55:00',
        sleepTimestamp: '2026-01-15T00:44:00',
        wakeTimestamp:  '2026-01-15T07:56:00',
      },
    ]
    const stats = calculateSleepStatistics(records)
    expect(stats.totalRecords).toBe(1)
    expect(stats.avgSleepLatency).toBe(0)
    expect(stats.extremeLatencyNights).toBe(0)
    expect(stats.avgNightBedtime).toBe('--:--')
  })

  it('全部正常時 extremeLatencyNights 為 0', () => {
    const records = [
      {
        bedTimestamp:   '2026-01-14T21:45:00',
        sleepTimestamp: '2026-01-14T22:00:00',
        wakeTimestamp:  '2026-01-15T06:00:00',
      },
    ]
    expect(calculateSleepStatistics(records).extremeLatencyNights).toBe(0)
  })

  it('剛好 180 分不算超標，181 分才算', () => {
    const at = calculateSleepStatistics([
      {
        bedTimestamp:   '2026-01-14T21:00:00',
        sleepTimestamp: '2026-01-15T00:00:00',
        wakeTimestamp:  '2026-01-15T07:00:00',
      },
    ])
    expect(at.avgSleepLatency).toBe(180)
    expect(at.extremeLatencyNights).toBe(0)

    const over = calculateSleepStatistics([
      {
        bedTimestamp:   '2026-01-14T21:00:00',
        sleepTimestamp: '2026-01-15T00:01:00',
        wakeTimestamp:  '2026-01-15T07:00:00',
      },
    ])
    expect(over.extremeLatencyNights).toBe(1)
  })

  it('空資料的回傳也帶有 extremeLatencyNights', () => {
    expect(calculateSleepStatistics([]).extremeLatencyNights).toBe(0)
    // 只有白天午睡 → 沒有任何邏輯夜晚
    const naps = [
      {
        bedTimestamp:   '2026-01-15T13:00:00',
        sleepTimestamp: '2026-01-15T13:00:00',
        wakeTimestamp:  '2026-01-15T15:00:00',
      },
    ]
    expect(calculateSleepStatistics(naps).extremeLatencyNights).toBe(0)
  })

  it('dateRange 使用排序後的首末 sleepTime', () => {
    const records = [
      {
        bedTimestamp:   '2026-01-14T21:45:00',
        sleepTimestamp: '2026-01-14T22:00:00',
        wakeTimestamp:  '2026-01-15T06:00:00',
      },
      {
        bedTimestamp:   '2026-01-10T21:45:00',
        sleepTimestamp: '2026-01-10T22:00:00',
        wakeTimestamp:  '2026-01-11T06:00:00',
      },
    ]
    const stats = calculateSleepStatistics(records)
    expect(stats.dateRange).toBe('2026-01-10 ~ 2026-01-14')
    expect(stats.totalRecords).toBe(2)
  })
})
