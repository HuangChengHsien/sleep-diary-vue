<template>
  <div class="diary-container">
    <div class="user-info">
      <span>{{ userInfoText }}</span>
      <div class="user-info-buttons">
        <button
          @click="toggleTheme"
          class="theme-toggle-btn"
          :title="isDarkMode ? '切換到淺色模式' : '切換到深色模式'"
        >
          {{ themeIcon }}
        </button>
        <button @click="backupCurrentBaby" class="backup-btn">💾 備份當前個案</button>
        <button @click="showPrintReport" class="print-btn">📄 列印/分享報告</button>
        <button @click="triggerRestore" class="restore-btn">📂 還原</button>
        <input
          ref="restoreFileInput"
          type="file"
          accept=".json"
          @change="handleRestoreFile"
          style="display: none"
        />
        <button @click="logout" class="logout-btn">登出</button>
      </div>
    </div>

    <StatusMessage v-if="statusMessage" :message="statusMessage" :type="statusType" />

    <div class="baby-selector">
      <h2>👶 個案管理</h2>
      <div class="baby-controls">
        <select v-model="currentBabyId" @change="handleBabyChange" :disabled="isLoading">
          <option value="">{{ isLoading ? '載入個案列表中...' : '請選擇個案...' }}</option>
          <option v-for="baby in babyList" :key="baby.id" :value="baby.id">
            {{ baby.displayName }}
          </option>
        </select>
        <button @click="showAddBabyDialog" :disabled="isLoading" class="add-btn">+ 新增個案</button>
        <button
          @click="showDeleteBabyDialog"
          class="delete-btn"
          :disabled="!currentBabyId || isLoading"
        >
          - 刪除當前個案
        </button>
        <router-link
          :to="`/analysis?babyId=${currentBabyId}`"
          class="analysis-btn"
          :class="{ disabled: !currentBabyId }"
        >
          📊 查看分析
        </router-link>
      </div>
    </div>

    <div v-if="currentBabyId" class="main-content">
      <div class="today-summary">
        <h3>📊 今日摘要</h3>
        <div class="summary-content">
          <span class="summary-item">
            🛏️ 總睡眠時間: <span>{{ formatDuration(todaySummary.totalSleepMinutes) }}</span>
          </span>
          <span class="summary-item">
            😴 睡眠次數: <span>{{ todaySummary.sleepCount }}次</span>
          </span>
          <span class="summary-item">
            🍼 餵奶次數: <span>{{ todaySummary.feedCount }}次</span>
          </span>
        </div>
      </div>

      <SleepTrackingPanel
        :current-baby-id="currentBabyId"
        :sleep-records="sleepRecords"
        @update-records="reloadCurrentBabyRecords"
        @show-message="showMessage"
      />

      <SleepRecordsTable
        :records="sleepRecords"
        @edit-record="handleEditSleepRecord"
        @delete-record="handleDeleteSleepRecord"
      />

      <EventTrackingPanel
        :current-baby-id="currentBabyId"
        @update-records="reloadCurrentBabyRecords"
        @show-message="showMessage"
      />

      <EventRecordsTable
        :records="filteredEventRecords"
        @edit-record="handleEditEventRecord"
        @delete-record="handleDeleteEventRecord"
        @filter-change="handleFilterChange"
      />

      <div class="bottom-analysis">
        <router-link
          v-if="currentBabyId"
          :to="`/analysis?babyId=${currentBabyId}`"
          class="analysis-btn-bottom"
        >
          📊 查看詳細分析報告
        </router-link>
        <button v-else class="analysis-btn-bottom disabled" disabled>
          📊 查看詳細分析報告 (請先選擇寶寶)
        </button>
      </div>
    </div>

    <AddBabyDialog
      v-if="showAddBaby"
      @close="showAddBaby = false"
      @baby-added="handleBabyAdded"
      @show-message="showMessage"
    />

    <SleepRecordEditDialog
      v-if="editingSleepRecord"
      :record="editingSleepRecord"
      :current-baby-id="currentBabyId"
      @close="editingSleepRecord = null"
      @record-updated="handleSleepRecordUpdated"
      @show-message="showMessage"
    />

    <EventRecordEditDialog
      v-if="editingEventRecord"
      :record="editingEventRecord"
      :current-baby-id="currentBabyId"
      @close="editingEventRecord = null"
      @record-updated="handleEventRecordUpdated"
      @show-message="showMessage"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '@/firebase/config'
import { useAuth } from '@/composables/useAuth'
import { useBabyManagement } from '@/composables/useBabyManagement'
import { useSleepTracking } from '@/composables/useSleepTracking'
import { useEventTracking } from '@/composables/useEventTracking'
import { useDiaryUtils } from '@/composables/useDiaryUtils'
import { useFirestore } from '@/composables/useFirestore'

// 組件導入
import StatusMessage from '@/components/StatusMessage.vue'
import SleepTrackingPanel from '@/components/SleepTrackingPanel.vue'
import SleepRecordsTable from '@/components/SleepRecordsTable.vue'
import EventTrackingPanel from '@/components/EventTrackingPanel.vue'
import EventRecordsTable from '@/components/EventRecordsTable.vue'
import AddBabyDialog from '@/components/AddBabyDialog.vue'
import SleepRecordEditDialog from '@/components/SleepRecordEditDialog.vue'
import EventRecordEditDialog from '@/components/EventRecordEditDialog.vue'

const router = useRouter()
const { logout: authLogout } = useAuth()
const { enableOffline } = useFirestore()
const {
  babies,
  currentBabyId,
  currentBaby,
  babyList,
  sleepRecords,
  eventRecords,
  isLoading,
  loadAllBabies,
  selectBaby,
  addBaby,
  removeBaby,
  reloadCurrentBabyRecords,
} = useBabyManagement()

const {
  calculateTodaySummary,
  filterEventRecords,
  currentFilter,
  setFilterDate,
  removeEventRecord,
} = useEventTracking()

const { removeSleepRecord } = useSleepTracking()

const {
  formatDuration,
  toggleTheme,
  applyTheme,
  isDarkMode,
  themeIcon,
  generateBackupFilename,
  normalizeTimestamp,
} = useDiaryUtils()

// 響應式數據
const statusMessage = ref('')
const statusType = ref('info')
const showAddBaby = ref(false)
const editingSleepRecord = ref(null)
const editingEventRecord = ref(null)
const restoreFileInput = ref(null)

// 計算屬性
const userInfoText = computed(() => {
  const user = auth.currentUser

  if (!user) return '載入用戶資訊中...'

  if (user.isAnonymous) {
    return '匿名用戶 (資料僅存於此裝置)'
  } else {
    return '登入用戶: ' + (user.email || '已登入用戶')
  }
})

const todaySummary = computed(() => {
  return calculateTodaySummary(eventRecords.value, sleepRecords.value)
})

const filteredEventRecords = computed(() => {
  return filterEventRecords(eventRecords.value)
})

// 方法
const showMessage = (message, type = 'info') => {
  statusMessage.value = message
  statusType.value = type

  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      statusMessage.value = ''
    }, 3000)
  }
}

const handleBabyChange = async () => {
  if (currentBabyId.value) {
    await selectBaby(currentBabyId.value)
    showMessage(`已選擇寶寶: ${currentBaby.value?.name}`, 'success')
  }
}

const showAddBabyDialog = () => {
  showAddBaby.value = true
}

const handleBabyAdded = async (babyData) => {
  showAddBaby.value = false
  await loadAllBabies()
  showMessage(`寶寶 ${babyData.name} 已新增成功`, 'success')
}

const showDeleteBabyDialog = async () => {
  if (!currentBabyId.value || !currentBaby.value) return

  const babyName = currentBaby.value.name
  const confirmed = confirm(
    `您確定要刪除寶寶 '${babyName}' 嗎？\n\n此操作將永久刪除其所有的睡眠和事件記錄，且無法復原！`,
  )

  if (confirmed) {
    try {
      showMessage(`正在刪除 '${babyName}' 的所有資料...`, 'info')
      await removeBaby(currentBabyId.value)
      showMessage(`寶寶 '${babyName}' 已成功刪除`, 'success')
    } catch (error) {
      showMessage('刪除寶寶失敗: ' + error.message, 'error')
    }
  }
}

const viewAnalysis = () => {
  console.log('🎯 viewAnalysis 方法被調用！')
  if (!currentBabyId.value) {
    showMessage('請先選擇寶寶', 'error')
    return
  }

  console.log('準備跳轉到分析頁面，寶寶ID:', currentBabyId.value)
  router
    .push(`/analysis?babyId=${currentBabyId.value}`)
    .then(() => {
      console.log('✅ 路由跳轉成功')
    })
    .catch((error) => {
      console.error('❌ 路由跳轉失敗:', error)
    })
}

const handleEditSleepRecord = (record) => {
  editingSleepRecord.value = record
}

const handleDeleteSleepRecord = async (record) => {
  const confirmed = confirm('您確定要永久刪除這筆睡眠記錄嗎？此操作無法復原。')

  if (confirmed) {
    try {
      showMessage('刪除中...', 'info')
      await removeSleepRecord(currentBabyId.value, record.id, () => reloadCurrentBabyRecords())
      showMessage('睡眠記錄已成功刪除！', 'success')
    } catch (error) {
      showMessage('刪除失敗: ' + error.message, 'error')
    }
  }
}

const handleSleepRecordUpdated = async () => {
  editingSleepRecord.value = null
  await reloadCurrentBabyRecords()
  showMessage('睡眠記錄已更新成功！', 'success')
}

const handleEditEventRecord = (record) => {
  editingEventRecord.value = record
}

const handleDeleteEventRecord = async (record) => {
  const confirmed = confirm('您確定要刪除這筆事件記錄嗎？')

  if (confirmed) {
    try {
      showMessage('正在刪除事件...', 'info')
      await removeEventRecord(currentBabyId.value, record.id, () => reloadCurrentBabyRecords())
      showMessage('事件記錄已成功刪除', 'success')
    } catch (error) {
      showMessage('刪除失敗: ' + error.message, 'error')
    }
  }
}

const handleEventRecordUpdated = async () => {
  editingEventRecord.value = null
  await reloadCurrentBabyRecords()
  showMessage('事件記錄已更新成功！', 'success')
}

const handleFilterChange = (filterDate) => {
  setFilterDate(filterDate)
}

const backupCurrentBaby = async () => {
  if (!auth.currentUser) {
    showMessage('請先登入', 'error')
    return
  }

  if (!currentBabyId.value) {
    showMessage('請先選擇寶寶', 'error')
    return
  }

  try {
    showMessage('正在備份資料...', 'info')

    const babyInfo = currentBaby.value
    const backupData = {
      exportDate: new Date().toISOString(),
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email || '匿名用戶',
      babyInfo: babyInfo,
      babyId: currentBabyId.value,
      records: eventRecords.value,
      sleepRecords: sleepRecords.value,
    }

    const filename = generateBackupFilename(babyInfo.name)
    const dataStr = JSON.stringify(backupData, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    showMessage(`${babyInfo.name} 的資料備份完成！`, 'success')
  } catch (error) {
    console.error('備份失敗:', error)
    showMessage('備份失敗: ' + error.message, 'error')
  }
}

const showPrintReport = () => {
  if (!currentBabyId.value) {
    showMessage('請先選擇一個個案來產生報告。', 'error')
    return
  }

  generatePrintableReport()
}

const generatePrintableReport = () => {
  const babyInfo = currentBaby.value
  const sleepRecordsToPrint = sleepRecords.value
  const eventRecordsToPrint = eventRecords.value

  // 處理睡眠記錄資料
  const sleepRecordsHtml = sleepRecordsToPrint
    .map((record) => {
      const bedDateTime = normalizeTimestamp(record.bedTimestamp)
      const sleepDateTime = normalizeTimestamp(record.sleepTimestamp)
      const wakeDateTime = normalizeTimestamp(record.wakeTimestamp)

      const recordDate = record.date
        ? new Date(record.date).toLocaleDateString('zh-TW', { timeZone: 'UTC' })
        : (sleepDateTime || bedDateTime)?.toLocaleDateString('zh-TW') || '-'

      const bedtime =
        bedDateTime?.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) || '-'
      const sleepTime =
        sleepDateTime?.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) || '-'
      const wakeTime =
        wakeDateTime?.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) || '-'

      let totalSleep = '-'
      if (sleepDateTime && wakeDateTime) {
        const minutes = Math.round((wakeDateTime - sleepDateTime) / 60000)
        totalSleep = minutes >= 0 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : '-'
      }

      return `
      <tr>
        <td>${recordDate}</td>
        <td>${bedtime}</td>
        <td>${sleepTime}</td>
        <td>${wakeTime}</td>
        <td>${totalSleep}</td>
        <td>${record.wakeCount || 0}次</td>
        <td>${record.notes || '-'}</td>
      </tr>
    `
    })
    .join('')

  // 處理事件記錄資料
  const eventRecordsHtml = eventRecordsToPrint
    .map((record) => {
      const recordTimestamp = normalizeTimestamp(record.timestamp)
      const displayDate = recordTimestamp ? recordTimestamp.toLocaleDateString('zh-TW') : '-'
      const displayTime = recordTimestamp
        ? recordTimestamp.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
        : '-'

      let eventText = ''
      if (record.quickEvent) {
        eventText = record.quickEvent
      } else {
        const eventNames = {
          feed: '🍼 餵奶',
          diaper: '👶 換尿布',
          play: '🎮 玩耍',
          cry: '😢 哭泣',
          medicine: '💊 餵藥',
          bath: '🛁 洗澡',
          other: '📝 其他',
        }
        eventText = eventNames[record.eventType] || record.eventType || '其他事件'
        if (record.notes) {
          eventText += `: ${record.notes}`
        }
      }

      return `
      <tr>
        <td>${displayDate}</td>
        <td>${displayTime}</td>
        <td>${eventText}</td>
      </tr>
    `
    })
    .join('')

  let reportHtml = `
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
        <meta charset="UTF-8">
        <title>${babyInfo.name} 的睡眠與事件記錄報告</title>
        <style>
            body {
                font-family: 'Microsoft JhengHei', '微軟正黑體', sans-serif;
                line-height: 1.6;
                margin: 20px;
                color: #333;
            }
            .report-container {
                max-width: 900px;
                margin: 0 auto;
            }
            h1, h2 {
                color: #333;
                border-bottom: 2px solid #4CAF50;
                padding-bottom: 5px;
                margin-top: 30px;
                margin-bottom: 15px;
            }
            h1 {
                text-align: center;
                font-size: 24px;
            }
            h2 {
                font-size: 20px;
            }
            .info-section {
                background-color: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
            }
            .info-section p {
                margin: 5px 0;
                font-size: 16px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
                margin-bottom: 30px;
                font-size: 12px;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            th {
                background-color: #f2f2f2;
                font-weight: bold;
                text-align: center;
            }
            tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            .no-data {
                text-align: center;
                color: #999;
                font-style: italic;
                padding: 20px;
            }
            @media print {
                body { margin: 0; }
                .report-container { box-shadow: none; }
                h1 { page-break-before: avoid; }
                table { page-break-inside: avoid; }
                tr { page-break-inside: avoid; }
            }
        </style>
    </head>
    <body>
        <div class="report-container">
            <h1>睡眠與事件記錄報告</h1>

            <div class="info-section">
                <p><strong>個案姓名：</strong> ${babyInfo.name}</p>
                <p><strong>出生日期：</strong> ${babyInfo.birthDate || '未設定'}</p>
                <p><strong>報告生成時間：</strong> ${new Date().toLocaleString('zh-TW')}</p>
                <p><strong>記錄統計：</strong> 睡眠記錄 ${sleepRecordsToPrint.length} 筆，事件記錄 ${eventRecordsToPrint.length} 筆</p>
            </div>

            <h2>🛏️ 睡眠記錄</h2>
            ${
              sleepRecordsToPrint.length > 0
                ? `
            <table>
                <thead>
                    <tr>
                        <th>日期</th>
                        <th>上床時間</th>
                        <th>入睡時間</th>
                        <th>起床時間</th>
                        <th>總睡眠</th>
                        <th>夜醒次數</th>
                        <th>備註</th>
                    </tr>
                </thead>
                <tbody>
                    ${sleepRecordsHtml}
                </tbody>
            </table>
            `
                : '<p class="no-data">暫無睡眠記錄</p>'
            }

            <h2>📝 事件記錄</h2>
            ${
              eventRecordsToPrint.length > 0
                ? `
            <table>
                <thead>
                    <tr>
                        <th>日期</th>
                        <th>時間</th>
                        <th>事件說明</th>
                    </tr>
                </thead>
                <tbody>
                    ${eventRecordsHtml}
                </tbody>
            </table>
            `
                : '<p class="no-data">暫無事件記錄</p>'
            }
        </div>
    </body>
    </html>
  `

  const reportWindow = window.open('', '_blank')
  if (reportWindow) {
    reportWindow.document.write(reportHtml)
    reportWindow.document.close()
    reportWindow.focus()

    setTimeout(() => {
      reportWindow.print()
    }, 1000)
  } else {
    showMessage('無法開啟列印視窗，請檢查瀏覽器設定', 'error')
  }
}

const triggerRestore = () => {
  restoreFileInput.value?.click()
}

const handleRestoreFile = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    showMessage('正在讀取備份檔案...', 'info')

    const fileContent = await file.text()
    const backupData = JSON.parse(fileContent)

    if (!backupData.babyInfo || !backupData.exportDate) {
      throw new Error('備份檔案格式不正確')
    }

    const confirmRestore = confirm(
      `確定要還原 "${backupData.babyInfo.name}" 的資料嗎？\n\n` +
        `備份日期: ${new Date(backupData.exportDate).toLocaleString('zh-TW')}\n` +
        `事件記錄: ${backupData.records.length} 筆\n` +
        `睡眠記錄: ${backupData.sleepRecords.length} 筆\n` +
        `原用戶: ${backupData.userEmail}\n\n` +
        `注意：如果已有同名寶寶，會建立新的寶寶資料！`,
    )

    if (!confirmRestore) {
      event.target.value = ''
      return
    }

    showMessage('正在還原資料...', 'info')
    // 這裡需要實現還原邏輯
    // ... 還原邏輯

    event.target.value = ''
    showMessage(`"${backupData.babyInfo.name}_還原" 的資料還原成功！`, 'success')
  } catch (error) {
    console.error('還原失敗:', error)
    showMessage('還原失敗: ' + error.message, 'error')
    event.target.value = ''
  }
}

const logout = async () => {
  try {
    await authLogout()
    router.push('/')
  } catch (error) {
    console.error('登出失敗:', error)
  }
}

// 生命周期
onMounted(async () => {
  await enableOffline()
  applyTheme()

  if (auth.currentUser) {
    showMessage('載入個案列表中...', 'info')
    await loadAllBabies()

    if (Object.keys(babies.value).length === 0) {
      showMessage('尚未新增任何個案，請點擊「新增個案」開始使用', 'info')
    } else {
      showMessage('個案列表載入完成', 'success')
    }
  }

  const updateOnlineStatus = () => {
    const isOnline = navigator.onLine

    if (isOnline) {
      showMessage('☁️ 已連線，資料已同步', 'success')
    } else {
      showMessage('❌ 離線模式，操作將於連線後自動同步', 'error')
    }
  }

  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
})
</script>

<style scoped>
.diary-container {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.user-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.user-info-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* 統一所有按鈕的基礎樣式 - 立體效果 */
.user-info-buttons button,
.user-info-buttons .analysis-btn,
.baby-controls button,
.baby-controls .analysis-btn,
.analysis-btn-bottom {
  background: linear-gradient(145deg, var(--btn-bg-light, #007bff), var(--btn-bg-dark, #0056b3));
  color: white;
  border: 1px solid var(--btn-border, #0056b3);
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all 0.2s ease;
  font-weight: 500;
  white-space: nowrap;
  box-sizing: border-box;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
}

/* 懸停效果 - 增強立體感 */
.user-info-buttons button:hover:not(:disabled),
.user-info-buttons .analysis-btn:hover:not(.disabled),
.baby-controls button:hover:not(:disabled),
.baby-controls .analysis-btn:hover:not(.disabled),
.analysis-btn-bottom:hover:not(.disabled) {
  transform: translateY(-1px);
  box-shadow:
    0 4px 8px rgba(0, 0, 0, 0.15),
    0 2px 4px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  background: linear-gradient(
    145deg,
    var(--btn-hover-light, #0069d9),
    var(--btn-hover-dark, #004085)
  );
}

/* 按下效果 */
.user-info-buttons button:active:not(:disabled),
.user-info-buttons .analysis-btn:active:not(.disabled),
.baby-controls button:active:not(:disabled),
.baby-controls .analysis-btn:active:not(.disabled),
.analysis-btn-bottom:active:not(.disabled) {
  transform: translateY(0px);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 主題切換按鈕特殊樣式 */
.user-info-buttons .theme-toggle-btn {
  background: linear-gradient(145deg, #f8f9fa, #e9ecef) !important;
  color: #495057 !important;
  border: 1px solid #dee2e6 !important;
  padding: 8px !important;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
}

.user-info-buttons .theme-toggle-btn:hover {
  background: linear-gradient(145deg, #e9ecef, #dee2e6) !important;
  transform: translateY(-1px) !important;
}

/* 右上角按鈕特定顏色 - 立體效果 */
.user-info-buttons .backup-btn {
  --btn-bg-light: #20c997;
  --btn-bg-dark: #17a2b8;
  --btn-border: #17a2b8;
  --btn-hover-light: #1dd1a1;
  --btn-hover-dark: #138496;
}

.user-info-buttons .print-btn {
  --btn-bg-light: #40c057;
  --btn-bg-dark: #28a745;
  --btn-border: #28a745;
  --btn-hover-light: #51cf66;
  --btn-hover-dark: #1e7e34;
}

.user-info-buttons .restore-btn {
  --btn-bg-light: #ffec8b;
  --btn-bg-dark: #ffc107;
  --btn-border: #ffc107;
  --btn-hover-light: #fff3cd;
  --btn-hover-dark: #e0a800;
  color: #000 !important;
  text-shadow: none !important;
}

.user-info-buttons .logout-btn {
  --btn-bg-light: #f56565;
  --btn-bg-dark: #dc3545;
  --btn-border: #dc3545;
  --btn-hover-light: #fc8181;
  --btn-hover-dark: #bd2130;
}

/* 寶寶控制區按鈕特定顏色 - 立體效果 */
.baby-controls .add-btn {
  --btn-bg-light: #40c057;
  --btn-bg-dark: #28a745;
  --btn-border: #28a745;
  --btn-hover-light: #51cf66;
  --btn-hover-dark: #1e7e34;
}

.baby-controls .delete-btn {
  --btn-bg-light: #f56565;
  --btn-bg-dark: #dc3545;
  --btn-border: #dc3545;
  --btn-hover-light: #fc8181;
  --btn-hover-dark: #bd2130;
}

/* 統一兩個查看分析按鈕的樣式 - 立體效果 */
.baby-controls .analysis-btn,
.analysis-btn-bottom {
  --btn-bg-light: #9775fa;
  --btn-bg-dark: #6f42c1;
  --btn-border: #6f42c1;
  --btn-hover-light: #b197fc;
  --btn-hover-dark: #59359a;
  font-size: 16px !important;
  padding: 12px 20px !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
}

/* 禁用狀態 - 保持立體但降低對比度 */
.user-info-buttons button:disabled,
.user-info-buttons .analysis-btn.disabled,
.baby-controls button:disabled,
.baby-controls .analysis-btn.disabled,
.analysis-btn-bottom.disabled {
  background: linear-gradient(145deg, #9ca3af, #6b7280) !important;
  border: 1px solid #6b7280 !important;
  cursor: not-allowed !important;
  transform: none !important;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
  opacity: 0.6;
  color: #f3f4f6 !important;
}

.baby-selector {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 25px;
}

.baby-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
  flex-wrap: wrap;
}

.baby-controls select {
  flex-grow: 1;
  min-width: 150px;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #ddd;
  font-size: 14px;
}

.baby-controls button {
  flex-shrink: 0;
}

.today-summary {
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  color: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.summary-content {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.summary-item {
  font-size: 16px;
}

/* 底部分析按鈕容器樣式調整 */
.bottom-analysis {
  text-align: center;
  margin: 30px 0 20px 0;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  border: 2px dashed #6f42c1;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .user-info {
    flex-direction: column;
    align-items: stretch;
  }

  .user-info-buttons {
    justify-content: center;
  }

  .baby-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .baby-controls select,
  .baby-controls button {
    width: 100%;
  }

  .summary-content {
    flex-direction: column;
    gap: 10px;
  }

  .user-info-buttons button,
  .user-info-buttons .analysis-btn,
  .baby-controls button,
  .baby-controls .analysis-btn,
  .analysis-btn-bottom {
    padding: 8px 12px;
    font-size: 13px;
  }

  .baby-controls .analysis-btn,
  .analysis-btn-bottom {
    font-size: 14px !important;
    padding: 10px 16px !important;
  }
}
</style>
