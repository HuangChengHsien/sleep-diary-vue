// src/composables/useBabyManagement.js
// 個案（寶寶）資料管理 - 本地儲存版（不需要帳號）

import { ref, computed, watch } from 'vue'
import { useFirestore } from './useFirestore'
import { useDiaryUtils } from './useDiaryUtils'
import db from '@/db/localDB'

export function useBabyManagement() {
  const { loadBabies, saveBaby, deleteBaby, loadBabyRecords, saveSleepRecord, saveEventRecord } =
    useFirestore()
  const { calculateAge } = useDiaryUtils()

  const babies = ref({})
  const currentBabyId = ref(null)
  const sleepRecords = ref([])
  const eventRecords = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  // 當前選中的個案資訊
  const currentBaby = computed(() => {
    return currentBabyId.value ? babies.value[currentBabyId.value] : null
  })

  // 個案列表（含年齡）
  const babyList = computed(() => {
    return Object.entries(babies.value).map(([id, baby]) => ({
      id,
      name: baby.name,
      birthDate: baby.birthDate,
      age: calculateAge(baby.birthDate),
      displayName: `👶 ${baby.name} (${calculateAge(baby.birthDate)})`,
    }))
  })

  // 保存最後選擇的個案 ID 到 localStorage
  watch(currentBabyId, (newId) => {
    if (newId) {
      localStorage.setItem('lastSelectedBabyId', newId)
      localStorage.setItem('selectedBabyId', newId)
    } else {
      localStorage.removeItem('lastSelectedBabyId')
      localStorage.removeItem('selectedBabyId')
    }
  })

  // 載入所有個案
  const loadAllBabies = async () => {
    try {
      isLoading.value = true
      error.value = null
      const babiesData = await loadBabies()
      babies.value = babiesData

      // 嘗試恢復上次選擇的個案
      const lastId =
        localStorage.getItem('lastSelectedBabyId') || localStorage.getItem('selectedBabyId')

      if (lastId && babiesData[lastId]) {
        await selectBaby(lastId)
      }
      return babiesData
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 選擇個案
  const selectBaby = async (babyId) => {
    if (!babyId) {
      currentBabyId.value = null
      sleepRecords.value = []
      eventRecords.value = []
      return
    }

    try {
      isLoading.value = true
      error.value = null
      currentBabyId.value = babyId

      const records = await loadBabyRecords(babyId)
      sleepRecords.value = records.sleepRecords || []
      eventRecords.value = records.eventRecords || []
    } catch (err) {
      error.value = err.message
      sleepRecords.value = []
      eventRecords.value = []
    } finally {
      isLoading.value = false
    }
  }

  // 新增個案
  const addBaby = async (name, birthDate) => {
    if (!name || !birthDate) throw new Error('請填入姓名和出生日期')

    try {
      isLoading.value = true
      error.value = null
      const { babyId, babyInfo } = await saveBaby(name, birthDate)
      babies.value[babyId] = babyInfo
      return { babyId, babyInfo }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 刪除個案
  const removeBaby = async (babyId) => {
    if (!babyId) throw new Error('無效的個案 ID')

    try {
      isLoading.value = true
      error.value = null
      await deleteBaby(babyId)
      delete babies.value[babyId]

      if (currentBabyId.value === babyId) {
        currentBabyId.value = null
        sleepRecords.value = []
        eventRecords.value = []
      }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 重新載入當前個案的記錄
  const reloadCurrentBabyRecords = async () => {
    if (currentBabyId.value) {
      await selectBaby(currentBabyId.value)
    }
  }

  const updateSleepRecords = (newRecords) => { sleepRecords.value = newRecords || [] }
  const updateEventRecords = (newRecords) => { eventRecords.value = newRecords || [] }

  // 為分析頁面提供資料
  const loadBabyData = async (_userId, babyId) => {
    try {
      const records = await loadBabyRecords(babyId)
      return {
        sleepLog: records.sleepRecords || [],
        eventLog: records.eventRecords || [],
      }
    } catch (err) {
      return { sleepLog: [], eventLog: [] }
    }
  }

  // 從備份 JSON 匯入個案資料
  const importBabyData = async (backupData) => {
    const babyId = backupData.babyId
    const babyInfo = backupData.babyInfo

    if (!babyId || !babyInfo) throw new Error('備份檔案格式錯誤')

    try {
      isLoading.value = true

      // 儲存個案基本資料
      await db.babies.put({ id: babyId, ...babyInfo })

      // 儲存睡眠記錄
      const sleepArr = backupData.sleepRecords || []
      for (const rec of sleepArr) {
        await saveSleepRecord(babyId, { ...rec, babyId })
      }

      // 儲存事件記錄
      const eventArr = backupData.records || []
      for (const rec of eventArr) {
        await saveEventRecord(babyId, { ...rec, babyId })
      }

      // 更新記憶體中的個案列表
      babies.value[babyId] = babyInfo
      return babyId
    } catch (err) {
      throw new Error('匯入失敗: ' + err.message)
    } finally {
      isLoading.value = false
    }
  }

  return {
    babies,
    currentBabyId,
    currentBaby,
    babyList,
    sleepRecords,
    eventRecords,
    isLoading,
    error,
    loadAllBabies,
    selectBaby,
    addBaby,
    removeBaby,
    reloadCurrentBabyRecords,
    updateSleepRecords,
    updateEventRecords,
    loadBabyData,
    importBabyData,
  }
}
