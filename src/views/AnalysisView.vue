<template>
  <div class="analysis-container">
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <h3>正在載入數據分析...</h3>
      <p>請稍候，正在驗證登入狀態並載入寶寶資料</p>
    </div>

    <div v-else-if="errorMessage" class="error-container">
      <div class="error-icon">😴</div>
      <h3>無法載入數據</h3>
      <p>{{ errorMessage }}</p>
      <button @click="reloadData">重新載入</button>
    </div>

    <div v-else class="main-content">
      <div class="nav-header">
        <div class="nav-controls">
          <div class="nav-left">
            <div class="baby-info">
              <span>📊</span>
              <span>{{ currentBabyDisplay }}</span>
            </div>

            <div class="baby-selector">
              <select v-model="selectedBabyId" @change="handleBabyChange" :disabled="isLoading">
                <option value="">請選擇個案...</option>
                <option v-for="baby in babyList" :key="baby.id" :value="baby.id">
                  {{ baby.displayName }}
                </option>
              </select>
            </div>
          </div>

          <div class="nav-right">
            <router-link to="/diary" class="back-btn">← 返回日誌</router-link>
            <button @click="printReport" class="back-btn">🖨️ 列印報告</button>
            <button @click="logout" class="back-btn">登出</button>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ filteredStatistics.totalRecords }}</div>
          <div class="stat-label">睡眠記錄總數</div>
          <div class="stat-subtitle">期間: {{ filteredStatistics.dateRange }}</div>
        </div>

        <div class="stat-card" :class="getRatingClass('dailySleep')">
          <div class="stat-value">{{ filteredStatistics.avgDailySleep }}</div>
          <div class="stat-label">每日平均總睡眠</div>
          <div class="stat-subtitle">小時 (含小睡)</div>
        </div>

        <div class="stat-card" :class="getRatingClass('latency')">
          <div class="stat-value">{{ filteredStatistics.avgSleepLatency }}</div>
          <div class="stat-label">平均要多久才會入睡</div>
          <div class="stat-subtitle">分鐘 (僅限夜晚首次就寢)</div>
        </div>

        <div class="stat-card">
          <div class="stat-value">{{ filteredStatistics.avgNightBedtime }}</div>
          <div class="stat-label">夜晚平均就寢時間</div>
          <div class="stat-subtitle">基於每次夜晚首次就寢時間計算</div>
        </div>

        <div class="stat-card" :class="getRatingClass('onset')">
          <div class="stat-value">{{ filteredStatistics.avgSleepOnset }}</div>
          <div class="stat-label">夜晚平均入睡時間</div>
          <div class="stat-subtitle">基於每次夜晚首次入睡時間計算</div>
        </div>

        <div class="stat-card" :class="getRatingClass('wakeup')">
          <div class="stat-value">{{ filteredStatistics.avgWakeUpTime }}</div>
          <div class="stat-label">夜晚平均起床時間</div>
          <div class="stat-subtitle">基於每次夜晚最終醒來時間計算</div>
        </div>
      </div>

      <div class="legend-container">
        <h3>📊 指標邊框顏色說明</h3>
        <p class="legend-intro">卡片左側邊框顏色代表該數據與同齡兒童青少年參考值的比較結果：</p>
        <div class="legend-list">
          <div class="legend-entry">
            <span class="color-box good"></span>
            <b>理想 / 良好:</b> 數據落在最建議的範圍內。
          </div>
          <div class="legend-entry">
            <span class="color-box acceptable"></span>
            <b>可接受:</b> 數據仍在健康範圍內，但可持續觀察。
          </div>
          <div class="legend-entry">
            <span class="color-box improvement"></span>
            <b>需注意 / 改善:</b> 數據已偏離建議範圍，建議多加留意。
          </div>
          <div class="legend-entry">
            <span class="color-box default"></span>
            <b>無評級:</b> 該指標暫無適用於此年齡段的參考資料。
          </div>
        </div>
        <div class="legend-source-footer">
          <b>參考來源:</b> 每日總睡眠、入睡耗時 (National Sleep Fundation)・・入睡/起床時間 (Galland
          et al.)
        </div>
      </div>

      <div class="daily-list-container">
        <div class="daily-list-header">
          <h3>📅 每日睡眠時長明細 (白天/夜晚)</h3>
          <div class="daily-filter-info">
            <span class="filter-badge">{{ getFilterDisplayText() }}</span>
          </div>
        </div>
        <div class="daily-sleep-list">
          <div
            v-if="!filteredDailySleepData || filteredDailySleepData.length === 0"
            class="no-data"
          >
            請先選擇寶寶以生成列表...
          </div>
          <table v-else>
            <thead>
              <tr>
                <th>日期</th>
                <th>總計</th>
                <th>夜晚</th>
                <th>白天</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="data in filteredDailySleepData" :key="data.date">
                <td>{{ data.date }}</td>
                <td>{{ data.totalSleep.toFixed(1) }}h</td>
                <td class="night-sleep">{{ data.nightSleep.toFixed(1) }}h</td>
                <td class="day-sleep">{{ data.daySleep.toFixed(1) }}h</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="control-panel">
        <h3>📈 圖表設定</h3>

        <div class="filter-section">
          <div class="filter-header">
            <h4>📅 顯示範圍篩選</h4>
            <div class="filter-status">
              <span class="status-text">{{ getFilterStatusText() }}</span>
            </div>
          </div>

          <div class="filter-controls">
            <div class="quick-buttons">
              <button
                v-for="option in quickFilterOptions"
                :key="option.value"
                @click="setQuickFilter(option.value)"
                :class="['quick-btn', { active: chartFilter.dayRange === option.value }]"
              >
                {{ option.label }}
              </button>
            </div>

            <button @click="resetFilter" class="reset-btn" title="重置為預設值">🔄 重置</button>
          </div>
        </div>

        <div class="control-row">
          <div class="control-group">
            <label>圖表類型</label>
            <select v-model="chartType" @change="updateChart">
              <option value="timeline">時間軸圖表</option>
              <option value="duration">每次睡眠時間長度趨勢</option>
              <option value="dailyDuration">每日睡眠長度分析</option>
              <option value="bedtime">就寢時間趨勢</option>
              <option value="latency">入睡耗時趨勢</option>
              <option value="wakeCount">清醒次數趨勢</option>
              <option value="weekly">週統計圖</option>
            </select>
          </div>

          <div class="control-group">
            <label>顯示睡眠</label>
            <select v-model="showSleep" @change="updateChart">
              <option value="true">顯示</option>
              <option value="false">隱藏</option>
            </select>
          </div>

          <div class="control-group">
            <label>顯示事件</label>
            <select v-model="showEvents" @change="updateChart">
              <option value="true">顯示</option>
              <option value="false">隱藏</option>
            </select>
          </div>
        </div>
      </div>

      <div class="chart-container">
        <div class="chart-header">
          <h3 class="chart-title">{{ chartTitle }}</h3>
          <div class="chart-actions">
            <button @click="downloadChart" class="download-btn">💾 下載圖片</button>
            <button @click="refreshChart" class="refresh-btn">🔄 重繪</button>
          </div>
        </div>

        <canvas
          v-show="chartType === 'timeline'"
          id="timelineCanvas"
          ref="timelineCanvas"
          width="1200"
          height="2000"
          style="width: 100%; height: 2000px"
        >
        </canvas>

        <canvas
          v-show="chartType === 'duration'"
          id="durationCanvas"
          ref="durationCanvas"
          width="1200"
          height="800"
          style="width: 100%; height: 800px"
        >
        </canvas>

        <canvas
          v-show="chartType === 'dailyDuration'"
          id="dailyDurationCanvas"
          ref="dailyDurationCanvas"
          width="1200"
          height="800"
          style="width: 100%; height: 800px"
        >
        </canvas>

        <canvas
          v-show="chartType === 'bedtime'"
          id="bedtimeCanvas"
          ref="bedtimeCanvas"
          width="1200"
          height="400"
          style="width: 100%; height: 400px"
        >
        </canvas>

        <canvas
          v-show="chartType === 'latency'"
          id="latencyCanvas"
          ref="latencyCanvas"
          width="1200"
          height="400"
          style="width: 100%; height: 400px"
        >
        </canvas>

        <canvas
          v-show="chartType === 'wakeCount'"
          id="wakeCountCanvas"
          ref="wakeCountCanvas"
          width="1200"
          height="400"
          style="width: 100%; height: 400px"
        >
        </canvas>

        <canvas
          v-show="chartType === 'weekly'"
          id="weeklyCanvas"
          ref="weeklyCanvas"
          width="1200"
          height="400"
          style="width: 100%; height: 400px"
        >
        </canvas>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBabyManagement } from '@/composables/useBabyManagement'
import { useChartAnalysis } from '@/composables/useChartAnalysis'
import {
  getLatencyRating,
  getTotalSleepRating,
  getSleepOnsetRating,
  getSleepOffsetRating,
} from '@/composables/sleep-references.js'

const router = useRouter()
const {
  babies,
  currentBabyId,
  currentBaby,
  babyList,
  sleepRecords,
  eventRecords,
  isLoading: babyLoading,
  loadAllBabies,
  selectBaby,
} = useBabyManagement()

const {
  calculateSleepStatistics,
  processDailySleepData,
  renderChart,
  renderDailyDurationChart,
  destroyChart,
  calculateAgeInMonths,
  applyChartTheme,
  DARK_THEME,
  LIGHT_THEME,
} = useChartAnalysis()

// 響應式數據
const isLoading = ref(true)
const errorMessage = ref('')
const selectedBabyId = ref('')
const chartType = ref('timeline')
const showSleep = ref('true')
const showEvents = ref('true')
// 🆕 圖表篩選器相關數據
const chartFilter = ref({
  dayRange: '7', // 預設顯示7天
})

const quickFilterOptions = [
  { label: '7天', value: '7' },
  { label: '14天', value: '14' },
  { label: '28天', value: '28' },
  { label: '全部', value: 'all' },
]

// 🆕 數據篩選輔助函數
const filterDataByDays = (records, dayRange) => {
  if (!records || records.length === 0) return []
  if (dayRange === 'all') return records

  const days = parseInt(dayRange)
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  return records.filter((record) => {
    const recordDate = record.sleepTimestamp
      ? new Date(
          record.sleepTimestamp.seconds ? record.sleepTimestamp.toDate() : record.sleepTimestamp,
        )
      : new Date()
    return recordDate >= cutoffDate
  })
}

// 🆕 事件數據專用篩選函數
const filterEventsByDays = (events, dayRange) => {
  if (!events || events.length === 0) return []
  if (dayRange === 'all') return events

  const days = parseInt(dayRange)
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  return events.filter((event) => {
    // 事件記錄使用 timestamp 字段
    const eventDate = event.timestamp
      ? new Date(event.timestamp.seconds ? event.timestamp.toDate() : event.timestamp)
      : new Date()
    return eventDate >= cutoffDate
  })
}

const filterDailyDataByDays = (dailyData, dayRange) => {
  if (!dailyData || dailyData.length === 0) return []

  // 確保數據按日期正序排列（舊→新）
  const sortedData = [...dailyData].sort((a, b) => new Date(a.date) - new Date(b.date))

  if (dayRange === 'all') {
    return sortedData
  }

  const days = parseInt(dayRange)
  const recentData = sortedData.slice(-days) // 取最後N天
  return recentData
}

// 🆕 篩選後的數據
const filteredSleepRecords = computed(() => {
  return filterDataByDays(sleepRecords.value, chartFilter.value.dayRange)
})

const filteredDailySleepData = computed(() => {
  if (!sleepRecords.value || sleepRecords.value.length === 0) {
    return []
  }
  const dailyData = processDailySleepData(sleepRecords.value)
  return filterDailyDataByDays(dailyData, chartFilter.value.dayRange)
})

// 🆕 基於篩選數據的統計
const filteredStatistics = computed(() => {
  if (!filteredSleepRecords.value || filteredSleepRecords.value.length === 0) {
    return {
      totalRecords: 0,
      avgDailySleep: '0.0',
      avgSleepLatency: 0,
      avgNightBedtime: '--:--',
      avgSleepOnset: '--:--',
      avgWakeUpTime: '--:--',
      dateRange: '-',
    }
  }

  const babyData = currentBaby.value
    ? {
        ...currentBaby.value,
        dob: currentBaby.value.dob || currentBaby.value.birthDate,
      }
    : null
  return calculateSleepStatistics(filteredSleepRecords.value, babyData)
})

// 原有的計算屬性
const currentBabyDisplay = computed(() => {
  if (!currentBaby.value) return '睡眠數據分析'
  return `睡眠數據分析 - ${currentBaby.value.name}`
})

const dailySleepData = computed(() => {
  if (!sleepRecords.value || sleepRecords.value.length === 0) {
    return []
  }
  return processDailySleepData(sleepRecords.value)
})

const reversedDailySleepData = computed(() => {
  return [...dailySleepData.value].reverse()
})

const chartTitle = computed(() => {
  const titles = {
    timeline: '💤 睡眠時間軸圖表',
    duration: '📊 睡眠時間長度趨勢',
    dailyDuration: '📈 每日睡眠分析 (白天/夜晚/總計)',
    bedtime: '🌙 就寢時間趨勢',
    latency: '⏱️ 入睡耗時趨勢',
    wakeCount: '🌙 清醒次數趨勢',
    weekly: '📅 週統計分析',
  }
  const baseTitle = titles[chartType.value] || '睡眠分析圖表'

  // 添加篩選信息到標題
  if (chartFilter.value.dayRange === 'all') {
    return `${baseTitle} (全部記錄)`
  } else {
    return `${baseTitle} (最近 ${chartFilter.value.dayRange} 天)`
  }
})

// 🆕 篩選器相關方法
const handleFilterChange = () => {
  // 保存用戶偏好到 localStorage
  localStorage.setItem('sleepAnalysis_chartFilter', JSON.stringify(chartFilter.value))

  // 更新圖表
  updateChart()
}

const setQuickFilter = (value) => {
  if (chartFilter.value.dayRange !== value) {
    chartFilter.value.dayRange = value
    handleFilterChange()
  }
}

const resetFilter = () => {
  chartFilter.value.dayRange = '7'
  handleFilterChange()
}

const getFilterDisplayText = () => {
  if (chartFilter.value.dayRange === 'all') {
    return '顯示全部記錄'
  }
  return `顯示最近 ${chartFilter.value.dayRange} 天`
}

const getFilterStatusText = () => {
  const totalRecords = sleepRecords.value?.length || 0
  const filteredRecords = filteredSleepRecords.value?.length || 0

  if (chartFilter.value.dayRange === 'all') {
    return `顯示全部 ${totalRecords} 筆記錄`
  } else {
    return `顯示最近 ${chartFilter.value.dayRange} 天的 ${filteredRecords} 筆記錄`
  }
}

// 評級功能（使用篩選後的統計數據）
const getRatingClass = (type) => {
  const stats = filteredStatistics.value // 🆕 使用篩選後的統計數據
  const baby = currentBaby.value

  if (!stats || (!baby?.birthDate && !baby?.dob) || stats.totalRecords === 0) {
    return 'default'
  }

  const birthDate = baby.dob || baby.birthDate
  const ageInMonths = calculateAgeInMonths(birthDate)
  let rating = ''

  switch (type) {
    case 'dailySleep':
      rating = getTotalSleepRating(parseFloat(stats.avgDailySleep), ageInMonths)
      break
    case 'latency':
      rating = getLatencyRating(stats.avgSleepLatency)
      break
    case 'onset':
      rating = getSleepOnsetRating(stats.avgSleepOnset, ageInMonths)
      break
    case 'wakeup':
      rating = getSleepOffsetRating(stats.avgWakeUpTime, ageInMonths)
      break
    default:
      return 'default'
  }

  switch (rating) {
    case 'good':
      return 'good'
    case 'acceptable':
      return 'acceptable'
    case 'improvement':
      return 'improvement'
    default:
      return 'default'
  }
}

// 處理事件記錄格式
const formattedEventData = computed(() => {
  if (!eventRecords.value) return []

  // 🆕 使用事件專用的篩選函數
  const filteredEvents = filterEventsByDays(eventRecords.value, chartFilter.value.dayRange)

  return filteredEvents
    .filter((event) => {
      if (!event.timestamp) {
        console.warn('發現無效的事件資料（缺少 timestamp）:', event)
        return false
      }

      const eventDate = new Date(event.timestamp)
      if (isNaN(eventDate.getTime())) {
        console.warn('發現無效的事件資料（日期無效）:', event)
        return false
      }

      return true
    })
    .map((event) => ({
      ...event,
      dateTime: new Date(event.timestamp || event.dateTime),
      description:
        event.quickEvent ||
        `${getEventTypeName(event.eventType)}${event.notes ? ': ' + event.notes : ''}`,
    }))
    .filter((event) => {
      return event.dateTime && !isNaN(event.dateTime.getTime())
    })
})

const getEventTypeName = (eventType) => {
  const eventNames = {
    feed: '🍼 餵奶',
    diaper: '👶 換尿布',
    play: '🎮 玩耍',
    cry: '😢 哭泣',
    medicine: '💊 餵藥',
    bath: '🛁 洗澡',
    other: '📝 其他',
  }
  return eventNames[eventType] || eventType || '其他事件'
}

// 方法
const handleBabyChange = async () => {
  if (selectedBabyId.value) {
    try {
      await selectBaby(selectedBabyId.value)
      await updateChart()
    } catch (error) {
      console.error('選擇個案失敗:', error)
      errorMessage.value = '選擇個案失敗'
    }
  }
}

const updateChart = async () => {
  if (!filteredSleepRecords.value || filteredSleepRecords.value.length === 0) {
    return
  }

  await nextTick()

  try {
    // 特別處理 dailyDuration 圖表
    if (chartType.value === 'dailyDuration') {
      // 直接調用你修改後的 renderDailyDurationChart 函數
      renderDailyDurationChart(
        filteredDailySleepData.value, // 🎯 關鍵：使用每日匯總數據
        currentBaby.value,
        chartFilter.value.dayRange, // 🎯 關鍵：傳入篩選範圍
      )
    } else {
      // 其他圖表使用原有邏輯
      renderChart(
        null,
        chartType.value,
        filteredSleepRecords.value,
        formattedEventData.value,
        showEvents.value,
        showSleep.value,
        currentBaby.value,
        chartFilter.value,
      )
    }
  } catch (error) {
    console.error('圖表渲染失敗:', error)
  }
}

// Watch 監聽器
watch(
  currentBaby,
  (newBaby) => {
    if (newBaby && sleepRecords.value.length > 0) {
      setTimeout(() => {
        updateChart()
      }, 100)
    }
  },
  { deep: true },
)

const refreshChart = () => {
  updateChart()
}

const downloadChart = () => {
  const canvasId = `${chartType.value}Canvas`
  const canvas = document.getElementById(canvasId)

  if (!canvas) return

  try {
    const babyName = currentBaby.value?.name || '個案'
    const chartTypeName = chartTitle.value.replace(/[📊💤📈🌙⏱️📅]/g, '').trim()
    const currentDate = new Date().toISOString().split('T')[0]
    const filterSuffix =
      chartFilter.value.dayRange === 'all' ? '全部' : `${chartFilter.value.dayRange}天`

    // 用 off-screen canvas 合成深色背景，確保 PNG 顏色正確
    const offscreen = document.createElement('canvas')
    offscreen.width = canvas.width
    offscreen.height = canvas.height
    const ctx = offscreen.getContext('2d')
    ctx.fillStyle = DARK_THEME.canvasBg
    ctx.fillRect(0, 0, offscreen.width, offscreen.height)
    ctx.drawImage(canvas, 0, 0)

    const link = document.createElement('a')
    link.download = `${babyName}_${chartTypeName}_${filterSuffix}_${currentDate}.png`
    link.href = offscreen.toDataURL('image/png', 1.0)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    alert('下載圖表失敗，請稍後再試')
  }
}

const printReport = () => {
  window.print()
}

const logout = async () => {
  try {
    router.push('/diary')
  } catch (error) {
    console.error('登出失敗:', error)
  }
}

const reloadData = async () => {
  errorMessage.value = ''
  isLoading.value = true

  try {
    await loadAllBabies()
    isLoading.value = false
  } catch (error) {
    console.error('載入數據失敗:', error)
    errorMessage.value = error.message || '載入數據失敗'
    isLoading.value = false
  }
}

// 監聽器
watch(currentBabyId, (newId) => {
  selectedBabyId.value = newId
})

watch(
  () => sleepRecords.value,
  (newRecords) => {
    if (newRecords && newRecords.length > 0) {
      updateChart()
    }
  },
  { deep: true, immediate: true },
)

watch([chartType, showSleep, showEvents], () => {
  updateChart()
})

watch(
  () => chartFilter.value.dayRange,
  () => {
    updateChart()
  },
)

// 生命周期
onMounted(async () => {
  try {
    // 載入用戶的篩選偏好
    const savedFilter = localStorage.getItem('sleepAnalysis_chartFilter')
    if (savedFilter) {
      try {
        const parsedFilter = JSON.parse(savedFilter)
        chartFilter.value = { ...chartFilter.value, ...parsedFilter }
      } catch (error) {
        console.warn('篩選偏好解析失敗:', error)
      }
    }

    await loadAllBabies()

    // 檢查 URL 參數或本地存儲的寶寶 ID
    const urlParams = new URLSearchParams(window.location.search)
    const urlBabyId = urlParams.get('babyId')
    const savedBabyId = localStorage.getItem('selectedBabyId')

    if (urlBabyId && babies.value[urlBabyId]) {
      selectedBabyId.value = urlBabyId
      await selectBaby(urlBabyId)
    } else if (savedBabyId && babies.value[savedBabyId]) {
      selectedBabyId.value = savedBabyId
      await selectBaby(savedBabyId)
    } else if (Object.keys(babies.value).length > 0) {
      const firstBabyId = Object.keys(babies.value)[0]
      selectedBabyId.value = firstBabyId
      await selectBaby(firstBabyId)
    }

    if (Object.keys(babies.value).length === 0) {
      errorMessage.value = '您還沒有添加任何個案資料，請先到日誌頁面添加個案'
    }

    isLoading.value = false

    // 確保在有寶寶資料時立即更新圖表
    if (currentBaby.value && sleepRecords.value && sleepRecords.value.length > 0) {
      setTimeout(() => {
        updateChart()
      }, 500)
    }
  } catch (error) {
    console.error('AnalysisView 初始化失敗:', error)
    errorMessage.value = error.message || '初始化失敗'
    isLoading.value = false
  }
})

onUnmounted(() => {
  destroyChart()
})
</script>

<style scoped>
/* ── Base ─────────────────────────────────────────── */

.analysis-container,
.main-content {
  min-height: 100vh;
  background: #0A1020;
  background-image: radial-gradient(ellipse at 20% 0%, rgba(159,212,212,0.06), transparent 50%);
  color: #F1EDE0;
  font-family: -apple-system, 'PingFang TC', 'Helvetica Neue', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ── Loading / Error ──────────────────────────────── */
.loading-container,
.error-container {
  min-height: 100vh;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: #0A1020; color: #F1EDE0;
  gap: 12px; text-align: center; padding: 20px;
}

.loading-spinner {
  width: 40px; height: 40px;
  border: 2px solid rgba(159,212,212,0.15);
  border-top-color: #9FD4D4;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.error-icon { font-size: 48px; }
.loading-container h3,
.error-container h3 { font-size: 18px; font-weight: 600; color: #F1EDE0; margin: 0; }
.loading-container p,
.error-container p  { font-size: 13px; color: rgba(241,237,224,0.5); margin: 0; }

.error-container button {
  margin-top: 8px;
  padding: 10px 24px;
  background: rgba(159,212,212,0.1);
  color: #9FD4D4;
  border: 1px solid rgba(159,212,212,0.2);
  border-radius: 10px;
  font-size: 14px; cursor: pointer; font-family: inherit;
}

/* ── Nav header ───────────────────────────────────── */
.nav-header {
  background: rgba(10,16,32,0.9);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  border-bottom: 1px solid rgba(241,237,224,0.08);
  position: sticky; top: 0; z-index: 100;
}

.nav-controls {
  max-width: 1200px; margin: 0 auto;
  padding: 12px 20px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap;
}

.nav-left,
.nav-right {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}

.baby-info {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: rgba(241,237,224,0.7);
}

.baby-selector select {
  background: #1A2340;
  color: #F1EDE0;
  border: 1px solid rgba(241,237,224,0.1);
  border-radius: 8px;
  padding: 10px 14px;
  min-height: 44px;
  font-size: 16px; font-family: inherit;
  appearance: none; cursor: pointer;
}

.back-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 8px 14px;
  min-height: 40px;
  background: rgba(241,237,224,0.05);
  color: rgba(241,237,224,0.6);
  border: 1px solid rgba(241,237,224,0.1);
  border-radius: 8px;
  cursor: pointer; font-size: 13px; font-family: inherit;
  text-decoration: none; white-space: nowrap;
  transition: background 0.2s, color 0.2s;
}

.back-btn:hover { background: rgba(241,237,224,0.1); color: #F1EDE0; }

/* ── Stats grid ───────────────────────────────────── */
.stats-grid {
  max-width: 1200px; margin: 16px auto 0;
  padding: 0 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.stat-card {
  background: #131B33;
  border: 1px solid rgba(241,237,224,0.08);
  border-radius: 14px;
  padding: 16px;
  position: relative;
}

/* Rating border colours */
.stat-card.good        { border-left: 3px solid #4CAF8A; }
.stat-card.acceptable  { border-left: 3px solid #6EA8D4; }
.stat-card.improvement { border-left: 3px solid #D4B36A; }

.stat-value {
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 26px; font-weight: 500;
  color: #F1EDE0; letter-spacing: -0.5px; line-height: 1;
}

.stat-label {
  font-size: 13px; color: rgba(241,237,224,0.65);
  margin-top: 8px; line-height: 1.4;
}

.stat-subtitle {
  font-size: 11px; color: rgba(241,237,224,0.35);
  margin-top: 3px;
  font-family: 'SF Mono', Menlo, monospace;
}

/* ── Legend ───────────────────────────────────────── */
.legend-container {
  max-width: 1200px; margin: 16px auto 0;
  padding: 16px 20px;
  background: #131B33;
  border: 1px solid rgba(241,237,224,0.08);
  border-radius: 14px;
}

.legend-container h3 {
  font-size: 14px; font-weight: 500; color: #F1EDE0; margin: 0 0 6px;
}

.legend-intro {
  font-size: 12px; color: rgba(241,237,224,0.5); margin-bottom: 12px;
}

.legend-list { display: flex; flex-direction: column; gap: 8px; }

.legend-entry {
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; color: rgba(241,237,224,0.65);
}

.color-box {
  width: 12px; height: 20px; border-radius: 3px; flex-shrink: 0;
}

.color-box.good        { background: #4CAF8A; }
.color-box.acceptable  { background: #6EA8D4; }
.color-box.improvement { background: #D4B36A; }
.color-box.default     { background: rgba(241,237,224,0.15); border: 1px solid rgba(241,237,224,0.2); }

.legend-source-footer {
  margin-top: 12px;
  font-size: 10px; color: rgba(241,237,224,0.3);
  font-family: 'SF Mono', Menlo, monospace;
  border-top: 1px solid rgba(241,237,224,0.06); padding-top: 10px;
}

/* ── Daily list ───────────────────────────────────── */
.daily-list-container {
  max-width: 1200px; margin: 16px auto 0;
  padding: 0 20px;
}

.daily-list-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px;
}

.daily-list-header h3 {
  font-size: 14px; font-weight: 500; color: #F1EDE0; margin: 0;
}

.daily-filter-info { display: flex; align-items: center; }

.filter-badge {
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 10px; color: #9FD4D4;
  background: rgba(159,212,212,0.08);
  border: 1px solid rgba(159,212,212,0.15);
  border-radius: 100px; padding: 3px 10px;
}

.daily-sleep-list {
  background: #131B33;
  border: 1px solid rgba(241,237,224,0.08);
  border-radius: 14px; overflow: hidden;
}

.no-data {
  padding: 32px; text-align: center;
  font-size: 13px; color: rgba(241,237,224,0.3);
}

table { width: 100%; border-collapse: collapse; }
table th {
  background: rgba(241,237,224,0.04);
  color: rgba(241,237,224,0.5);
  font-size: 12px; font-weight: 500;
  font-family: 'SF Mono', Menlo, monospace;
  letter-spacing: 1px; text-align: left;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(241,237,224,0.07);
}

table td {
  padding: 12px 14px;
  font-size: 14px; color: rgba(241,237,224,0.75);
  border-bottom: 1px solid rgba(241,237,224,0.05);
}

table tr:last-child td { border-bottom: none; }
table tr:hover td { background: rgba(241,237,224,0.02); }
.night-sleep { color: #9FD4D4 !important; }
.day-sleep   { color: #D4B36A  !important; }

/* ── Control panel ────────────────────────────────── */
.control-panel {
  max-width: 1200px; margin: 16px auto 0;
  padding: 16px 20px;
  background: #131B33;
  border: 1px solid rgba(241,237,224,0.08);
  border-radius: 14px;
}

.control-panel h3 {
  font-size: 14px; font-weight: 500; color: #F1EDE0; margin: 0 0 14px;
}

.filter-section {
  margin-bottom: 16px;
}

.filter-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 0 10px;
}

.filter-header h4 {
  font-size: 13px; font-weight: 500; color: #F1EDE0; margin: 0;
}

.filter-status .status-text {
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 11px; color: rgba(241,237,224,0.4);
}

.filter-controls {
  display: flex; align-items: center; gap: 8px;
  flex-wrap: wrap;
}

.quick-buttons {
  display: flex; gap: 6px; flex-wrap: wrap;
}

.quick-btn {
  padding: 10px 18px; border-radius: 100px;
  min-height: 44px;
  font-size: 14px; font-family: 'SF Mono', Menlo, monospace;
  cursor: pointer; white-space: nowrap;
  background: transparent;
  color: rgba(241,237,224,0.45);
  border: 1px solid rgba(241,237,224,0.1);
  transition: all 0.15s;
}

.quick-btn.active {
  background: rgba(159,212,212,0.1);
  border-color: rgba(159,212,212,0.25);
  color: #9FD4D4;
}

.quick-btn:hover:not(.active) {
  background: rgba(241,237,224,0.05);
  color: rgba(241,237,224,0.7);
}

.reset-btn {
  padding: 10px 18px; border-radius: 100px;
  min-height: 44px;
  font-size: 14px; cursor: pointer; font-family: inherit;
  background: rgba(212,179,106,0.08);
  color: rgba(212,179,106,0.7);
  border: 1px solid rgba(212,179,106,0.15);
  transition: all 0.15s;
}

.reset-btn:hover { background: rgba(212,179,106,0.14); color: #D4B36A; }

.control-row {
  display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end;
}

.control-group {
  display: flex; flex-direction: column; gap: 6px; min-width: 160px;
}

.control-group label {
  font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
  color: rgba(241,237,224,0.4);
  font-family: 'SF Mono', Menlo, monospace;
}

.control-group select {
  background: #1A2340;
  color: #F1EDE0;
  border: 1px solid rgba(241,237,224,0.1);
  border-radius: 8px;
  padding: 12px 14px; font-size: 16px;
  min-height: 48px;
  font-family: inherit; appearance: none; cursor: pointer;
}

/* ── Chart container ──────────────────────────────── */
.chart-container {
  max-width: 1200px; margin: 16px auto 0;
  padding: 0 20px 60px;
}

.chart-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px; flex-wrap: wrap; gap: 10px;
}

.chart-title {
  font-size: 15px; font-weight: 500; color: #F1EDE0; margin: 0;
}

.chart-actions { display: flex; gap: 8px; }

.download-btn,
.refresh-btn {
  padding: 10px 16px; border-radius: 8px;
  min-height: 44px;
  font-size: 13px; cursor: pointer; font-family: inherit;
  background: rgba(241,237,224,0.05);
  color: rgba(241,237,224,0.5);
  border: 1px solid rgba(241,237,224,0.1);
  transition: all 0.15s;
}

.download-btn:hover,
.refresh-btn:hover {
  background: rgba(241,237,224,0.1); color: #F1EDE0;
}

canvas {
  display: block;
  border-radius: 14px;
  background: #131B33 !important;
}

/* 非 timeline 圖表固定高度，!important 防止 Chart.js resize loop */
#durationCanvas,
#dailyDurationCanvas { height: 800px !important; }
#bedtimeCanvas,
#latencyCanvas,
#wakeCountCanvas,
#weeklyCanvas        { height: 400px !important; }
/* #timelineCanvas 高度由 useChartAnalysis 動態注入 <style> 控制 */

/* ── Print ────────────────────────────────────────── */
@media print {
  .analysis-container,
  .main-content {
    background: #ffffff !important;
    color: #111 !important;
  }

  .nav-header { display: none !important; }

  .stats-grid { page-break-inside: avoid; }

  .stat-card {
    background: #f8f8f8 !important;
    border-color: #ddd !important;
  }

  .stat-value { color: #111 !important; }
  .stat-label { color: #444 !important; }
  .stat-subtitle { color: #666 !important; }

  .legend-container,
  .daily-list-container,
  .control-panel { page-break-inside: avoid; }

  .legend-container {
    background: #f8f8f8 !important;
    border-color: #ddd !important;
    color: #333 !important;
  }

  .legend-entry { color: #333 !important; }
  .legend-container h3 { color: #111 !important; }
  .legend-intro { color: #555 !important; }

  .control-panel { display: none !important; }

  .daily-sleep-list {
    background: #f8f8f8 !important;
    border-color: #ddd !important;
  }

  table th {
    background: #eee !important;
    color: #333 !important;
  }

  table td { color: #333 !important; }

  canvas {
    page-break-inside: avoid;
    filter: invert(1) !important;
    background: #131B33 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .chart-actions { display: none !important; }

  .filter-badge {
    background: #eee !important;
    color: #555 !important;
    border-color: #ccc !important;
  }
}

/* ── RWD ──────────────────────────────────────────── */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
    padding: 0 14px;
  }
  .nav-controls { padding: 10px 14px; }
  .control-row { flex-direction: column; }
  .control-group { min-width: 100%; }
  .legend-container,
  .daily-list-container,
  .control-panel,
  .chart-container {
    padding-left: 14px;
    padding-right: 14px;
  }
  .quick-buttons { gap: 8px; }
  .filter-controls { gap: 10px; }
}

@media (max-width: 480px) {
  .stats-grid { grid-template-columns: 1fr; }
  .stat-value { font-size: 24px; }
  .back-btn { padding: 8px 12px; font-size: 13px; }
  .chart-actions { width: 100%; justify-content: flex-end; }
}
</style>
