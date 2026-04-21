<template>
  <!-- ⚠️ 改版說明：
    · 移除 toggleTheme / isDarkMode / themeIcon（全 App 統一深色，無需切換）
    · 移除 dark-mode.css 的 body class 邏輯（見 useDiaryUtils.js，可保留函式但不呼叫）
    · <template> 與 <script> 的業務邏輯完全保留，只換視覺層
  -->
  <div class="diary-container">
    <!-- 頂部導覽欄 -->
    <div class="top-bar">
      <div class="top-bar-inner">
        <div class="top-bar-left">
          <button @click="goToDashboard" class="nav-btn icon-btn" title="回主控台">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 12L12 3l9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <span class="top-bar-title">睡眠日誌</span>
        </div>

        <div class="top-bar-right">
          <button @click="backupCurrentBaby" class="nav-btn" title="備份">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            備份
          </button>
          <button @click="showPrintReport" class="nav-btn" title="列印">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              />
              <rect
                x="6"
                y="14"
                width="12"
                height="8"
                rx="1"
                stroke="currentColor"
                stroke-width="1.6"
              />
            </svg>
            列印
          </button>
          <button @click="triggerRestore" class="nav-btn">還原</button>
          <input
            ref="restoreFileInput"
            type="file"
            accept=".json"
            @change="handleRestoreFile"
            style="display: none"
          />
        </div>
      </div>

      <!-- 用戶資訊列 -->
      <div class="user-bar">{{ userInfoText }}</div>
    </div>

    <StatusMessage v-if="statusMessage" :message="statusMessage" :type="statusType" />

    <!-- 個案選擇器 -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-mono">PATIENT</span>
        <div class="case-actions">
          <button @click="showAddBabyDialog" :disabled="isLoading" class="pill-btn cyan">
            + 新增個案
          </button>
          <button
            @click="showDeleteBabyDialog"
            class="pill-btn danger"
            :disabled="!currentBabyId || isLoading"
          >
            刪除
          </button>
          <router-link
            :to="`/analysis?babyId=${currentBabyId}`"
            class="pill-btn"
            :class="{ disabled: !currentBabyId }"
          >
            查看分析 →
          </router-link>
        </div>
      </div>
      <select
        v-model="currentBabyId"
        @change="handleBabyChange"
        :disabled="isLoading"
        class="case-select"
      >
        <option value="">{{ isLoading ? '載入個案列表中...' : '請選擇個案...' }}</option>
        <option v-for="baby in babyList" :key="baby.id" :value="baby.id">
          {{ baby.displayName }}
        </option>
      </select>

      <!-- 無個案時的引導提示 -->
      <div v-if="!isLoading && babyList.length === 0" class="empty-hint">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="flex-shrink:0">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
          <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
        尚無個案，請點擊上方「+ 新增個案」按鈕建立第一位個案。
      </div>
    </div>

    <!-- 個案已選擇：主內容 -->
    <div v-if="currentBabyId" class="main-content">
      <!-- 今日摘要 -->
      <div class="section-label">TODAY'S SUMMARY</div>
      <div class="summary-grid">
        <div class="sum-card">
          <div class="sum-val">{{ formatDuration(todaySummary.totalSleepMinutes) }}</div>
          <div class="sum-key">總睡眠時間</div>
        </div>
        <div class="sum-card">
          <div class="sum-val">{{ todaySummary.sleepCount }}</div>
          <div class="sum-key">睡眠次數</div>
        </div>
        <div class="sum-card">
          <div class="sum-val">{{ todaySummary.feedCount }}</div>
          <div class="sum-key">餵奶次數</div>
        </div>
      </div>

      <!-- 睡眠追蹤 -->
      <SleepTrackingPanel
        :current-baby-id="currentBabyId"
        :sleep-records="sleepRecords"
        @update-records="reloadCurrentBabyRecords"
        @show-message="showMessage"
      />

      <!-- 睡眠記錄表 -->
      <SleepRecordsTable
        :records="sleepRecords"
        @edit-record="handleEditSleepRecord"
        @delete-record="handleDeleteSleepRecord"
      />

      <!-- 事件追蹤 -->
      <EventTrackingPanel
        :current-baby-id="currentBabyId"
        :event-records="eventRecords"
        @update-records="reloadCurrentBabyRecords"
        @show-message="showMessage"
      />

      <!-- 事件記錄表 -->
      <EventRecordsTable
        :records="filteredEventRecords"
        @edit-record="handleEditEventRecord"
        @delete-record="handleDeleteEventRecord"
        @filter-change="handleFilterChange"
      />

      <!-- 分析入口 -->
      <div class="analysis-cta">
        <router-link
          v-if="currentBabyId"
          :to="`/analysis?babyId=${currentBabyId}`"
          class="analysis-cta-btn"
        >
          查看詳細分析報告 →
        </router-link>
        <button v-else class="analysis-cta-btn disabled" disabled>
          查看詳細分析報告（請先選擇個案）
        </button>
      </div>
    </div>

    <!-- 頁尾 -->
    <footer class="site-footer">
      <span>睡眠日誌</span>
      <span class="footer-sep">·</span>
      <span>製作者：黃正憲醫師</span>
    </footer>

    <!-- Dialogs（保留原有） -->
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

<!-- ════════════════════════════════════════════════════
     SCRIPT：與原版完全相同，僅移除 dark mode 相關
     · 移除從 useDiaryUtils 解構的: toggleTheme, isDarkMode, themeIcon
     · 移除 return 中的同名項目
     · 若 useDiaryUtils 仍 export 這些，保留即可，只是不再用於 template
     ════════════════════════════════════════════════════ -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBabyManagement } from '@/composables/useBabyManagement'
import { useSleepTracking } from '@/composables/useSleepTracking'
import { useEventTracking } from '@/composables/useEventTracking'
import { useDiaryUtils } from '@/composables/useDiaryUtils'

import StatusMessage from '@/components/StatusMessage.vue'
import SleepTrackingPanel from '@/components/SleepTrackingPanel.vue'
import SleepRecordsTable from '@/components/SleepRecordsTable.vue'
import EventTrackingPanel from '@/components/EventTrackingPanel.vue'
import EventRecordsTable from '@/components/EventRecordsTable.vue'
import AddBabyDialog from '@/components/AddBabyDialog.vue'
import SleepRecordEditDialog from '@/components/SleepRecordEditDialog.vue'
import EventRecordEditDialog from '@/components/EventRecordEditDialog.vue'

const router = useRouter()

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
  importBabyData,
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
  // toggleTheme,   ← 移除：全 App 統一深色，不再需要
  // applyTheme,    ← 移除
  // isDarkMode,    ← 移除
  // themeIcon,     ← 移除
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

const userInfoText = computed(() => '資料儲存於本機裝置，完全離線，無需帳號')

const todaySummary = computed(() => calculateTodaySummary(eventRecords.value, sleepRecords.value))

const filteredEventRecords = computed(() =>
  filterEventRecords(eventRecords.value, currentFilter.value),
)

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
    showMessage(`已選擇個案: ${currentBaby.value?.name}`, 'success')
  }
}

const showAddBabyDialog = () => {
  showAddBaby.value = true
}

const handleBabyAdded = async (babyData) => {
  showAddBaby.value = false
  await loadAllBabies()
  showMessage(`個案「${babyData.name}」已新增成功！請從下方下拉選單選擇此個案開始記錄。`, 'success')
}

const showDeleteBabyDialog = async () => {
  if (!currentBabyId.value || !currentBaby.value) return
  const babyName = currentBaby.value.name
  const confirmed = confirm(
    `確定要刪除個案「${babyName}」嗎？\n\n此操作將永久刪除所有記錄，且無法復原！`,
  )
  if (confirmed) {
    try {
      showMessage(`正在刪除「${babyName}」的所有資料...`, 'info')
      await removeBaby(currentBabyId.value)
      showMessage(`個案「${babyName}」已成功刪除`, 'success')
    } catch (error) {
      showMessage('刪除個案失敗: ' + error.message, 'error')
    }
  }
}

const goToDashboard = () => router.push('/diary')

const handleEditSleepRecord = (record) => {
  editingSleepRecord.value = record
}
const handleDeleteSleepRecord = async (record) => {
  if (!confirm('確定要永久刪除這筆睡眠記錄嗎？此操作無法復原。')) return
  try {
    showMessage('刪除中...', 'info')
    await removeSleepRecord(currentBabyId.value, record.id, () => reloadCurrentBabyRecords())
    showMessage('睡眠記錄已成功刪除！', 'success')
  } catch (error) {
    showMessage('刪除失敗: ' + error.message, 'error')
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
  if (!confirm('確定要刪除這筆事件記錄嗎？')) return
  try {
    showMessage('正在刪除事件...', 'info')
    await removeEventRecord(currentBabyId.value, record.id, () => reloadCurrentBabyRecords())
    showMessage('事件記錄已成功刪除', 'success')
  } catch (error) {
    showMessage('刪除失敗: ' + error.message, 'error')
  }
}
const handleEventRecordUpdated = async () => {
  editingEventRecord.value = null
  await reloadCurrentBabyRecords()
  showMessage('事件記錄已更新成功！', 'success')
}
const handleFilterChange = (filterDate) => setFilterDate(filterDate)

// ── 備份 / 還原 ───────────────────────────────────────
const backupCurrentBaby = async () => {
  if (!currentBabyId.value) {
    showMessage('請先選擇個案', 'error')
    return
  }
  try {
    showMessage('正在備份資料...', 'info')
    const babyInfo = currentBaby.value
    const backupData = {
      exportDate: new Date().toISOString(),
      appVersion: 'local-v1',
      babyInfo,
      babyId: currentBabyId.value,
      records: eventRecords.value,
      sleepRecords: sleepRecords.value,
    }
    const filename = generateBackupFilename(babyInfo.name)
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
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
    showMessage('備份失敗: ' + error.message, 'error')
  }
}

const showPrintReport = () => {
  if (!currentBabyId.value) {
    showMessage('請先選擇一個個案來產生報告。', 'error')
    return
  }
  window.print()
}

const triggerRestore = () => restoreFileInput.value?.click()
const handleRestoreFile = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  // 清空 input 讓同一檔案可再次觸發
  event.target.value = ''

  try {
    showMessage('正在解析備份檔案...', 'info')
    const text = await file.text()
    const backupData = JSON.parse(text)

    if (!backupData.babyId || !backupData.babyInfo) {
      showMessage('備份格式錯誤，無法匯入', 'error')
      return
    }

    const babyName = backupData.babyInfo.name || '未知個案'
    const sleepCount = (backupData.sleepRecords || []).length
    const eventCount = (backupData.records || []).length

    const confirmed = confirm(
      `即將匯入個案「${babyName}」\n` +
      `睡眠記錄：${sleepCount} 筆\n` +
      `事件記錄：${eventCount} 筆\n\n` +
      `若該個案 ID 已存在，現有記錄將被覆蓋。確定繼續？`,
    )
    if (!confirmed) return

    showMessage('匯入中，請稍候...', 'info')
    const importedBabyId = await importBabyData(backupData)
    await loadAllBabies()

    // 自動切換到匯入的個案
    currentBabyId.value = importedBabyId
    await selectBaby(importedBabyId)
    showMessage(`個案「${babyName}」匯入成功！`, 'success')
  } catch (error) {
    showMessage('匯入失敗: ' + error.message, 'error')
  }
}

onMounted(async () => {
  await loadAllBabies()
})
</script>

<style scoped>
/* ── Design tokens ──────────────────────────────── */
.diary-container {
  min-height: 100vh;
  background: #0a1020;
  background-image: radial-gradient(ellipse at 70% 0%, rgba(212, 179, 106, 0.05), transparent 50%);
  color: #f1ede0;
  font-family: -apple-system, 'PingFang TC', 'Helvetica Neue', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  padding-bottom: 60px;
}

/* ── Top bar ──────────────────────────────────── */
.top-bar {
  background: rgba(10, 16, 32, 0.9);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  border-bottom: 1px solid rgba(241, 237, 224, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
}

.top-bar-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.top-bar-title {
  font-size: 15px;
  font-weight: 600;
  color: #f1ede0;
  letter-spacing: -0.2px;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 14px;
  min-height: 40px;
  background: rgba(241, 237, 224, 0.05);
  color: rgba(241, 237, 224, 0.6);
  border: 1px solid rgba(241, 237, 224, 0.1);
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  transition:
    background 0.2s,
    color 0.2s;
  white-space: nowrap;
}

.nav-btn:hover {
  background: rgba(241, 237, 224, 0.1);
  color: #f1ede0;
}
.nav-btn.icon-btn {
  padding: 8px 12px;
}
.nav-btn.logout {
  color: rgba(212, 179, 106, 0.7);
  border-color: rgba(212, 179, 106, 0.15);
}
.nav-btn.logout:hover {
  background: rgba(212, 179, 106, 0.1);
  color: #d4b36a;
}

.user-bar {
  max-width: 960px;
  margin: 0 auto;
  padding: 5px 20px 8px;
  font-size: 11px;
  color: rgba(241, 237, 224, 0.3);
  font-family: 'SF Mono', Menlo, monospace;
  letter-spacing: 0.3px;
  border-top: 1px solid rgba(241, 237, 224, 0.04);
}

/* ── Section card ────────────────────────────── */
.section-card {
  max-width: 960px;
  margin: 20px auto 0;
  padding: 0 20px;
}

.section-card > * {
  background: #131b33;
  border: 1px solid rgba(241, 237, 224, 0.08);
  border-radius: 16px;
  padding: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.section-mono {
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 10px;
  letter-spacing: 2px;
  color: #9fd4d4;
  text-transform: uppercase;
}

.case-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.pill-btn {
  padding: 9px 18px;
  min-height: 44px;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: opacity 0.2s;
  background: rgba(241, 237, 224, 0.06);
  color: rgba(241, 237, 224, 0.6);
  border: 1px solid rgba(241, 237, 224, 0.1);
}

.pill-btn.cyan {
  background: rgba(159, 212, 212, 0.1);
  color: #9fd4d4;
  border-color: rgba(159, 212, 212, 0.2);
}

.pill-btn.danger {
  background: rgba(212, 88, 88, 0.08);
  color: rgba(220, 120, 120, 0.8);
  border-color: rgba(212, 88, 88, 0.15);
}

.pill-btn:disabled,
.pill-btn.disabled {
  opacity: 0.35;
  cursor: not-allowed;
  pointer-events: none;
}

.case-select {
  width: 100%;
  background: #1a2340;
  border: 1px solid rgba(241, 237, 224, 0.1);
  border-radius: 10px;
  color: #f1ede0;
  font-size: 16px;
  padding: 14px 16px;
  min-height: 52px;
  font-family: inherit;
  appearance: none;
  cursor: pointer;
}

.case-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding: 14px 16px;
  background: rgba(159, 212, 212, 0.06);
  border: 1px dashed rgba(159, 212, 212, 0.25);
  border-radius: 10px;
  font-size: 15px;
  color: rgba(159, 212, 212, 0.75);
  line-height: 1.5;
}

/* ── Main content ────────────────────────────── */
.main-content {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 20px;
}

/* ── Section label ───────────────────────────── */
.section-label {
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 10px;
  letter-spacing: 2px;
  color: rgba(241, 237, 224, 0.35);
  text-transform: uppercase;
  padding: 20px 0 8px;
}

/* ── Summary grid ────────────────────────────── */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.sum-card {
  background: #131b33;
  border: 1px solid rgba(241, 237, 224, 0.08);
  border-radius: 14px;
  padding: 14px 12px;
  text-align: center;
}

.sum-val {
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 22px;
  font-weight: 500;
  color: #f1ede0;
  letter-spacing: -0.5px;
  line-height: 1;
}

.sum-key {
  font-size: 13px;
  color: rgba(241, 237, 224, 0.4);
  margin-top: 6px;
  line-height: 1.3;
}

/* ── Analysis CTA ────────────────────────────── */
.analysis-cta {
  margin-top: 24px;
  text-align: center;
}

.analysis-cta-btn {
  display: inline-block;
  padding: 14px 28px;
  background: rgba(159, 212, 212, 0.08);
  color: #9fd4d4;
  border: 1px solid rgba(159, 212, 212, 0.2);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  text-decoration: none;
  cursor: pointer;
  transition:
    background 0.2s,
    transform 0.1s;
}

.analysis-cta-btn:hover {
  background: rgba(159, 212, 212, 0.14);
  transform: translateY(-1px);
}
.analysis-cta-btn.disabled {
  opacity: 0.35;
  pointer-events: none;
}

/* ── Footer ──────────────────────────────────── */
.site-footer {
  max-width: 960px;
  margin: 40px auto 0;
  padding: 18px 20px;
  border-top: 1px solid rgba(241, 237, 224, 0.06);
  text-align: center;
  font-size: 12px;
  color: rgba(241, 237, 224, 0.25);
  font-family: 'SF Mono', Menlo, monospace;
  letter-spacing: 0.4px;
}

.footer-sep {
  margin: 0 8px;
  opacity: 0.4;
}

/* ── 子元件樣式覆蓋（全域，影響 scoped child components）── */
/* 這些是讓子元件（SleepTrackingPanel 等）在深色背景上正常顯示的最低限度 override。
   若子元件有自己的深色模式支援，可移除相應規則。 */
:deep(.sleep-controls),
:deep(.records-container),
:deep(.event-form),
:deep(.manual-sleep-form),
:deep(.manual-event-form),
:deep(.baby-selector),
:deep(.today-summary) {
  background: #131b33 !important;
  color: #f1ede0 !important;
  border-color: rgba(241, 237, 224, 0.08) !important;
  border-radius: 16px;
}

:deep(h2),
:deep(h3) {
  color: #f1ede0 !important;
}

:deep(p),
:deep(label),
:deep(span) {
  color: rgba(241, 237, 224, 0.7);
}

:deep(select),
:deep(input[type='text']),
:deep(input[type='time']),
:deep(input[type='date']),
:deep(textarea) {
  background: #1a2340 !important;
  color: #f1ede0 !important;
  border: 1px solid rgba(241, 237, 224, 0.1) !important;
  border-radius: 8px;
  font-size: 16px !important;
  min-height: 44px;
}

:deep(table) {
  background: transparent !important;
  color: #f1ede0 !important;
}

:deep(table th) {
  background: rgba(241, 237, 224, 0.05) !important;
  color: rgba(241, 237, 224, 0.6) !important;
  border-color: rgba(241, 237, 224, 0.08) !important;
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 11px;
  letter-spacing: 1px;
}

:deep(table td) {
  border-color: rgba(241, 237, 224, 0.06) !important;
  color: rgba(241, 237, 224, 0.8) !important;
}

:deep(table tr:hover td) {
  background: rgba(241, 237, 224, 0.03) !important;
}

:deep(button:not(.pill-btn):not(.nav-btn)) {
  background: rgba(159, 212, 212, 0.08) !important;
  color: #9fd4d4 !important;
  border: 1px solid rgba(159, 212, 212, 0.15) !important;
  border-radius: 8px;
  font-size: 15px !important;
  min-height: 44px;
  padding: 10px 18px !important;
}

:deep(.delete-btn),
:deep([class*='delete']) {
  background: rgba(212, 88, 88, 0.08) !important;
  color: rgba(220, 120, 120, 0.8) !important;
  border-color: rgba(212, 88, 88, 0.15) !important;
}

:deep(.sleep-status.sleeping) {
  background: rgba(159, 212, 212, 0.1) !important;
  color: #9fd4d4 !important;
  border-color: rgba(159, 212, 212, 0.2) !important;
}

:deep(.sleep-status.awake) {
  background: rgba(212, 179, 106, 0.1) !important;
  color: #d4b36a !important;
  border-color: rgba(212, 179, 106, 0.2) !important;
}

/* ── RWD ─────────────────────────────────────── */
@media (max-width: 600px) {
  .top-bar-inner {
    padding: 10px 14px;
  }
  .main-content,
  .section-card {
    padding: 0 14px;
  }
  .summary-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .sum-card {
    padding: 12px 8px;
  }
  .sum-val {
    font-size: 18px;
  }
  .sum-key {
    font-size: 12px;
  }
  .top-bar-right {
    gap: 6px;
  }
  .nav-btn {
    padding: 8px 12px;
    font-size: 13px;
  }
  .pill-btn {
    padding: 10px 16px;
    font-size: 14px;
  }
  .case-actions {
    gap: 8px;
  }
  .analysis-cta-btn {
    width: 100%;
    padding: 16px;
    font-size: 15px;
    box-sizing: border-box;
  }
}
</style>
