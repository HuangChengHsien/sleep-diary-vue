<template>
  <div class="records-container">
    <h2><AppIcon name="bed" class="title-icon" />睡眠記錄</h2>

    <!-- 篩選控制 -->
    <div class="filter-controls no-print">
      <label>查看記錄範圍: </label>
      <button
        @click="setFilter('7days')"
        :class="['filter-btn', 'btn-small', { active: currentFilter === '7days' }]"
        :aria-pressed="currentFilter === '7days'"
      >
        7天內
      </button>
      <button
        @click="setFilter('14days')"
        :class="['filter-btn', 'btn-small', { active: currentFilter === '14days' }]"
        :aria-pressed="currentFilter === '14days'"
      >
        14天內
      </button>
      <button
        @click="setFilter('all')"
        :class="['filter-btn', 'btn-small', { active: currentFilter === 'all' }]"
        :aria-pressed="currentFilter === 'all'"
      >
        全部
      </button>
    </div>

    <!-- 生病、旅行等不具代表性的期間：整段排除於分析之外 -->
    <div class="exclude-range" :class="{ 'no-print': excludedPeriodList.length === 0 }">
      <span class="exclude-range-label">不列入分析的期間</span>
      <div class="exclude-range-controls no-print">
        <input type="date" v-model="excludeStart" aria-label="排除起始日期" />
        <span class="exclude-range-sep">～</span>
        <input type="date" v-model="excludeEnd" aria-label="排除結束日期" />
        <button @click="applyRange(true)" class="exclude-btn btn-small" :disabled="!rangeReady">
          排除
        </button>
        <button @click="applyRange(false)" class="restore-btn btn-small" :disabled="!rangeReady">
          恢復
        </button>
      </div>
      <span v-if="rangeReady" class="exclude-range-hint no-print">
        將影響 {{ recordsInSelectedRange }} 筆記錄
      </span>

      <!-- 排除是逐筆存的，這裡把它反推成期間，否則排掉幾段之後就認不出來也無法單獨恢復 -->
      <div v-if="excludedPeriodList.length > 0" class="excluded-periods">
        <span class="excluded-periods-label">目前排除中：</span>
        <span
          v-for="period in excludedPeriodList"
          :key="period.startDate"
          class="excluded-period print-exact"
        >
          {{ formatPeriodLabel(period) }}
          <small>{{ period.recordCount }} 筆</small>
          <button
            @click="restorePeriod(period)"
            class="restore-period-btn no-print"
            :title="`恢復 ${period.startDate} ~ ${period.endDate}`"
            :aria-label="`恢復 ${period.startDate} ~ ${period.endDate}`"
          >
            ✕
          </button>
        </span>
      </div>
    </div>

    <div class="table-container">
      <!-- 修正：正確使用響應式包裝器 -->
      <div class="table-responsive-wrapper">
        <table>
          <thead>
            <tr>
              <th class="col-date">日期</th>
              <th class="col-time">上床時間</th>
              <th class="col-time">入睡時間</th>
              <th class="col-time">起床時間</th>
              <th class="col-duration hide-mobile">入睡所需時間</th>
              <th class="col-duration">總睡眠時間</th>
              <th class="col-count hide-mobile">夜間醒來次數</th>
              <th class="col-notes hide-mobile">備註</th>
              <th class="col-analysis hide-mobile">列入分析</th>
              <th class="col-actions no-print">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="formattedRecords.length === 0">
              <td colspan="10" class="no-data">
                {{ getNoDataMessage() }}
              </td>
            </tr>
            <tr
              v-for="record in formattedRecords"
              :key="record.id"
              :class="{ excluded: record.isExcluded }"
            >
              <td class="col-date">{{ record.date }}</td>
              <td class="col-time">{{ record.bedtime }}</td>
              <td class="col-time">{{ record.sleepTime }}</td>
              <td class="col-time">{{ record.wakeTime }}</td>
              <td class="col-duration hide-mobile">{{ record.fallAsleepDuration }}</td>
              <td class="col-duration">{{ record.totalSleep }}</td>
              <td class="col-count hide-mobile">{{ record.wakeCount }}次</td>
              <td class="col-notes hide-mobile">{{ record.notes }}</td>
              <td class="col-analysis hide-mobile">
                <button
                  @click="handleToggleExclude(record)"
                  class="toggle-exclude-btn btn-small"
                  :class="{ off: record.isExcluded }"
                  :disabled="!record.id"
                  :title="record.isExcluded ? '目前不列入分析，點擊恢復' : '點擊排除於分析之外'"
                >
                  {{ record.isExcluded ? '已排除' : '計入' }}
                </button>
              </td>
              <td class="col-actions no-print">
                <button
                  @click="handleEdit(record)"
                  class="edit-btn btn-small"
                  :disabled="!record.id"
                >
                  編輯
                </button>
                <button
                  @click="handleDelete(record)"
                  class="delete-btn btn-small"
                  :disabled="!record.id"
                >
                  刪除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="formattedRecords.length > 0" class="record-count">
      顯示 {{ formattedRecords.length }} 筆記錄
      <span v-if="currentFilter !== 'all'" class="filter-info">
        ({{ getFilterDescription() }})
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSleepTracking } from '@/composables/useSleepTracking'
import AppIcon from '@/components/ui/AppIcon.js'
import {
  isExcludedFromAnalysis,
  recordsInDateRange,
  excludedPeriods,
  formatPeriodLabel,
} from '@/lib/record-exclusion'

const props = defineProps({
  records: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits([
  'edit-record',
  'delete-record',
  'filter-change',
  'toggle-exclude',
  'exclude-range',
])

const { formatSleepRecordForDisplay } = useSleepTracking()

// 篩選狀態
const currentFilter = ref('7days')

// 篩選邏輯
const filterRecords = (records, filter) => {
  if (filter === 'all') {
    return records
  }

  const now = new Date()
  const days = filter === '7days' ? 7 : 14
  const filterDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  return records.filter((record) => {
    // 假設 record 有 date 欄位或可以從其他欄位推算日期
    let recordDate

    if (record.date) {
      recordDate = new Date(record.date)
    } else if (record.bedtime) {
      // 如果沒有 date 但有 bedtime，嘗試從 bedtime 解析日期
      recordDate = new Date(record.bedtime)
    } else if (record.timestamp) {
      recordDate = new Date(record.timestamp)
    } else {
      return true // 如果無法確定日期，就顯示
    }

    return recordDate >= filterDate
  })
}

const formattedRecords = computed(() => {
  const filteredRecords = filterRecords(props.records, currentFilter.value)
  return filteredRecords
    .map((record) => ({
      ...formatSleepRecordForDisplay(record),
      isExcluded: isExcludedFromAnalysis(record),
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date)) // 最新的在前
})

// 區間排除
const excludeStart = ref('')
const excludeEnd = ref('')

const rangeReady = computed(() => Boolean(excludeStart.value && excludeEnd.value))

const recordsInSelectedRange = computed(() =>
  rangeReady.value
    ? recordsInDateRange(props.records, excludeStart.value, excludeEnd.value).length
    : 0,
)

const excludedPeriodList = computed(() => excludedPeriods(props.records))

const restorePeriod = (period) => {
  emit('exclude-range', {
    startDate: period.startDate,
    endDate: period.endDate,
    excluded: false,
  })
}

const applyRange = (excluded) => {
  if (!rangeReady.value) return
  emit('exclude-range', {
    startDate: excludeStart.value,
    endDate: excludeEnd.value,
    excluded,
  })
}

const handleToggleExclude = (record) => {
  const original = record.originalRecord ?? props.records.find((r) => r.id === record.id)
  if (original) emit('toggle-exclude', { record: original, excluded: !record.isExcluded })
}

// 方法
const setFilter = (filter) => {
  currentFilter.value = filter
  emit('filter-change', filter)
}

const getNoDataMessage = () => {
  switch (currentFilter.value) {
    case '7days':
      return '最近7天內暫無睡眠記錄'
    case '14days':
      return '最近14天內暫無睡眠記錄'
    default:
      return '暫無睡眠記錄，請開始記錄睡眠時間'
  }
}

const getFilterDescription = () => {
  switch (currentFilter.value) {
    case '7days':
      return '最近7天'
    case '14days':
      return '最近14天'
    default:
      return '全部記錄'
  }
}

const handleEdit = (record) => {
  const originalRecord = record.originalRecord ?? props.records.find((r) => r.id === record.id)
  if (originalRecord) emit('edit-record', originalRecord)
}

const handleDelete = (record) => {
  const originalRecord = record.originalRecord ?? props.records.find((r) => r.id === record.id)
  if (originalRecord) emit('delete-record', originalRecord)
}

// 初始化
onMounted(() => {
  // 預設顯示7天內的記錄
  emit('filter-change', '7days')
})
</script>

<style scoped>
/* ── Container ────────────────────────────────────── */
.records-container {
  max-width: 100%;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-1);
  padding: var(--space-5);
  margin-bottom: var(--space-5);
  box-sizing: border-box;
  color: var(--text);
}

.records-container h2 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text);
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
  margin-top: 0;
  margin-bottom: var(--space-5);
  font-size: 18px;
  font-weight: 600;
}

.title-icon {
  color: var(--primary);
}

/* ── Filter controls ──────────────────────────────── */
.filter-controls {
  background: var(--surface-2);
  border: 1px solid var(--border);
  padding: 12px 16px;
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-controls label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
  white-space: nowrap;
}

/* 在 --surface-2 底上：hover 改邊框，不再疊同色底 */
.filter-btn {
  background: transparent;
  color: var(--text-2);
  border: 1px solid var(--border);
  border-radius: 100px;
}

.filter-btn:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.filter-btn.active {
  background: var(--primary-container);
  border-color: var(--primary);
  color: var(--on-primary-container);
  font-weight: 600;
}

/* ── Table ────────────────────────────────────────── */
.table-container {
  width: 100%;
  max-width: 100%;
  margin: 4px 0 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  overflow: hidden;
  box-sizing: border-box;
}

.table-responsive-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: var(--surface);
  min-width: 700px;
  box-sizing: border-box;
}

table th {
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.5px;
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

table td {
  padding: 10px 12px;
  font-size: 13px;
  color: var(--text);
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
  word-wrap: break-word;
  word-break: break-word;
}

table tr:last-child td { border-bottom: none; }

table tr:hover td {
  background: var(--surface-2);
}

/* ── 區間排除 ─────────────────────────────────────── */
.exclude-range {
  display: flex; align-items: center; gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  padding: 10px 14px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.exclude-range-label {
  font-size: 12px; color: var(--text-2);
}

.exclude-range-controls {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
}

.exclude-range-controls input[type='date'] {
  background: var(--surface-2);
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  min-height: var(--tap-min);
  font: inherit;
  font-size: 16px;
}

.exclude-range-sep { color: var(--text-3); font-size: 12px; }

.excluded-periods {
  display: flex; align-items: center; gap: 6px;
  flex-wrap: wrap;
  width: 100%;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.excluded-periods-label {
  font-size: 11px; color: var(--text-3);
}

/* 已排除期間：中性標記（不是警告），虛線邊框 */
.excluded-period {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 4px 3px 10px;
  border-radius: 100px;
  background: var(--surface-2);
  border: 1px dashed var(--border-strong);
  color: var(--text-2);
  font-size: 12px;
}

.excluded-period small {
  color: var(--text-3);
  font-size: 10px;
}

.restore-period-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px;
  padding: 0; margin: 0;
  border: none; border-radius: 50%;
  background: transparent;
  color: var(--text-2);
  font-size: 11px; line-height: 1; cursor: pointer;
  font-family: inherit;
}

.restore-period-btn:hover {
  background: var(--surface);
  color: var(--text);
}

.exclude-range-hint {
  font-size: 11px; color: var(--text-3);
}

/* 排除／恢復都不是破壞性操作：外框按鈕；在 --surface-2 底上 hover 改用 --surface 底 */
.exclude-btn,
.restore-btn {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border-strong);
}

.exclude-btn:hover:not(:disabled),
.restore-btn:hover:not(:disabled) { background: var(--surface); }

/* 被排除的列：淡化但仍可讀，必須看得到才能恢復 */
table tr.excluded td {
  opacity: 0.45;
  text-decoration: line-through;
  text-decoration-color: var(--text-3);
}

table tr.excluded td.col-analysis,
table tr.excluded td.col-actions {
  opacity: 1;
  text-decoration: none;
}

.toggle-exclude-btn {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border-strong);
  min-width: 52px;
}

.toggle-exclude-btn:hover:not(:disabled) { background: var(--surface-2); }

/* 已排除：與「已排除期間」同一套中性標記 */
.toggle-exclude-btn.off {
  background: var(--surface-2);
  color: var(--text-2);
  border-style: dashed;
}

.toggle-exclude-btn.off:hover:not(:disabled) { color: var(--text); }

/* ── Column widths ────────────────────────────────── */
.col-analysis { width: 9%; }
.col-date     { width: 12%; }
.col-time     { width: 10%; }
.col-duration { width: 12%; }
.col-count    { width: 8%;  }
.col-notes    { width: 20%; max-width: 150px; white-space: normal; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; }
.col-actions  { width: 12%; }

/* ── States ───────────────────────────────────────── */
.no-data {
  text-align: center;
  color: var(--text-3);
  font-style: italic;
  padding: 40px 20px;
}

/* ── Buttons ──────────────────────────────────────── */
.btn-small {
  min-height: var(--tap-min);
  padding: 6px 12px;
  font-size: 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  margin: 2px;
  font-family: inherit;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.btn-small:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* 編輯＝次要操作（外框） */
.edit-btn {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border-strong);
}

.edit-btn:hover:not(:disabled) { background: var(--surface-2); }

/* 刪除＝破壞性操作，唯一用紅色的地方 */
.delete-btn {
  background: transparent;
  color: var(--danger);
  border: 1px solid var(--danger);
}

.delete-btn:hover:not(:disabled) { background: var(--danger-container); }

/* ── Footer ───────────────────────────────────────── */
.record-count {
  text-align: center;
  color: var(--text-3);
  font-size: 12px;
  margin-top: 10px;
}

.filter-info {
  color: var(--text-2);
  font-weight: 500;
}

/* ── RWD ──────────────────────────────────────────── */
@media (max-width: 768px) {
  /* 表格內的按鈕在窄螢幕縮小（仍 ≥ 36px，高於 WCAG 2.5.8 的 24px），避免每列被撐得很高 */
  .btn-small { min-height: 36px; padding: 4px 10px; font-size: 13px; }
  .records-container { padding: 14px; }
  .filter-controls { flex-direction: column; align-items: flex-start; gap: 8px; }
  table { min-width: 500px; }
  table th, table td { padding: 8px 8px; font-size: 11px; }
  .hide-mobile { display: none; }
}

@media (max-width: 480px) {
  .records-container { padding: 10px; }
  table { min-width: 400px; }
  table th, table td { padding: 6px 6px; font-size: 10px; }
  .col-date { width: 15%; min-width: 60px; }
}

/* ── 列印：整張表攤開印（不捲動、不截斷），操作欄已用 .no-print 藏起來 ── */
@media print {
  .records-container,
  .table-container,
  .table-responsive-wrapper {
    overflow: visible;
    box-shadow: none;
  }

  table { min-width: 0; }

  table th { position: static; }

  .hide-mobile { display: table-cell; }

  .toggle-exclude-btn,
  .toggle-exclude-btn.off {
    min-height: 0;
    padding: 0;
    border: none;
    background: none;
  }
}
</style>
