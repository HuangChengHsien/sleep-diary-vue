// src/composables/useLocalDB.js
// 本地 IndexedDB 資料存取層（使用 Dexie）

import { ref } from 'vue'
import db from '@/db/localDB'

// 將 Date / Firebase Timestamp 統一轉為 ISO 字串（方便 IndexedDB 儲存與 JSON 備份）
const toISO = (val) => {
  if (!val) return null
  if (val instanceof Date) return val.toISOString()
  if (typeof val === 'object' && typeof val.toDate === 'function') return val.toDate().toISOString()
  return String(val)
}

// 為 bulk 匯入產生不會撞在同一毫秒的 id
let bulkIdCounter = 0
const nextBulkId = (prefix) => `${prefix}_${Date.now()}_${bulkIdCounter++}`

const normalizeSleepRecord = (babyId, record) => ({
  ...record,
  id: record.id || nextBulkId('sleep'),
  babyId,
  bedTimestamp:   toISO(record.bedTimestamp),
  sleepTimestamp: toISO(record.sleepTimestamp),
  wakeTimestamp:  toISO(record.wakeTimestamp),
  created:        toISO(record.created) || new Date().toISOString(),
})

const normalizeEventRecord = (babyId, record) => ({
  ...record,
  id: record.id || nextBulkId('event'),
  babyId,
  created: toISO(record.created) || new Date().toISOString(),
})

export function useLocalDB() {
  const isLoading = ref(false)
  const error = ref(null)

  // ── 個案 (寶寶) ───────────────────────────────────

  const loadBabies = async () => {
    try {
      isLoading.value = true
      error.value = null
      const arr = await db.babies.toArray()
      const result = {}
      arr.forEach((b) => { result[b.id] = b })
      return result
    } catch (err) {
      error.value = err.message
      return {}
    } finally {
      isLoading.value = false
    }
  }

  const saveBaby = async (name, birthDate) => {
    try {
      isLoading.value = true
      error.value = null
      const babyId = 'baby_' + Date.now()
      const babyInfo = {
        id: babyId,
        name,
        birthDate,
        created: new Date().toISOString(),
      }
      await db.babies.put(babyInfo)
      return { babyId, babyInfo }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const deleteBaby = async (babyId) => {
    try {
      isLoading.value = true
      error.value = null
      // 刪除該個案的所有記錄，再刪除個案本身
      await db.sleepRecords.where('babyId').equals(babyId).delete()
      await db.eventRecords.where('babyId').equals(babyId).delete()
      await db.babies.delete(babyId)
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // ── 記錄讀取 ─────────────────────────────────────

  const loadBabyRecords = async (babyId) => {
    try {
      isLoading.value = true
      error.value = null
      const sleepRecords = await db.sleepRecords
        .where('babyId').equals(babyId)
        .sortBy('created')
      const eventRecords = await db.eventRecords
        .where('babyId').equals(babyId)
        .sortBy('timestamp')
      // 依時間倒序（最新的在前），與原版行為一致
      return {
        sleepRecords: sleepRecords.reverse(),
        eventRecords: eventRecords.reverse(),
      }
    } catch (err) {
      error.value = err.message
      return { sleepRecords: [], eventRecords: [] }
    } finally {
      isLoading.value = false
    }
  }

  // ── 睡眠記錄 ─────────────────────────────────────

  const getSleepRecord = async (recordId) => {
    try {
      return (await db.sleepRecords.get(recordId)) || null
    } catch (err) {
      error.value = err.message
      return null
    }
  }

  const saveSleepRecord = async (babyId, record) => {
    try {
      isLoading.value = true
      error.value = null
      const data = normalizeSleepRecord(babyId, record)
      await db.sleepRecords.put(data)
      return data.id
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const deleteSleepRecord = async (_babyId, recordId) => {
    try {
      isLoading.value = true
      error.value = null
      await db.sleepRecords.delete(recordId)
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // ── 事件記錄 ─────────────────────────────────────

  const saveEventRecord = async (babyId, record) => {
    try {
      isLoading.value = true
      error.value = null
      const data = normalizeEventRecord(babyId, record)
      await db.eventRecords.put(data)
      return data.id
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const deleteEventRecord = async (_babyId, recordId) => {
    try {
      isLoading.value = true
      error.value = null
      await db.eventRecords.delete(recordId)
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // ── 批次匯入（供備份還原使用） ────────────────────

  const bulkSaveSleepRecords = async (babyId, records) => {
    if (!records?.length) return
    try {
      isLoading.value = true
      error.value = null
      const data = records.map((r) => normalizeSleepRecord(babyId, r))
      await db.sleepRecords.bulkPut(data)
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const bulkSaveEventRecords = async (babyId, records) => {
    if (!records?.length) return
    try {
      isLoading.value = true
      error.value = null
      const data = records.map((r) => normalizeEventRecord(babyId, r))
      await db.eventRecords.bulkPut(data)
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    loadBabies,
    saveBaby,
    deleteBaby,
    loadBabyRecords,
    getSleepRecord,
    saveSleepRecord,
    saveEventRecord,
    deleteSleepRecord,
    deleteEventRecord,
    bulkSaveSleepRecords,
    bulkSaveEventRecords,
  }
}
