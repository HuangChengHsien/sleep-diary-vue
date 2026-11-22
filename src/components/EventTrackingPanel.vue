<template>
  <!-- 整塊都是操作（按鈕＋表單），紙本不印 -->
  <div class="event-form no-print">
    <h2><AppIcon name="pencil-line" class="title-icon" />事件記錄</h2>
    <p class="info-box">任何覺得會影響睡眠或在睡眠中發生的事件都可以記錄。</p>

    <!-- 快速事件按鈕 -->
    <div class="quick-event-buttons">
      <button
        v-for="button in quickEventButtons"
        :key="button.id"
        @click="handleQuickEvent(button.event)"
        :disabled="isLoading"
        class="quick-event-btn"
      >
        {{ button.text }}
      </button>
    </div>

    <!-- 手動事件記錄表單 -->
    <div class="manual-event-form">
      <div class="form-group">
        <label>手動事件類型:</label>
        <select v-model="manualForm.eventType">
          <option v-for="option in eventTypeOptions" :key="option.value" :value="option.value">
            {{ option.text }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>時間:</label>
        <div class="form-row">
          <input type="date" v-model="manualForm.eventDate" />
          <input type="time" v-model="manualForm.eventTime" />
          <button @click="setCurrentTime" class="btn-small">現在時間</button>
        </div>
      </div>

      <div class="form-group">
        <label>備註:</label>
        <textarea v-model="manualForm.notes" placeholder="輸入備註..." rows="3"></textarea>
      </div>

      <button @click="handleAddManualEvent" :disabled="isLoading" class="btn-primary">
        <AppIcon name="plus" />
        新增事件
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useEventTracking } from '@/composables/useEventTracking'
import { useDiaryUtils } from '@/composables/useDiaryUtils'
import AppIcon from '@/components/ui/AppIcon.js'

const props = defineProps({
  currentBabyId: {
    type: String,
    default: null,
  },
  eventRecords: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update-records', 'show-message'])

const { getCurrentTime } = useDiaryUtils()
const { quickEventButtons, eventTypeOptions, addQuickEvent, addManualEvent } = useEventTracking()

// 響應式數據
const isLoading = ref(false)
const manualForm = ref({
  eventType: 'other',
  eventDate: '',
  eventTime: '',
  notes: '',
})

// 方法
const handleQuickEvent = async (eventText) => {
  try {
    isLoading.value = true
    const message = await addQuickEvent(props.currentBabyId, eventText, () =>
      emit('update-records'),
    )
    emit('show-message', message, 'success')
  } catch (error) {
    emit('show-message', error.message, 'error')
  } finally {
    isLoading.value = false
  }
}

const handleAddManualEvent = async () => {
  try {
    isLoading.value = true
    const message = await addManualEvent(props.currentBabyId, manualForm.value, () =>
      emit('update-records'),
    )
    // 清空備註欄位
    manualForm.value.notes = ''
    emit('show-message', message, 'success')
  } catch (error) {
    emit('show-message', error.message, 'error')
  } finally {
    isLoading.value = false
  }
}

const setCurrentTime = () => {
  const { date, time } = getCurrentTime()
  manualForm.value.eventDate = date
  manualForm.value.eventTime = time
}

// 初始化
onMounted(() => {
  setCurrentTime()
})
</script>

<style scoped>
/* ── Panel ──────────────────────────────────────── */
.event-form {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-1);
  padding: var(--space-5);
  margin-bottom: var(--space-5);
  box-sizing: border-box;
  color: var(--text);
}

.event-form h2 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text);
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
  margin-top: 0;
  margin-bottom: var(--space-4);
  font-size: 18px;
  font-weight: 600;
}

.title-icon {
  color: var(--primary);
}

.info-box {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  margin: 0 0 var(--space-4);
  font-size: 13px;
  color: var(--text-2);
}

/* ── Quick event buttons：次要操作，外框樣式 ───── */
.quick-event-buttons {
  margin-bottom: var(--space-5);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.quick-event-btn {
  min-height: var(--tap-min);
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border-strong);
  padding: 7px 14px;
  border-radius: 100px;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  transition: background 0.15s;
  white-space: nowrap;
}

.quick-event-btn:hover:not(:disabled) {
  background: var(--surface-2);
}

.quick-event-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── Manual form ─────────────────────────────────── */
.manual-event-form {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 18px;
  margin: var(--space-4) 0;
}

.form-group { margin-bottom: 14px; }

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
}

.form-group select,
.form-group input,
.form-group textarea {
  width: 100%;
  min-height: var(--tap-min);
  padding: 8px 10px;
  background: var(--surface-2);
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: 16px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-group select:focus,
.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--primary);
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.form-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.form-row input {
  flex: 1;
  min-width: 120px;
}

.btn-small {
  min-height: var(--tap-min);
  padding: 8px 14px;
  font-size: 14px;
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: background 0.15s;
}

.btn-small:hover {
  background: var(--surface-2);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: var(--tap-min);
  padding: 10px 18px;
  background: var(--primary);
  color: var(--on-primary);
  border: none;
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── RWD ────────────────────────────────────────── */
@media (max-width: 768px) {
  .quick-event-buttons { justify-content: center; }
  .form-row { flex-direction: column; align-items: stretch; }
  .form-row input { min-width: auto; }
}
</style>
