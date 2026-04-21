// src/composables/useDiaryUtils.js
import { ref, computed } from 'vue'

export function useDiaryUtils() {
  const currentTheme = ref(localStorage.getItem('theme') || 'light')

  // 計算年齡
  const calculateAge = (birthDate) => {
    if (!birthDate) return '未設定'
    const birth = new Date(birthDate)
    const today = new Date()
    const diffTime = Math.abs(today - birth)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 30) return `${diffDays} 天`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} 個月 ${diffDays % 30} 天`
    return `${Math.floor(diffDays / 365)} 歲 ${Math.floor((diffDays % 365) / 30)} 個月`
  }

  // 格式化時間長度
  const formatDuration = (minutes) => {
    if (!minutes || minutes < 0) return '0小時0分鐘'
    return `${Math.floor(minutes / 60)}小時${minutes % 60}分鐘`
  }

  // 正規化時間戳
  const normalizeTimestamp = (ts) => {
    if (!ts) return null
    if (typeof ts.toDate === 'function') {
      return ts.toDate()
    }
    const date = new Date(ts)
    return isNaN(date.getTime()) ? null : date
  }

  // 獲取本地日期字符串
  const getLocalDateString = (date) => {
    if (!date) return ''
    const d = date instanceof Date ? date : new Date(date)
    return d.toISOString().split('T')[0]
  }

  // 格式化時間顯示
  const formatTime = (timestamp) => {
    const date = normalizeTimestamp(timestamp)
    return date
      ? date.toLocaleTimeString('zh-TW', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '-'
  }

  // 格式化日期顯示
  const formatDate = (timestamp) => {
    const date = normalizeTimestamp(timestamp)
    return date ? date.toLocaleDateString('zh-TW') : '-'
  }

  // 格式化日期顯示（簡短版）
  const formatShortDate = (timestamp) => {
    const date = normalizeTimestamp(timestamp)
    return date
      ? date.toLocaleDateString('zh-TW', {
          month: '2-digit',
          day: '2-digit',
        })
      : '-'
  }

  // 主題切換
  const toggleTheme = () => {
    currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', currentTheme.value)
    applyTheme()
  }

  // 應用主題
  const applyTheme = () => {
    if (currentTheme.value === 'dark') {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
  }

  // 獲取當前時間
  const getCurrentTime = () => {
    const now = new Date()
    return {
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
      timestamp: now,
    }
  }

  // 獲取今天的日期字符串
  const getTodayString = () => {
    return new Date().toISOString().split('T')[0]
  }

  // 計算睡眠時長
  const calculateSleepDuration = (sleepTime, wakeTime) => {
    if (!sleepTime || !wakeTime) return null

    const sleep = normalizeTimestamp(sleepTime)
    const wake = normalizeTimestamp(wakeTime)

    if (!sleep || !wake) return null

    // 處理跨日情況
    let wakeDateTime = new Date(wake)
    if (wakeDateTime < sleep) {
      wakeDateTime.setDate(wakeDateTime.getDate() + 1)
    }

    const minutes = Math.round((wakeDateTime - sleep) / 60000)
    return minutes >= 0 ? minutes : null
  }

  // 計算入睡時間
  const calculateFallAsleepDuration = (bedTime, sleepTime) => {
    if (!bedTime || !sleepTime) return null

    const bed = normalizeTimestamp(bedTime)
    const sleep = normalizeTimestamp(sleepTime)

    if (!bed || !sleep) return null

    // 處理跨日情況
    let sleepDateTime = new Date(sleep)
    if (sleepDateTime < bed) {
      sleepDateTime.setDate(sleepDateTime.getDate() + 1)
    }

    const minutes = Math.round((sleepDateTime - bed) / 60000)
    return minutes >= 0 ? minutes : null
  }

  // 檢查是否為夜間睡眠
  const isNightSleep = (timestamp) => {
    const date = normalizeTimestamp(timestamp)
    if (!date) return false

    const hour = date.getHours()
    return hour >= 18 || hour < 9
  }

  // 生成備份檔案名稱
  const generateBackupFilename = (babyName) => {
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '')
    return `${babyName}_sleep_backup_${dateStr}_${timeStr}.json`
  }

  // 是否為深色模式
  const isDarkMode = computed(() => currentTheme.value === 'dark')

  // 主題圖標
  const themeIcon = computed(() => (isDarkMode.value ? '☀️' : '🌙'))

  return {
    currentTheme,
    isDarkMode,
    themeIcon,
    calculateAge,
    formatDuration,
    normalizeTimestamp,
    getLocalDateString,
    formatTime,
    formatDate,
    formatShortDate,
    toggleTheme,
    applyTheme,
    getCurrentTime,
    getTodayString,
    calculateSleepDuration,
    calculateFallAsleepDuration,
    isNightSleep,
    generateBackupFilename,
  }
}
