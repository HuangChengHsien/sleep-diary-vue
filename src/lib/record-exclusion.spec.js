// src/lib/record-exclusion.spec.js

import { describe, it, expect } from 'vitest'
import {
  isExcludedFromAnalysis,
  analysableRecords,
  excludedRecords,
  recordDateString,
  recordsInDateRange,
  excludedPeriods,
  formatPeriodLabel,
} from './record-exclusion.js'

describe('isExcludedFromAnalysis', () => {
  it('只有明確為 true 才算排除', () => {
    expect(isExcludedFromAnalysis({ excludedFromAnalysis: true })).toBe(true)
    expect(isExcludedFromAnalysis({ excludedFromAnalysis: false })).toBe(false)
    expect(isExcludedFromAnalysis({})).toBe(false)
    expect(isExcludedFromAnalysis(null)).toBe(false)
    expect(isExcludedFromAnalysis(undefined)).toBe(false)
  })

  it('不把其他 truthy 值當成排除（避免舊資料誤判）', () => {
    expect(isExcludedFromAnalysis({ excludedFromAnalysis: 'true' })).toBe(false)
    expect(isExcludedFromAnalysis({ excludedFromAnalysis: 1 })).toBe(false)
  })
})

describe('analysableRecords / excludedRecords', () => {
  const records = [
    { id: 'a' },
    { id: 'b', excludedFromAnalysis: true },
    { id: 'c', excludedFromAnalysis: false },
  ]

  it('分析集合不含被排除的紀錄', () => {
    expect(analysableRecords(records).map((r) => r.id)).toEqual(['a', 'c'])
  })

  it('排除集合只含被標記的紀錄', () => {
    expect(excludedRecords(records).map((r) => r.id)).toEqual(['b'])
  })

  it('空值輸入回傳空陣列', () => {
    expect(analysableRecords(null)).toEqual([])
    expect(analysableRecords(undefined)).toEqual([])
    expect(excludedRecords(null)).toEqual([])
  })
})

describe('recordDateString', () => {
  it('優先使用 date 欄位', () => {
    expect(recordDateString({ date: '2026-07-29', sleepTimestamp: '2026-08-01T22:00:00' }))
      .toBe('2026-07-29')
  })

  it('沒有 date 時用入睡時間推算', () => {
    expect(recordDateString({ sleepTimestamp: '2026-07-29T22:00:00' })).toBe('2026-07-29')
  })

  it('沒有入睡時間時退回上床時間', () => {
    expect(recordDateString({ bedTimestamp: '2026-07-29T21:00:00' })).toBe('2026-07-29')
  })

  it('什麼都沒有時回傳 null', () => {
    expect(recordDateString({})).toBeNull()
    expect(recordDateString(null)).toBeNull()
  })
})

describe('recordsInDateRange', () => {
  const records = [
    { id: 'a', date: '2026-07-27' },
    { id: 'b', date: '2026-07-28' },
    { id: 'c', date: '2026-07-30' },
    { id: 'd', date: '2026-08-02' },
    { id: 'e' }, // 無日期
  ]

  it('兩端皆含', () => {
    expect(recordsInDateRange(records, '2026-07-28', '2026-07-30').map((r) => r.id))
      .toEqual(['b', 'c'])
  })

  it('起迄顛倒時自動對調', () => {
    expect(recordsInDateRange(records, '2026-07-30', '2026-07-28').map((r) => r.id))
      .toEqual(['b', 'c'])
  })

  it('單日區間只挑到當天', () => {
    expect(recordsInDateRange(records, '2026-07-27', '2026-07-27').map((r) => r.id))
      .toEqual(['a'])
  })

  it('跨月比較正確（字串比較不會在月底出錯）', () => {
    expect(recordsInDateRange(records, '2026-07-30', '2026-08-02').map((r) => r.id))
      .toEqual(['c', 'd'])
  })

  it('無法判定日期的紀錄不會被選中', () => {
    expect(recordsInDateRange(records, '2020-01-01', '2030-01-01').map((r) => r.id))
      .toEqual(['a', 'b', 'c', 'd'])
  })

  it('缺少起訖日期時回傳空陣列', () => {
    expect(recordsInDateRange(records, '', '2026-07-30')).toEqual([])
    expect(recordsInDateRange(records, '2026-07-30', '')).toEqual([])
  })
})

describe('excludedPeriods', () => {
  const ex = (date, id) => ({ id, date, excludedFromAnalysis: true })

  it('沒有排除紀錄時回傳空陣列', () => {
    expect(excludedPeriods([{ id: 'a', date: '2026-08-01' }])).toEqual([])
    expect(excludedPeriods([])).toEqual([])
    expect(excludedPeriods(null)).toEqual([])
  })

  it('單一日期成為一段', () => {
    expect(excludedPeriods([ex('2026-08-02', 'a')])).toEqual([
      { startDate: '2026-08-02', endDate: '2026-08-02', dayCount: 1, recordCount: 1 },
    ])
  })

  it('連續日期歸併成一段', () => {
    const periods = excludedPeriods([
      ex('2026-08-02', 'a'),
      ex('2026-08-03', 'b'),
      ex('2026-08-04', 'c'),
    ])
    expect(periods).toEqual([
      { startDate: '2026-08-02', endDate: '2026-08-04', dayCount: 3, recordCount: 3 },
    ])
  })

  it('不連續日期分成多段（三個週末出差的情境）', () => {
    const periods = excludedPeriods([
      ex('2026-08-01', 'a'), ex('2026-08-02', 'b'),
      ex('2026-08-08', 'c'), ex('2026-08-09', 'd'),
      ex('2026-08-15', 'e'), ex('2026-08-16', 'f'),
    ])
    expect(periods.map((p) => `${p.startDate}~${p.endDate}`)).toEqual([
      '2026-08-01~2026-08-02',
      '2026-08-08~2026-08-09',
      '2026-08-15~2026-08-16',
    ])
    expect(periods.every((p) => p.dayCount === 2 && p.recordCount === 2)).toBe(true)
  })

  it('同一天多筆合計在 recordCount，不影響 dayCount', () => {
    const periods = excludedPeriods([
      ex('2026-08-02', 'a'), ex('2026-08-02', 'b'), ex('2026-08-02', 'c'),
    ])
    expect(periods).toEqual([
      { startDate: '2026-08-02', endDate: '2026-08-02', dayCount: 1, recordCount: 3 },
    ])
  })

  it('輸入順序不影響歸併結果', () => {
    const periods = excludedPeriods([
      ex('2026-08-04', 'c'), ex('2026-08-02', 'a'), ex('2026-08-03', 'b'),
    ])
    expect(periods).toHaveLength(1)
    expect(periods[0]).toMatchObject({ startDate: '2026-08-02', endDate: '2026-08-04' })
  })

  it('跨月連續視為同一段', () => {
    const periods = excludedPeriods([ex('2026-07-31', 'a'), ex('2026-08-01', 'b')])
    expect(periods).toEqual([
      { startDate: '2026-07-31', endDate: '2026-08-01', dayCount: 2, recordCount: 2 },
    ])
  })

  it('跨年連續視為同一段', () => {
    const periods = excludedPeriods([ex('2026-12-31', 'a'), ex('2027-01-01', 'b')])
    expect(periods).toHaveLength(1)
    expect(periods[0]).toMatchObject({ startDate: '2026-12-31', endDate: '2027-01-01' })
  })

  it('未被排除的紀錄不會把兩段接起來', () => {
    const periods = excludedPeriods([
      ex('2026-08-02', 'a'),
      { id: 'b', date: '2026-08-03' }, // 中間這天沒被排除
      ex('2026-08-04', 'c'),
    ])
    expect(periods).toHaveLength(2)
  })

  it('無法判定日期的紀錄不會形成區段', () => {
    const periods = excludedPeriods([{ id: 'x', excludedFromAnalysis: true }])
    expect(periods).toEqual([])
  })
})

describe('formatPeriodLabel', () => {
  it('單日只顯示一個日期', () => {
    expect(formatPeriodLabel({ startDate: '2026-08-02', endDate: '2026-08-02' })).toBe('8/2')
  })

  it('多日顯示起訖並去掉補零', () => {
    expect(formatPeriodLabel({ startDate: '2026-08-02', endDate: '2026-08-13' })).toBe('8/2–8/13')
  })
})
