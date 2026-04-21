// src/composables/useSleepTracking.js
// 睡眠記錄追蹤 - 本地儲存版（不需要帳號）

import { ref, computed } from 'vue'
import { useFirestore } from './useFirestore'
import { useDiaryUtils } from './useDiaryUtils'

export function useSleepTracking() {
  const { saveSleepRecord, deleteSleepRecord } = useFirestore()
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

    const newRecord = {
      id: 'sleep_' + Date.now(),
      date,
      bedTimestamp:   bedtime   ? new Date(`${date}T${bedtime}`)   : null,
      sleepTimestamp: sleepTime ? new Date(`${date}T${sleepTime}`) : null,
      wakeTimestamp:  wakeTime  ? new Date(`${date}T${wakeTime}`)  : null,
      wakeCount: parseInt(wakeCount) || 0,
      notes,
      created: new Date(),
    }

    // 跨日修正
    if (newRecord.sleepTimestamp && newRecord.bedTimestamp &&
        newRecord.sleepTimestamp < newRecord.bedTimestamp) {
      newRecord.sleepTimestamp.setDate(newRecord.sleepTimestamp.getDate() + 1)
    }
    if (newRecord.wakeTimestamp) {
      const anchor = newRecord.sleepTimestamp || newRecord.bedTimestamp
      if (anchor && newRecord.wakeTimestamp < anchor) {
        newRecord.wakeTimestamp.setDate(newRecord.wakeTimestamp.getDate() + 1)
      }
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
    const bed   = bedtime   ? new Date(`${date}T${bedtime}`)   : null
    let sleep   = sleepTime ? new Date(`${date}T${sleepTime}`) : null
    let wake    = wakeTime  ? new Date(`${date}T${wakeTime}`)  : null

    if (sleep && bed && sleep < bed) sleep.setDate(sleep.getDate() + 1)
    const anchorWake = sleep || bed
    if (wake && anchorWake && wake < anchorWake) wake.setDate(wake.getDate() + 1)

    const data = {
      id: recordId,
      bedTimestamp: bed,
      sleepTimestamp: sleep,
      wakeTimestamp: wake,
      wakeCount: parseInt(wakeCount) || 0,
      notes,
      date,
      created: new Date(),
    }

    await saveSleepRecord(currentBabyId, data)
    updateCallback?.()
    return '睡眠記錄已更新'
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
    formatSleepRecordForDisplay,
  }
}
