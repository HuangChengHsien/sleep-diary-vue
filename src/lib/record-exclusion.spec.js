// src/lib/record-exclusion.spec.js

import { describe, it, expect } from 'vitest'
import {
  isExcludedFromAnalysis,
  analysableRecords,
  excludedRecords,
  recordDateString,
  recordsInDateRange,
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
