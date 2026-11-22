<template>
  <!-- 顏色一律取自 tokens.css（淺色／深色跟隨系統），元件內不寫死色碼 -->
  <div class="diary-container">
    <AppPageHeader title="睡眠日誌">
      <template #actions>
        <AppMenu :items="menuItems" @select="onMenuSelect" />
      </template>
      <DiarySwitcher :baby-id="currentBabyId || ''" />
    </AppPageHeader>
    <input
      ref="restoreFileInput"
      type="file"
      accept=".json"
      class="file-input"
      tabindex="-1"
      aria-hidden="true"
      @change="handleRestoreFile"
    />

    <p class="local-note">{{ userInfoText }}</p>

    <StatusMessage v-if="statusMessage" :message="statusMessage" :type="statusType" />

    <!-- 個案選擇器 -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-mono">PATIENT</span>
        <div class="case-actions no-print">
          <button @click="showAddBabyDialog" :disabled="isLoading" class="pill-btn btn-primary">
            <AppIcon name="plus" />
            新增個案
          </button>
          <button
            @click="showDeleteBabyDialog"
            class="pill-btn btn-danger"
            :disabled="!currentBabyId || isLoading"
          >
            刪除
          </button>
          <router-link
            :to="`/analysis?babyId=${currentBabyId}`"
            class="pill-btn btn-outline"
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
        <AppIcon name="info" class="empty-hint-icon" />
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
        @toggle-exclude="handleToggleExclude"
        @exclude-range="handleExcludeRange"
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
      <div class="analysis-cta no-print">
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
      <a class="footer-brand" href="https://kidnsleep.com" target="_blank" rel="noopener"
        >by KidnSleep</a
      >
      <span class="footer-sep">·</span>
      <span>製作者：黃正憲醫師</span>
    </footer>

    <!-- Dialogs（各自的遮罩已標 .no-print） -->
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
import { ref, computed, onMounted } from 'vue'
import { useBabyManagement } from '@/composables/useBabyManagement'
import { useSleepTracking } from '@/composables/useSleepTracking'
import { useEventTracking } from '@/composables/useEventTracking'
import { useDiaryUtils } from '@/composables/useDiaryUtils'
import { useThemeMenu } from '@/composables/useThemeMenu'

import StatusMessage from '@/components/StatusMessage.vue'
import SleepTrackingPanel from '@/components/SleepTrackingPanel.vue'
import SleepRecordsTable from '@/components/SleepRecordsTable.vue'
import EventTrackingPanel from '@/components/EventTrackingPanel.vue'
import EventRecordsTable from '@/components/EventRecordsTable.vue'
import AddBabyDialog from '@/components/AddBabyDialog.vue'
import SleepRecordEditDialog from '@/components/SleepRecordEditDialog.vue'
import EventRecordEditDialog from '@/components/EventRecordEditDialog.vue'
import AppPageHeader from '@/components/ui/AppPageHeader.vue'
import AppMenu from '@/components/ui/AppMenu.vue'
import AppIcon from '@/components/ui/AppIcon.js'
import DiarySwitcher from '@/components/ui/DiarySwitcher.vue'

const {
  currentBabyId,
  currentBaby,
  babyList,
  sleepRecords,
  eventRecords,
  isLoading,
  loadAllBabies,
  selectBaby,
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

const { removeSleepRecord, setSleepRecordExcluded, setSleepRecordsExcludedInRange } =
  useSleepTracking()

const { formatDuration, generateBackupFilename } = useDiaryUtils()
const { themeMenuItems, handleThemeSelect } = useThemeMenu()

// 響應式數據
const statusMessage = ref('')
const statusType = ref('info')
const showAddBaby = ref(false)
const editingSleepRecord = ref(null)
const editingEventRecord = ref(null)
const restoreFileInput = ref(null)

const userInfoText = computed(() => '資料儲存於本機裝置，完全離線，無需帳號')

// 頁首「更多」選單：備份、列印、還原，再接外觀（跟隨系統／淺色／深色）
const menuItems = computed(() => [
  { id: 'backup', label: '備份', icon: 'download' },
  { id: 'print', label: '列印', icon: 'printer' },
  { id: 'restore', label: '還原', icon: 'upload' },
  ...themeMenuItems.value,
])
const onMenuSelect = (id) => {
  if (handleThemeSelect(id)) return
  if (id === 'backup') backupCurrentBaby()
  else if (id === 'print') showPrintReport()
  else if (id === 'restore') triggerRestore()
}

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
const handleToggleExclude = async ({ record, excluded }) => {
  try {
    const message = await setSleepRecordExcluded(currentBabyId.value, record, excluded, () =>
      reloadCurrentBabyRecords(),
    )
    showMessage(message, 'success')
  } catch (error) {
    showMessage('操作失敗: ' + error.message, 'error')
  }
}

const handleExcludeRange = async ({ startDate, endDate, excluded }) => {
  try {
    showMessage('處理中...', 'info')
    const message = await setSleepRecordsExcludedInRange(
      currentBabyId.value,
      sleepRecords.value,
      startDate,
      endDate,
      excluded,
      () => reloadCurrentBabyRecords(),
    )
    showMessage(message, 'success')
  } catch (error) {
    showMessage('操作失敗: ' + error.message, 'error')
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
.diary-container {
  width: 100%;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  padding-bottom: 60px;
}

/* 還原用的檔案選擇器：由選單「還原」觸發，畫面上不顯示 */
.file-input {
  display: none;
}

.local-note {
  max-width: 960px;
  margin: 0 auto;
  padding: var(--space-2) var(--space-5) 0;
  font-size: 0.75rem;
  color: var(--text-3);
}

/* ── Section card ────────────────────────────── */
.section-card {
  max-width: 960px;
  margin: var(--space-4) auto 0;
  padding: 0 var(--space-5);
}

.section-card > * {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-1);
  padding: var(--space-4);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: var(--space-3);
}

.section-mono {
  font-size: 10px;
  letter-spacing: 2px;
  color: var(--text-2);
  text-transform: uppercase;
}

.case-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* ── 按鈕：主要＝--primary、次要＝外框、刪除＝--danger ── */
.pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  min-height: var(--tap-min);
  border-radius: 100px;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.btn-primary {
  background: var(--primary);
  color: var(--on-primary);
  border: 1px solid var(--primary);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}

.btn-outline {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border-strong);
}

.btn-outline:hover {
  background: var(--surface-2);
}

.btn-danger {
  background: transparent;
  color: var(--danger);
  border: 1px solid var(--danger);
}

.btn-danger:hover:not(:disabled) {
  background: var(--danger-container);
}

.pill-btn:disabled,
.pill-btn.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* router-link 沒有 disabled 屬性，靠 pointer-events 擋點擊 */
.pill-btn.disabled {
  pointer-events: none;
}

.case-select {
  width: 100%;
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text);
  font: inherit;
  font-size: 16px;
  padding: 14px 16px;
  min-height: 52px;
  appearance: none;
  cursor: pointer;
}

.case-select:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.empty-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: var(--space-3);
  padding: 14px 16px;
  background: var(--surface-2);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-sm);
  font-size: 15px;
  color: var(--text-2);
  line-height: 1.5;
}

.empty-hint-icon {
  flex-shrink: 0;
  font-size: 20px;
}

/* ── Main content ────────────────────────────── */
.main-content {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 var(--space-5);
}

.section-label {
  font-size: 10px;
  letter-spacing: 2px;
  color: var(--text-3);
  text-transform: uppercase;
  padding: var(--space-5) 0 var(--space-2);
}

/* ── Summary grid ────────────────────────────── */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
  margin-bottom: var(--space-5);
}

.sum-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-1);
  padding: 14px 12px;
  text-align: center;
}

.sum-val {
  font-size: 22px;
  font-weight: 500;
  color: var(--text);
  letter-spacing: -0.5px;
  line-height: 1;
}

.sum-key {
  font-size: 13px;
  color: var(--text-3);
  margin-top: 6px;
  line-height: 1.3;
}

/* ── Analysis CTA：「下一步」導引用輔色 ─────────── */
.analysis-cta {
  margin-top: var(--space-6);
  text-align: center;
}

.analysis-cta-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--tap-min);
  padding: 14px 28px;
  background: var(--accent);
  color: var(--on-accent);
  border: none;
  border-radius: var(--radius-md);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.1s;
}

.analysis-cta-btn:hover {
  transform: translateY(-1px);
}

.analysis-cta-btn.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── Footer ──────────────────────────────────── */
.site-footer {
  max-width: 960px;
  margin: 40px auto 0;
  padding: 18px 20px;
  border-top: 1px solid var(--border);
  text-align: center;
  font-size: 12px;
  color: var(--text-2);
  letter-spacing: 0.4px;
}

.footer-sep {
  margin: 0 8px;
  color: var(--text-3);
}

.footer-brand {
  margin-left: 6px;
  color: var(--text-2);
  text-decoration: underline;
  text-decoration-color: var(--border-strong);
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  border-radius: 2px;
  transition:
    color 0.2s,
    text-decoration-color 0.2s;
}

.footer-brand:hover,
.footer-brand:focus-visible {
  color: var(--text);
  text-decoration-color: currentColor;
}

.footer-brand:focus-visible {
  outline-offset: 3px;
}

/* ── RWD ─────────────────────────────────────── */
@media (max-width: 600px) {
  .local-note,
  .main-content,
  .section-card {
    padding-left: 14px;
    padding-right: 14px;
  }
  .summary-grid {
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
  .pill-btn {
    padding: 10px 16px;
  }
  .case-actions {
    gap: 8px;
  }
  .analysis-cta-btn {
    width: 100%;
    padding: 16px;
    font-size: 15px;
  }
}

/* ── 列印：紙本只留個案、摘要與記錄表；底色靠 tokens.css 的淺色覆寫 ── */
@media print {
  .diary-container {
    min-height: 0;
    padding-bottom: 0;
  }

  .section-card > *,
  .sum-card {
    box-shadow: none;
  }
}
</style>
