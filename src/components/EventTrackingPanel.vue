<template>
  <div class="event-form">
    <h2>📝 事件記錄</h2>
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

      <button @click="handleAddManualEvent" :disabled="isLoading">+ 新增事件</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useEventTracking } from '@/composables/useEventTracking'
import { useDiaryUtils } from '@/composables/useDiaryUtils'

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
  background: #131B33;
  border: 1px solid rgba(241,237,224,0.08);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 20px;
  box-sizing: border-box;
  font-family: -apple-system, 'PingFang TC', 'Helvetica Neue', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.event-form h2 {
  color: #F1EDE0;
  border-bottom: 2px solid rgba(159,212,212,0.4);
  padding-bottom: 10px;
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 600;
}

.info-box {
  background: rgba(159,212,212,0.06);
  border: 1px solid rgba(159,212,212,0.2);
  border-radius: 8px;
  padding: 10px 14px;
  margin: 0 0 16px;
  font-size: 13px;
  color: rgba(159,212,212,0.85);
}

/* ── Quick event buttons ────────────────────────── */
.quick-event-buttons {
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-event-btn {
  background: rgba(159,212,212,0.08);
  color: rgba(159,212,212,0.85);
  border: 1px solid rgba(159,212,212,0.2);
  padding: 7px 13px;
  border-radius: 100px;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  transition: all 0.15s;
  white-space: nowrap;
}

.quick-event-btn:hover:not(:disabled) {
  background: rgba(159,212,212,0.15);
  color: #9FD4D4;
}

.quick-event-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Manual form ─────────────────────────────────── */
.manual-event-form {
  background: rgba(241,237,224,0.03);
  border: 1px solid rgba(241,237,224,0.08);
  border-radius: 10px;
  padding: 18px;
  margin: 16px 0;
}

.form-group { margin-bottom: 14px; }

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(241,237,224,0.5);
}

.form-group select,
.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px 10px;
  background: #1A2340;
  color: #F1EDE0;
  border: 1px solid rgba(241,237,224,0.1);
  border-radius: 7px;
  font-size: 13px;
  font-family: inherit;
  box-sizing: border-box;
  color-scheme: dark;
  transition: border-color 0.2s;
}

.form-group select:focus,
.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: rgba(159,212,212,0.35);
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
  padding: 8px 12px;
  font-size: 12px;
  background: rgba(241,237,224,0.07);
  color: rgba(241,237,224,0.55);
  border: 1px solid rgba(241,237,224,0.1);
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: all 0.15s;
}

.btn-small:hover {
  background: rgba(241,237,224,0.12);
  color: rgba(241,237,224,0.85);
}

/* ── RWD ────────────────────────────────────────── */
@media (max-width: 768px) {
  .quick-event-buttons { justify-content: center; }
  .form-row { flex-direction: column; align-items: stretch; }
  .form-row input { min-width: auto; }
}
</style>
