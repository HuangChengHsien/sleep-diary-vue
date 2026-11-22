<template>
  <div class="records-container">
    <h2><AppIcon name="clipboard-list" class="title-icon" />事件列表</h2>

    <!-- 日期篩選控制 -->
    <div class="filter-controls">
      <label>查看事件日期: </label>
      <input type="date" v-model="localFilterDate" @change="handleFilterChange" />
      <button @click="handleFilterToday" class="btn-small filter-btn no-print">今天</button>
      <button @click="handleShowAll" class="btn-small filter-btn no-print">全部</button>
    </div>

    <div class="table-container">
      <div class="table-responsive-wrapper"></div>
      <table>
        <thead>
          <tr>
            <th>日期</th>
            <th>時間</th>
            <th>事件說明</th>
            <th class="no-print">操作</th>
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
            <td class="no-print">
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
import AppIcon from '@/components/ui/AppIcon.js'

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

.filter-controls input[type="date"] {
  min-height: var(--tap-min);
  background: var(--surface-2);
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  font: inherit;
  font-size: 16px;
}

.filter-controls input[type="date"]:focus {
  border-color: var(--primary);
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

/* ── Table ────────────────────────────────────────── */
.table-container {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  margin: 4px 0 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  box-sizing: border-box;
}

.table-responsive-wrapper {
  display: contents;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: var(--surface);
  min-width: 500px;
  box-sizing: border-box;
}

table th {
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.5px;
  text-align: left;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

table td {
  padding: 10px 14px;
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

/* 事件說明欄換行 */
table td:nth-child(3) {
  white-space: normal;
  line-height: 1.4;
}

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

/* 編輯＝次要操作（外框） */
.edit-btn {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border-strong);
}

.edit-btn:hover { background: var(--surface-2); }

/* 刪除＝破壞性操作，唯一用紅色的地方 */
.delete-btn {
  background: transparent;
  color: var(--danger);
  border: 1px solid var(--danger);
}

.delete-btn:hover { background: var(--danger-container); }

/* ── Footer ───────────────────────────────────────── */
.record-count {
  text-align: center;
  color: var(--text-3);
  font-size: 12px;
  margin-top: 10px;
}

/* ── RWD ──────────────────────────────────────────── */
@media (max-width: 768px) {
  /* 表格內的按鈕在窄螢幕縮小（仍 ≥ 36px，高於 WCAG 2.5.8 的 24px），避免每列被撐得很高 */
  .btn-small { min-height: 36px; padding: 4px 10px; font-size: 13px; }
  .records-container { padding: 14px; }
  .filter-controls { flex-direction: column; align-items: flex-start; gap: 8px; }
  table { min-width: 400px; }
  table th, table td { padding: 8px 10px; font-size: 11px; }
}

@media (max-width: 480px) {
  .records-container { padding: 10px; }
  table { min-width: 320px; }
  table th, table td { padding: 6px 8px; font-size: 10px; }
  .filter-controls { padding: 10px; gap: 8px; }
}

/* ── 列印：整張表攤開印，操作欄與篩選按鈕已用 .no-print 藏起來 ── */
@media print {
  .records-container,
  .table-container {
    overflow: visible;
    box-shadow: none;
  }

  table { min-width: 0; }

  table th { position: static; }
}
</style>
