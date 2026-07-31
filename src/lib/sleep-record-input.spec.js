// src/lib/sleep-record-input.spec.js

import { describe, it, expect } from 'vitest'
import {
  MAX_PLAUSIBLE_LATENCY_MINUTES,
  buildRecordTimestamps,
  checkSleepRecordInput,
} from './sleep-record-input.js'

const hhmm = (d) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const md = (d) => `${d.getMonth() + 1}/${d.getDate()}`

describe('buildRecordTimestamps', () => {
  it('沒有日期時三個欄位都是 null', () => {
    expect(buildRecordTimestamps({ date: '', bedtime: '22:00' })).toEqual({
      bedTimestamp: null,
      sleepTimestamp: null,
      wakeTimestamp: null,
    })
  })

  it('沒填的時間欄位維持 null', () => {
    const r = buildRecordTimestamps({ date: '2026-07-29', bedtime: '22:00' })
    expect(hhmm(r.bedTimestamp)).toBe('22:00')
    expect(r.sleepTimestamp).toBeNull()
    expect(r.wakeTimestamp).toBeNull()
  })

  it('同日順序正常時不做跨日修正', () => {
    const r = buildRecordTimestamps({
      date: '2026-07-29',
      bedtime: '13:00',
      sleepTime: '13:20',
      wakeTime: '15:00',
    })
    expect(md(r.bedTimestamp)).toBe('7/29')
    expect(md(r.sleepTimestamp)).toBe('7/29')
    expect(md(r.wakeTimestamp)).toBe('7/29')
  })

  it('入睡早於上床 → 入睡順延一天，起床再跟著順延', () => {
    const r = buildRecordTimestamps({
      date: '2026-07-29',
      bedtime: '22:55',
      sleepTime: '00:44',
      wakeTime: '07:56',
    })
    expect(md(r.bedTimestamp)).toBe('7/29')
    expect(md(r.sleepTimestamp)).toBe('7/30')
    expect(md(r.wakeTimestamp)).toBe('7/30')
  })

  it('沒有入睡時間時，起床以上床為基準判斷跨日', () => {
    const r = buildRecordTimestamps({
      date: '2026-07-29',
      bedtime: '22:55',
      wakeTime: '07:56',
    })
    expect(md(r.bedTimestamp)).toBe('7/29')
    expect(md(r.wakeTimestamp)).toBe('7/30')
  })

  it('跨月邊界正確進位', () => {
    const r = buildRecordTimestamps({
      date: '2026-07-31',
      bedtime: '23:00',
      sleepTime: '00:30',
      wakeTime: '08:00',
    })
    expect(md(r.sleepTimestamp)).toBe('8/1')
    expect(md(r.wakeTimestamp)).toBe('8/1')
  })
})

describe('checkSleepRecordInput', () => {
  it('缺上床或入睡時間就不檢查', () => {
    expect(checkSleepRecordInput({ date: '2026-07-29', bedtime: '22:55' })).toBeNull()
    expect(checkSleepRecordInput({ date: '2026-07-29', sleepTime: '00:44' })).toBeNull()
    expect(checkSleepRecordInput({ date: '', bedtime: '22:55', sleepTime: '00:44' })).toBeNull()
  })

  it('正常入睡耗時不提示', () => {
    // 22:55 → 00:44 隔天 = 109 分
    expect(
      checkSleepRecordInput({ date: '2026-07-29', bedtime: '22:55', sleepTime: '00:44' }),
    ).toBeNull()
  })

  it('剛好等於上限不提示，超過一分鐘就提示', () => {
    const at = checkSleepRecordInput({ date: '2026-07-29', bedtime: '22:00', sleepTime: '01:00' })
    expect(at).toBeNull() // 180 分

    const over = checkSleepRecordInput({ date: '2026-07-29', bedtime: '22:00', sleepTime: '01:01' })
    expect(over).not.toBeNull() // 181 分
  })

  it('真實案例：上床誤選 12:55（應為 22:55）→ 提示相隔 11 小時 49 分', () => {
    const msg = checkSleepRecordInput({
      date: '2026-07-29',
      bedtime: '12:55',
      sleepTime: '00:44',
      wakeTime: '07:56',
    })
    expect(msg).toContain('上床 12:55、入睡 00:44')
    expect(msg).toContain('11 小時 49 分')
    expect(msg).toContain('確定要照這樣儲存嗎？')
  })

  it('整點時長不顯示多餘的分鐘', () => {
    // 12:00 → 隔天 00:00 = 12 小時整
    const msg = checkSleepRecordInput({ date: '2026-07-29', bedtime: '12:00', sleepTime: '00:00' })
    expect(msg).toContain('相隔 12 小時。')
  })

  it('提示門檻為 180 分鐘', () => {
    expect(MAX_PLAUSIBLE_LATENCY_MINUTES).toBe(180)
  })
})
