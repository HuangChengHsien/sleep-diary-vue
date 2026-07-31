// src/composables/useSleepTracking.js
// 睡眠記錄追蹤 - 本地儲存版（不需要帳號）

import { ref, computed } from 'vue'
import { useLocalDB } from './useLocalDB'
import { useDiaryUtils } from './useDiaryUtils'
import { buildRecordTimestamps } from '@/lib/sleep-record-input.js'
import { recordsInDateRange } from '@/lib/record-exclusion.js'

export function useSleepTracking() {
  const { getSleepRecord, saveSleepRecord, deleteSleepRecord } = useLocalDB()
  const {
    normalizeTimestamp,
    getTodayString,
    getCurrentTime,
    calculateSleepDuration,
    calculateFallAsleepDuration,
    formatDuration,
  } = useDiaryUtils()

  // 當前睡眠狀態
  const currentSleepSession = ref({
    bedtime: null,
    sleepTime: null,
    isInBed: false,
    isSleeping: false,
  })

  const sleepStatus = computed(() => {
    if (currentSleepSession.value.isSleeping) {
      return { text: '目前狀態: 睡眠中... 💤', class: 'sleeping' }
    } else if (currentSleepSession.value.isInBed) {
      return { text: '目前狀態: 已上床，準備入睡 🛏️', class: 'sleeping' }
    } else {
      return { text: '目前狀態: 醒著', class: 'awake' }
    }
  })

  const buttonStates = computed(() => ({
    showBedtimeBtn: !currentSleepSession.value.isInBed && !currentSleepSession.value.isSleeping,
    showSleepBtn:   currentSleepSession.value.isInBed && !currentSleepSession.value.isSleeping,
    showWakeBtn:    currentSleepSession.value.isSleeping,
  }))

  // 檢查當前睡眠狀態
  const checkCurrentSleepStatus = (sleepRecords) => {
    const session = { bedtime: null, sleepTime: null, isInBed: false, isSleeping: false }
    const today = getTodayString()
    const todayIncomplete = sleepRecords.filter(
      (r) => r.date === today && !r.wakeTimestamp && (r.bedTimestamp || r.sleepTimestamp),
    )

    if (todayIncomplete.length > 0) {
      const latest = todayIncomplete.sort(
        (a, b) => new Date(b.created) - new Date(a.created),
      )[0]

      if (latest.bedTimestamp && !latest.sleepTimestamp) {
        session.bedtime = normalizeTimestamp(latest.bedTimestamp)?.toTimeString().slice(0, 5)
        session.isInBed = true
      } else if (latest.sleepTimestamp) {
        session.bedtime = normalizeTimestamp(latest.bedTimestamp)?.toTimeString().slice(0, 5)
        session.sleepTime = normalizeTimestamp(latest.sleepTimestamp)?.toTimeString().slice(0, 5)
        session.isSleeping = true
      }
    }
    currentSleepSession.value = session
  }

  // ── 快速操作 ─────────────────────────────────────

  const setBedtime = async (currentBabyId, sleepRecords, updateCallback) => {
    if (!currentBabyId) throw new Error('請先選擇個案')

    const { date, timestamp } = getCurrentTime()
    const session = { ...currentSleepSession.value }
    session.bedtime = timestamp.toTimeString().slice(0, 5)
    session.isInBed = true
    currentSleepSession.value = session

    let record = sleepRecords.find((r) => r.date === date && !r.wakeTimestamp)
    if (!record) {
      record = { id: 'sleep_' + Date.now(), date, bedTimestamp: timestamp, created: new Date() }
    } else {
      record = { ...record, bedTimestamp: timestamp }
    }

    await saveSleepRecord(currentBabyId, record)
    updateCallback?.()
    return '已記錄上床時間'
  }

  const setSleepTime = async (currentBabyId, sleepRecords, updateCallback) => {
    if (!currentBabyId) throw new Error('請先選擇個案')

    const { date, timestamp } = getCurrentTime()
    const session = { ...currentSleepSession.value }
    session.sleepTime = timestamp.toTimeString().slice(0, 5)
    session.isSleeping = true
    session.isInBed = false
    currentSleepSession.value = session

    let record = sleepRecords.find((r) => r.date === date && !r.wakeTimestamp)
    if (!record) {
      record = { id: 'sleep_' + Date.now(), date, sleepTimestamp: timestamp, created: new Date() }
    } else {
      record = { ...record, sleepTimestamp: timestamp }
    }

    await saveSleepRecord(currentBabyId, record)
    updateCallback?.()
    return '已記錄入睡時間'
  }

  const setWakeTime = async (currentBabyId, sleepRecords, updateCallback) => {
    if (!currentBabyId || !currentSleepSession.value.isSleeping) {
      throw new Error('請先記錄入睡時間')
    }

    const { date, timestamp } = getCurrentTime()
    const record = sleepRecords.find(
      (r) => r.date === date && r.sleepTimestamp && !r.wakeTimestamp,
    )

    if (!record) throw new Error('找不到對應的睡眠記錄')

    await saveSleepRecord(currentBabyId, { ...record, wakeTimestamp: timestamp })
    currentSleepSession.value = { bedtime: null, sleepTime: null, isInBed: false, isSleeping: false }
    updateCallback?.()
    return '已記錄起床時間'
  }

  // ── 手動記錄 ─────────────────────────────────────

  const addManualSleepRecord = async (currentBabyId, formData, updateCallback) => {
    if (!currentBabyId) throw new Error('請先選擇個案')

    const { date, bedtime, sleepTime, wakeTime, wakeCount, notes } = formData
    if (!date) throw new Error('請選擇日期')

    // 跨日修正由 buildRecordTimestamps 處理（與編輯路徑、輸入檢查共用同一套邏輯）
    const newRecord = {
      id: 'sleep_' + Date.now(),
      date,
      ...buildRecordTimestamps({ date, bedtime, sleepTime, wakeTime }),
      wakeCount: parseInt(wakeCount) || 0,
      notes,
      created: new Date(),
    }

    // 12點前算前一天
    const anchor = newRecord.sleepTimestamp || newRecord.bedTimestamp
    if (anchor && anchor.getHours() < 12) {
      const d = new Date(anchor)
      d.setDate(d.getDate() - 1)
      newRecord.date = d.toISOString().split('T')[0]
    }

    await saveSleepRecord(currentBabyId, newRecord)
    updateCallback?.()
    return '睡眠記錄已新增'
  }

  const editSleepRecord = async (currentBabyId, recordId, formData, updateCallback) => {
    if (!currentBabyId) throw new Error('請先選擇個案')

    const { date, bedtime, sleepTime, wakeTime, wakeCount, notes } = formData

    // 先取回既有紀錄再覆蓋表單欄位。db.put 是整筆取代，不這樣做的話
    // 表單以外的欄位（例如 excludedFromAnalysis）會在每次編輯時被清掉。
    const existing = (await getSleepRecord(recordId)) || {}

    const data = {
      ...existing,
      id: recordId,
      ...buildRecordTimestamps({ date, bedtime, sleepTime, wakeTime }),
      wakeCount: parseInt(wakeCount) || 0,
      notes,
      date,
      created: new Date(),
    }

    await saveSleepRecord(currentBabyId, data)
    updateCallback?.()
    return '睡眠記錄已更新'
  }

  // ── 不列入分析 ───────────────────────────────────
  // 只翻一個布林欄位，時間戳原樣寫回（normalizeSleepRecord 對 ISO 字串是恆等的）。

  const setSleepRecordExcluded = async (currentBabyId, record, excluded, updateCallback) => {
    if (!currentBabyId) throw new Error('請先選擇個案')
    if (!record?.id) throw new Error('無效的記錄')

    await saveSleepRecord(currentBabyId, { ...record, excludedFromAnalysis: excluded })
    updateCallback?.()
    return excluded ? '已將該筆記錄排除於分析之外' : '已將該筆記錄恢復計入分析'
  }

  const setSleepRecordsExcludedInRange = async (
    currentBabyId,
    records,
    startDate,
    endDate,
    excluded,
    updateCallback,
  ) => {
    if (!currentBabyId) throw new Error('請先選擇個案')
    if (!startDate || !endDate) throw new Error('請選擇起訖日期')

    const targets = recordsInDateRange(records, startDate, endDate)
    if (targets.length === 0) throw new Error('這個日期區間內沒有睡眠記錄')

    for (const record of targets) {
      await saveSleepRecord(currentBabyId, { ...record, excludedFromAnalysis: excluded })
    }
    updateCallback?.()

    return excluded
      ? `已排除 ${targets.length} 筆記錄，不列入分析`
      : `已恢復 ${targets.length} 筆記錄，重新列入分析`
  }

  const removeSleepRecord = async (currentBabyId, recordId, updateCallback) => {
    if (!currentBabyId) throw new Error('請先選擇個案')
    await deleteSleepRecord(currentBabyId, recordId)
    updateCallback?.()
    return '睡眠記錄已刪除'
  }

  // ── 格式化顯示 ───────────────────────────────────

  const formatSleepRecordForDisplay = (record) => {
    const bedDT   = normalizeTimestamp(record.bedTimestamp)
    const sleepDT = normalizeTimestamp(record.sleepTimestamp)
    const wakeDT  = normalizeTimestamp(record.wakeTimestamp)

    const recordDate = record.date
      ? new Date(record.date).toLocaleDateString('zh-TW', { timeZone: 'UTC' })
      : (sleepDT || bedDT)?.toLocaleDateString('zh-TW') || '-'

    const fmt = (dt) =>
      dt?.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) || '-'

    const fallAsleepMinutes = calculateFallAsleepDuration(record.bedTimestamp, record.sleepTimestamp)
    const totalSleepMinutes = calculateSleepDuration(record.sleepTimestamp, record.wakeTimestamp)

    return {
      id: record.id,
      originalRecord: record,
      date: recordDate,
      bedtime:  fmt(bedDT),
      sleepTime: fmt(sleepDT),
      wakeTime:  fmt(wakeDT),
      fallAsleepDuration: fallAsleepMinutes !== null ? `${fallAsleepMinutes}分鐘` : '-',
      totalSleep: totalSleepMinutes !== null ? formatDuration(totalSleepMinutes) : '-',
      wakeCount: record.wakeCount || 0,
      notes: record.notes || '-',
    }
  }

  return {
    currentSleepSession,
    sleepStatus,
    buttonStates,
    checkCurrentSleepStatus,
    setBedtime,
    setSleepTime,
    setWakeTime,
    addManualSleepRecord,
    editSleepRecord,
    removeSleepRecord,
    setSleepRecordExcluded,
    setSleepRecordsExcludedInRange,
    formatSleepRecordForDisplay,
  }
}
