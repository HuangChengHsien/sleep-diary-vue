// src/composables/useFirestore.js
// 本地 IndexedDB 資料存取層（以 Dexie 取代 Firebase Firestore）
// 函式簽名刻意保持與原版相同（移除 userId 參數），composable 層無需大改

import { ref } from 'vue'
import db from '@/db/localDB'

// 將 Date / Firebase Timestamp 統一轉為 ISO 字串（方便 IndexedDB 儲存與 JSON 備份）
const toISO = (val) => {
  if (!val) return null
  if (val instanceof Date) return val.toISOString()
  if (typeof val === 'object' && typeof val.toDate === 'function') return val.toDate().toISOString()
  return String(val)
}

export function useFirestore() {
  const isLoading = ref(false)
  const error = ref(null)

  // 保留此函式名稱以相容現有呼叫，不做任何事
  const enableOffline = async () => {}

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

  const saveSleepRecord = async (babyId, record) => {
    try {
      isLoading.value = true
      error.value = null
      const id = record.id || 'sleep_' + Date.now()
      const data = {
        ...record,
        id,
        babyId,
        bedTimestamp:   toISO(record.bedTimestamp),
        sleepTimestamp: toISO(record.sleepTimestamp),
        wakeTimestamp:  toISO(record.wakeTimestamp),
        created:        toISO(record.created) || new Date().toISOString(),
      }
      await db.sleepRecords.put(data)
      return id
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
      const id = record.id || 'event_' + Date.now()
      const data = {
        ...record,
        id,
        babyId,
        created: toISO(record.created) || new Date().toISOString(),
      }
      await db.eventRecords.put(data)
      return id
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

  return {
    isLoading,
    error,
    enableOffline,
    loadBabies,
    saveBaby,
    deleteBaby,
    loadBabyRecords,
    saveSleepRecord,
    saveEventRecord,
    deleteSleepRecord,
    deleteEventRecord,
  }
}
