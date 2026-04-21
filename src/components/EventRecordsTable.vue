<template>
  <div class="records-container">
    <h2>📋 事件列表</h2>

    <!-- 日期篩選控制 -->
    <div class="filter-controls">
      <label>查看事件日期: </label>
      <input type="date" v-model="localFilterDate" @change="handleFilterChange" />
      <button @click="handleFilterToday" class="btn-small filter-btn">今天</button>
      <button @click="handleShowAll" class="btn-small filter-btn">全部</button>
    </div>

    <div class="table-container">
      <div class="table-responsive-wrapper"></div>
      <table>
        <thead>
          <tr>
            <th>日期</th>
            <th>時間</th>
            <th>事件說明</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="formattedRecords.length === 0">
            <td colspan="4" class="no-data">
              {{ currentFilter === 'all' ? '暫無事件記錄，請開始記錄事件' : '該日期沒有事件記錄' }}
            </td>
          </tr>
          <tr v-for="record in formattedRecords" :key="record.id">
            <td>{{ record.date }}</td>
            <td>{{ record.time }}</td>
            <td>{{ record.description }}</td>
            <td>
              <button @click="handleEdit(record)" class="edit-btn btn-small">編輯</button>
              <button @click="handleDelete(record)" class="delete-btn btn-small">刪除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="formattedRecords.length > 0" class="record-count">
      顯示 {{ formattedRecords.length }} 筆記錄
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useEventTracking } from '@/composables/useEventTracking'

const props = defineProps({
  records: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['edit-record', 'delete-record', 'filter-change'])

const {
  formatEventRecordForDisplay,
  filterEventRecords,
  currentFilter,
  setFilterDate,
  setFilterToToday,
} = useEventTracking()

// 本地篩選日期狀態
const localFilterDate = ref('')

// 🔧 修改：格式化後的記錄 - 修正篩選邏輯
const formattedRecords = computed(() => {
  // 使用 composable 的篩選邏輯，而不是本地狀態
  const filteredRecords = filterEventRecords(props.records, currentFilter.value)
  return filteredRecords
    .map((record) => formatEventRecordForDisplay(record))
    .sort((a, b) => {
      if (!a.fullTimestamp || !b.fullTimestamp) return 0
      return b.fullTimestamp - a.fullTimestamp
    })
})

// 方法
const handleEdit = (record) => {
  // 找到原始記錄
  const originalRecord = props.records.find((r) => r.id === record.id)
  emit('edit-record', originalRecord)
}

const handleDelete = (record) => {
  // 找到原始記錄
  const originalRecord = props.records.find((r) => r.id === record.id)
  emit('delete-record', originalRecord)
}

const handleFilterChange = () => {
  if (localFilterDate.value) {
    setFilterDate(localFilterDate.value)
    emit('filter-change', localFilterDate.value)
  }
}

const handleFilterToday = () => {
  const today = setFilterToToday()
  localFilterDate.value = today
  emit('filter-change', today)
}

const handleShowAll = () => {
  setFilterDate('all')
  localFilterDate.value = ''
  emit('filter-change', 'all')
}

// 監聽 currentFilter 變化來同步本地狀態
watch(currentFilter, (newFilter) => {
  if (newFilter === 'all') {
    localFilterDate.value = ''
  } else if (newFilter === 'today') {
    // 🔧 新增：處理 'today' 狀態
    const today = new Date().toISOString().split('T')[0]
    localFilterDate.value = today
  } else {
    localFilterDate.value = newFilter
  }
})

// 🔧 修改：初始化 - 不要覆蓋 composable 的預設值
onMounted(() => {
  // 根據 composable 的當前篩選狀態來初始化本地狀態
  if (currentFilter.value === 'all') {
    localFilterDate.value = ''
  } else if (currentFilter.value === 'today') {
    const today = new Date().toISOString().split('T')[0]
    localFilterDate.value = today
  } else {
    localFilterDate.value = currentFilter.value
  }

  // 通知父組件當前的篩選條件
  emit('filter-change', currentFilter.value)
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

.filter-controls input[type="date"] {
  background: #1A2340;
  color: #F1EDE0;
  border: 1px solid rgba(241,237,224,0.15);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
  font-family: inherit;
  color-scheme: dark;
}

.filter-controls input[type="date"]:focus {
  outline: none;
  border-color: rgba(159,212,212,0.4);
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

/* ── Table ────────────────────────────────────────── */
.table-container {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  margin: 4px 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(241,237,224,0.08);
  box-sizing: border-box;
}

.table-responsive-wrapper {
  display: contents;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: #131B33;
  min-width: 500px;
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
  padding: 10px 14px;
  border-bottom: 1px solid rgba(241,237,224,0.07);
  position: sticky;
  top: 0;
  z-index: 10;
}

table td {
  padding: 10px 14px;
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

/* 事件說明欄換行 */
table td:nth-child(3) {
  white-space: normal;
  line-height: 1.4;
}

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

.edit-btn {
  background: rgba(212,179,106,0.15);
  color: #D4B36A;
  border: 1px solid rgba(212,179,106,0.2);
}

.edit-btn:hover { opacity: 0.8; }

.delete-btn {
  background: rgba(220,80,80,0.12);
  color: #E07070;
  border: 1px solid rgba(220,80,80,0.2);
}

.delete-btn:hover { opacity: 0.8; }

/* ── Footer ───────────────────────────────────────── */
.record-count {
  text-align: center;
  color: rgba(241,237,224,0.35);
  font-size: 12px;
  margin-top: 10px;
  font-family: 'SF Mono', Menlo, monospace;
}

/* ── RWD ──────────────────────────────────────────── */
@media (max-width: 768px) {
  .records-container { padding: 14px; }
  .filter-controls { flex-direction: column; align-items: flex-start; gap: 8px; }
  table { min-width: 400px; }
  table th, table td { padding: 8px 10px; font-size: 11px; }
  .btn-small { padding: 3px 6px; font-size: 10px; }
}

@media (max-width: 480px) {
  .records-container { padding: 10px; }
  table { min-width: 320px; }
  table th, table td { padding: 6px 8px; font-size: 10px; }
  .filter-controls { padding: 10px; gap: 8px; }
}
</style>
