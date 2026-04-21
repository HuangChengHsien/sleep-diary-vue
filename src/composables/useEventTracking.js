// src/composables/useEventTracking.js
// 事件記錄追蹤 - 本地儲存版（不需要帳號）

import { ref } from 'vue'
import { useFirestore } from './useFirestore'
import { useDiaryUtils } from './useDiaryUtils'

export function useEventTracking() {
  const { saveEventRecord, deleteEventRecord } = useFirestore()
  const { normalizeTimestamp, getCurrentTime, formatTime, formatShortDate } = useDiaryUtils()

  const currentFilter = ref('today')

  const quickEventButtons = ref([
    { id: 'feed',      text: '🍼 喝奶',      event: '喝奶' },
    { id: 'breakfast', text: '☀️ 早餐',      event: '早餐' },
    { id: 'lunch',     text: '🍝 午餐',      event: '午餐' },
    { id: 'dinner',    text: '🌙 晚餐',      event: '晚餐' },
    { id: 'snack',     text: '⭐ 宵夜',      event: '宵夜' },
    { id: 'eat',       text: '🍽️ 進食',     event: '進食' },
    { id: 'cry',       text: '😭 哭泣',      event: '哭' },
    { id: 'toilet',    text: '🚽 上廁所',    event: '上廁所' },
    { id: 'diaper',    text: '👶 換尿布',    event: '換尿布' },
    { id: 'bath',      text: '🛁 洗澡',      event: '洗澡' },
    { id: 'lotion',    text: '🧴 塗乳液',    event: '塗乳液' },
    { id: 'massage',   text: '💆 按摩',      event: '按摩' },
    { id: 'music',     text: '🎵 聽音樂',    event: '聽音樂' },
    { id: 'story',     text: '📖 說故事',    event: '說故事' },
    { id: 'reading',   text: '👨‍👩‍👧‍👦 親子共讀', event: '親子共讀' },
    { id: 'exercise',  text: '🏃 運動',      event: '運動' },
    { id: 'play',      text: '🧸 玩耍',      event: '玩耍' },
    { id: 'tutor',     text: '📚 補習/家教', event: '補習/家教' },
    { id: 'study',     text: '📚 讀書',      event: '讀書' },
    { id: 'homework',  text: '✏️ 寫作業',    event: '寫作業' },
    { id: 'medicine',  text: '💊 藥物',      event: '藥物' },
    { id: 'tea',       text: '☕ 喝茶或咖啡', event: '喝茶或咖啡' },
    { id: 'screen',    text: '📱 使用3C產品', event: '使用3C產品' },
  ])

  const eventTypeOptions = ref([
    { value: 'other',  text: '📝 其他' },
    { value: '喝奶',   text: '🍼 喝奶' },
    { value: '早餐',   text: '☀️ 早餐' },
    { value: '午餐',   text: '🍝 午餐' },
    { value: '晚餐',   text: '🌙 晚餐' },
    { value: '宵夜',   text: '⭐ 宵夜' },
    { value: '進食',   text: '🍽️ 進食' },
    { value: '哭',     text: '😭 哭泣' },
    { value: '上廁所', text: '🚽 上廁所' },
    { value: '換尿布', text: '👶 換尿布' },
    { value: '洗澡',   text: '🛁 洗澡' },
    { value: '塗乳液', text: '🧴 塗乳液' },
    { value: '按摩',   text: '💆 按摩' },
    { value: '聽音樂', text: '🎵 聽音樂' },
    { value: '說故事', text: '📖 說故事' },
    { value: '親子共讀', text: '👨‍👩‍👧‍👦 親子共讀' },
    { value: '補習/家教', text: '📚 補習/家教' },
    { value: '讀書',   text: '📚 讀書' },
    { value: '寫作業', text: '✏️ 寫作業' },
    { value: '藥物',   text: '💊 藥物' },
    { value: '喝茶或咖啡', text: '☕ 喝茶或咖啡' },
    { value: '使用3C產品', text: '📱 使用3C產品' },
    { value: '運動',   text: '🏃 運動' },
    { value: '玩耍',   text: '🧸 玩耍' },
  ])

  // 快速新增事件
  const addQuickEvent = async (currentBabyId, eventText, updateCallback) => {
    if (!currentBabyId) throw new Error('請先選擇個案')

    const { timestamp } = getCurrentTime()
    const record = {
      type: 'event',
      quickEvent: eventText,
      timestamp: timestamp.toISOString(),
      created: new Date(),
    }

    await saveEventRecord(currentBabyId, record)
    updateCallback?.()
    return `已記錄: ${eventText}`
  }

  // 手動新增事件
  const addManualEvent = async (currentBabyId, formData, updateCallback) => {
    if (!currentBabyId) throw new Error('請先選擇個案')

    const { eventType, eventDate, eventTime, notes } = formData
    if (!eventDate || !eventTime) throw new Error('請設定日期和時間')

    const record = {
      type: 'event',
      eventType,
      timestamp: new Date(`${eventDate}T${eventTime}`).toISOString(),
      notes,
      created: new Date(),
    }

    await saveEventRecord(currentBabyId, record)
    updateCallback?.()
    return '事件已成功記錄'
  }

  // 編輯事件記錄
  const editEventRecord = async (currentBabyId, recordId, formData, updateCallback) => {
    if (!currentBabyId) throw new Error('請先選擇個案')

    const { eventDate, eventTime, notes } = formData
    if (!eventDate || !eventTime) throw new Error('請設定日期和時間')

    const timestamp = new Date(`${eventDate}T${eventTime}:00`)
    if (isNaN(timestamp.getTime())) throw new Error('日期時間格式錯誤')

    const updatedData = {
      id: recordId,
      timestamp: timestamp.toISOString(),
      notes: notes || '',
      quickEvent: null,
      eventType: 'other',
      updated: new Date().toISOString(),
    }

    await saveEventRecord(currentBabyId, updatedData)
    updateCallback?.()
    return '事件記錄已更新'
  }

  // 刪除事件記錄
  const removeEventRecord = async (currentBabyId, recordId, updateCallback) => {
    if (!currentBabyId) throw new Error('請先選擇個案')
    await deleteEventRecord(currentBabyId, recordId)
    updateCallback?.()
    return '事件記錄已刪除'
  }

  // 篩選事件記錄
  const filterEventRecords = (records, filterDate = currentFilter.value) => {
    if (filterDate === 'all') return [...records]

    const targetDate =
      filterDate === 'today' ? new Date().toISOString().split('T')[0] : filterDate

    return records.filter((record) => {
      const dt = normalizeTimestamp(record.timestamp)
      return dt ? dt.toISOString().split('T')[0] === targetDate : false
    })
  }

  // 格式化事件記錄顯示
  const formatEventRecordForDisplay = (record) => {
    let eventText = ''
    if (record.quickEvent) {
      eventText = record.quickEvent
    } else {
      const eventNames = {
        feed: '🍼 餵奶', diaper: '👶 換尿布', play: '🎮 玩耍',
        cry: '😢 哭泣', medicine: '💊 餵藥', bath: '🛁 洗澡', other: '📝 其他',
      }
      eventText = eventNames[record.eventType] || record.eventType || '其他事件'
      if (record.notes) eventText += `: ${record.notes}`
    }

    const recordTimestamp = normalizeTimestamp(record.timestamp)
    return {
      id: record.id,
      date: formatShortDate(recordTimestamp),
      time: formatTime(recordTimestamp),
      description: eventText,
      fullTimestamp: recordTimestamp,
    }
  }

  // 計算今日摘要
  const calculateTodaySummary = (eventRecords, sleepRecords) => {
    const today = new Date().toISOString().split('T')[0]

    const todayEvents = eventRecords.filter((r) => {
      const dt = normalizeTimestamp(r.timestamp)
      return dt ? dt.toISOString().split('T')[0] === today : false
    })

    let feedCount = 0
    todayEvents.forEach((r) => {
      if (
        (r.type === 'event' && r.eventType === 'feed') ||
        (r.quickEvent && r.quickEvent.includes('奶'))
      ) feedCount++
    })

    const todaySleep = sleepRecords.filter((r) => {
      const dt = normalizeTimestamp(r.sleepTimestamp) || normalizeTimestamp(r.created)
      return dt ? dt.toISOString().split('T')[0] === today : false
    })

    let totalSleepMinutes = 0, sleepCount = 0
    todaySleep.forEach((r) => {
      if (r.sleepTimestamp && r.wakeTimestamp) {
        const s = normalizeTimestamp(r.sleepTimestamp)
        const w = normalizeTimestamp(r.wakeTimestamp)
        if (s && w) {
          const mins = Math.floor((w - s) / 60000)
          if (mins > 0) { totalSleepMinutes += mins; sleepCount++ }
        }
      }
    })

    return { totalSleepMinutes, sleepCount, feedCount }
  }

  const setFilterDate = (date) => { currentFilter.value = date }
  const setFilterToToday = () => {
    const today = new Date().toISOString().split('T')[0]
    currentFilter.value = today
    return today
  }

  return {
    currentFilter,
    quickEventButtons,
    eventTypeOptions,
    addQuickEvent,
    addManualEvent,
    editEventRecord,
    removeEventRecord,
    filterEventRecords,
    formatEventRecordForDisplay,
    calculateTodaySummary,
    setFilterDate,
    setFilterToToday,
  }
}
