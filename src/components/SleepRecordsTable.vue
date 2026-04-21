<template>
  <div class="records-container">
    <h2>🛏️ 睡眠記錄</h2>

    <!-- 篩選控制 -->
    <div class="filter-controls">
      <label>查看記錄範圍: </label>
      <button
        @click="setFilter('7days')"
        :class="['filter-btn', 'btn-small', { active: currentFilter === '7days' }]"
      >
        7天內
      </button>
      <button
        @click="setFilter('14days')"
        :class="['filter-btn', 'btn-small', { active: currentFilter === '14days' }]"
      >
        14天內
      </button>
      <button
        @click="setFilter('all')"
        :class="['filter-btn', 'btn-small', { active: currentFilter === 'all' }]"
      >
        全部
      </button>
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
              <th class="col-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="formattedRecords.length === 0">
              <td colspan="9" class="no-data">
                {{ getNoDataMessage() }}
              </td>
            </tr>
            <tr v-for="record in formattedRecords" :key="record.id">
              <td class="col-date">{{ record.date }}</td>
              <td class="col-time">{{ record.bedtime }}</td>
              <td class="col-time">{{ record.sleepTime }}</td>
              <td class="col-time">{{ record.wakeTime }}</td>
              <td class="col-duration hide-mobile">{{ record.fallAsleepDuration }}</td>
              <td class="col-duration">{{ record.totalSleep }}</td>
              <td class="col-count hide-mobile">{{ record.wakeCount }}次</td>
              <td class="col-notes hide-mobile">{{ record.notes }}</td>
              <td class="col-actions">
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

const props = defineProps({
  records: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['edit-record', 'delete-record', 'filter-change'])

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
    .map((record) => formatSleepRecordForDisplay(record))
    .sort((a, b) => new Date(b.date) - new Date(a.date)) // 最新的在前
})

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
  background: #131B33;
  border: 1px solid rgba(241,237,224,0.08);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 20px;
  box-sizing: border-box;
  font-family: -apple-system, 'PingFang TC', 'Helvetica Neue', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.records-container h2 {
  color: #F1EDE0;
  border-bottom: 2px solid rgba(159,212,212,0.4);
  padding-bottom: 10px;
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: 600;
}

/* ── Filter controls ──────────────────────────────── */
.filter-controls {
  background: rgba(241,237,224,0.04);
  border: 1px solid rgba(241,237,224,0.08);
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-controls label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(241,237,224,0.7);
  white-space: nowrap;
}

.filter-btn {
  background: transparent;
  color: rgba(241,237,224,0.45);
  border: 1px solid rgba(241,237,224,0.1);
  border-radius: 100px;
  transition: all 0.15s;
}

.filter-btn:hover {
  background: rgba(241,237,224,0.05);
  color: rgba(241,237,224,0.7);
}

.filter-btn.active {
  background: rgba(159,212,212,0.1);
  border-color: rgba(159,212,212,0.25);
  color: #9FD4D4;
}

.filter-btn.active:hover {
  background: rgba(159,212,212,0.15);
}

/* ── Table ────────────────────────────────────────── */
.table-container {
  width: 100%;
  max-width: 100%;
  margin: 4px 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(241,237,224,0.08);
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
  background: #131B33;
  min-width: 700px;
  box-sizing: border-box;
}

table th {
  background: rgba(241,237,224,0.04);
  color: rgba(241,237,224,0.5);
  font-size: 11px;
  font-weight: 500;
  font-family: 'SF Mono', Menlo, monospace;
  letter-spacing: 0.5px;
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(241,237,224,0.07);
  position: sticky;
  top: 0;
  z-index: 10;
}

table td {
  padding: 10px 12px;
  font-size: 13px;
  color: rgba(241,237,224,0.75);
  border-bottom: 1px solid rgba(241,237,224,0.05);
  vertical-align: middle;
  word-wrap: break-word;
  word-break: break-word;
}

table tr:last-child td { border-bottom: none; }

table tr:hover td {
  background: rgba(241,237,224,0.04);
}

/* ── Column widths ────────────────────────────────── */
.col-date     { width: 12%; }
.col-time     { width: 10%; }
.col-duration { width: 12%; }
.col-count    { width: 8%;  }
.col-notes    { width: 20%; max-width: 150px; white-space: normal; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; }
.col-actions  { width: 12%; }

/* ── States ───────────────────────────────────────── */
.no-data {
  text-align: center;
  color: rgba(241,237,224,0.3);
  font-style: italic;
  padding: 40px 20px;
}

/* ── Buttons ──────────────────────────────────────── */
.btn-small {
  padding: 4px 8px;
  font-size: 11px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin: 0 2px;
  font-family: inherit;
  transition: opacity 0.15s;
}

.btn-small:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.edit-btn {
  background: rgba(212,179,106,0.15);
  color: #D4B36A;
  border: 1px solid rgba(212,179,106,0.2);
}

.edit-btn:hover:not(:disabled) { opacity: 0.8; }

.delete-btn {
  background: rgba(220,80,80,0.12);
  color: #E07070;
  border: 1px solid rgba(220,80,80,0.2);
}

.delete-btn:hover:not(:disabled) { opacity: 0.8; }

/* ── Footer ───────────────────────────────────────── */
.record-count {
  text-align: center;
  color: rgba(241,237,224,0.35);
  font-size: 12px;
  margin-top: 10px;
  font-family: 'SF Mono', Menlo, monospace;
}

.filter-info {
  color: #9FD4D4;
  font-weight: 500;
}

/* ── RWD ──────────────────────────────────────────── */
@media (max-width: 768px) {
  .records-container { padding: 14px; }
  .filter-controls { flex-direction: column; align-items: flex-start; gap: 8px; }
  table { min-width: 500px; }
  table th, table td { padding: 8px 8px; font-size: 11px; }
  .btn-small { padding: 3px 6px; font-size: 10px; }
  .hide-mobile { display: none; }
}

@media (max-width: 480px) {
  .records-container { padding: 10px; }
  table { min-width: 400px; }
  table th, table td { padding: 6px 6px; font-size: 10px; }
  .btn-small { padding: 2px 4px; font-size: 9px; }
  .col-date { width: 15%; min-width: 60px; }
}
</style>
