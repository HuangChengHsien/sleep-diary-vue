<template>
  <div class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>編輯事件記錄</h2>
        <button @click="handleClose" class="close-btn">&times;</button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="edit-event-date">日期</label>
            <input
              id="edit-event-date"
              type="date"
              v-model="form.eventDate"
              :disabled="isLoading"
              :max="maxDate"
            />
          </div>

          <div class="form-group">
            <label for="edit-event-time">時間 (HH:mm)</label>
            <div class="time-input-group">
              <input
                id="edit-event-time"
                type="time"
                v-model="form.eventTime"
                :disabled="isLoading"
              />
              <button
                type="button"
                @click="setCurrentTime"
                class="btn-small now-btn"
                :disabled="isLoading"
              >
                現在
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="edit-event-notes">事件說明</label>
            <textarea
              id="edit-event-notes"
              v-model="form.notes"
              rows="4"
              placeholder="請描述發生的事件..."
              :disabled="isLoading"
              required
            ></textarea>
            <small class="help-text"> 請詳細描述事件內容，例如：喝奶 150ml、哭鬧 10 分鐘等 </small>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button @click="handleClose" :disabled="isLoading" class="btn-secondary">取消</button>
        <button
          @click="handleSubmit"
          :disabled="isLoading || !form.notes.trim()"
          class="btn-primary"
        >
          <span v-if="isLoading">更新中...</span>
          <span v-else>儲存變更</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useEventTracking } from '@/composables/useEventTracking'
import { useDiaryUtils } from '@/composables/useDiaryUtils'

const props = defineProps({
  record: {
    type: Object,
    required: true,
  },
  currentBabyId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['close', 'record-updated', 'show-message'])

const { editEventRecord } = useEventTracking()
const { normalizeTimestamp, getCurrentTime } = useDiaryUtils()

// 響應式數據
const isLoading = ref(false)
const form = ref({
  eventDate: '',
  eventTime: '',
  notes: '',
})

// 計算屬性
const maxDate = computed(() => {
  // 最大日期設為今天
  return new Date().toISOString().split('T')[0]
})

// 方法
const handleClose = () => {
  if (!isLoading.value) {
    emit('close')
  }
}

const handleOverlayClick = (event) => {
  if (event.target === event.currentTarget) {
    handleClose()
  }
}

const setCurrentTime = () => {
  const { date, time } = getCurrentTime()
  form.value.eventDate = date
  form.value.eventTime = time
}

const handleSubmit = async () => {
  if (!form.value.notes.trim()) {
    emit('show-message', '請填入事件說明', 'error')
    return
  }

  // 驗證日期不能是未來
  const eventDate = new Date(form.value.eventDate)
  const today = new Date()
  today.setHours(23, 59, 59, 999) // 設為今天的最後一刻

  if (eventDate > today) {
    emit('show-message', '事件日期不能是未來日期', 'error')
    return
  }

  try {
    isLoading.value = true

    await editEventRecord(props.currentBabyId, props.record.id, form.value, () =>
      emit('record-updated'),
    )

    emit('show-message', '事件記錄已更新成功！', 'success')
    emit('close')
  } catch (error) {
    emit('show-message', error.message, 'error')
  } finally {
    isLoading.value = false
  }
}

// 修正後的 initializeForm 函數
const initializeForm = () => {
  const record = props.record

  // 處理時間戳
  let oldTimestamp
  if (record.timestamp && typeof record.timestamp.toDate === 'function') {
    oldTimestamp = record.timestamp.toDate()
  } else if (typeof record.timestamp === 'string') {
    oldTimestamp = new Date(record.timestamp)
  } else {
    oldTimestamp = new Date()
  }

  // 提取事件描述
  let eventDescription = ''
  if (record.quickEvent) {
    eventDescription = record.quickEvent
  } else if (record.notes) {
    eventDescription = record.notes
  } else if (record.eventType) {
    const eventNames = {
      feed: '餵奶',
      diaper: '換尿布',
      play: '玩耍',
      cry: '哭泣',
      medicine: '餵藥',
      bath: '洗澡',
      other: '其他',
    }
    eventDescription = eventNames[record.eventType] || record.eventType
  }

  // 修正：統一使用本地時間
  const year = oldTimestamp.getFullYear()
  const month = String(oldTimestamp.getMonth() + 1).padStart(2, '0')
  const day = String(oldTimestamp.getDate()).padStart(2, '0')
  const hours = String(oldTimestamp.getHours()).padStart(2, '0')
  const minutes = String(oldTimestamp.getMinutes()).padStart(2, '0')

  form.value = {
    eventDate: `${year}-${month}-${day}`, // 本地日期
    eventTime: `${hours}:${minutes}`, // 本地時間
    notes: eventDescription,
  }
}

// 鍵盤事件處理
const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    handleClose()
  }
}

// 生命周期
onMounted(() => {
  initializeForm()
  document.addEventListener('keydown', handleKeydown)
  // 防止背景滾動
  document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* ── Overlay ────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ── Modal card ─────────────────────────────────── */
.modal-content {
  background: #131B33;
  border: 1px solid rgba(241,237,224,0.1);
  padding: 0;
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideIn 0.25s ease;
  font-family: -apple-system, 'PingFang TC', 'Helvetica Neue', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-30px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Header ─────────────────────────────────────── */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(241,237,224,0.08);
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #F1EDE0;
  border: none;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: rgba(241,237,224,0.4);
  line-height: 1;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(241,237,224,0.08);
  color: #F1EDE0;
}

/* ── Body ───────────────────────────────────────── */
.modal-body { padding: 20px 24px; }

.form-group { margin-bottom: 18px; }

.form-group label {
  display: block;
  margin-bottom: 7px;
  font-weight: 500;
  color: rgba(241,237,224,0.65);
  font-size: 13px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  background: #1A2340;
  color: #F1EDE0;
  border: 1px solid rgba(241,237,224,0.12);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
  color-scheme: dark;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: rgba(159,212,212,0.4);
  box-shadow: 0 0 0 3px rgba(159,212,212,0.08);
}

.form-group input:disabled,
.form-group textarea:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

/* ── Time input group ───────────────────────────── */
.time-input-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.time-input-group input { flex: 1; }

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  font-family: inherit;
}

.now-btn {
  background: rgba(241,237,224,0.07);
  color: rgba(241,237,224,0.55);
  border: 1px solid rgba(241,237,224,0.12);
}

.now-btn:hover:not(:disabled) {
  background: rgba(241,237,224,0.12);
  color: rgba(241,237,224,0.85);
}

.now-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.help-text {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: rgba(241,237,224,0.35);
  font-style: italic;
}

/* ── Footer ─────────────────────────────────────── */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px 24px;
  border-top: 1px solid rgba(241,237,224,0.08);
}

.btn-secondary {
  padding: 9px 18px;
  background: transparent;
  color: rgba(241,237,224,0.5);
  border: 1px solid rgba(241,237,224,0.12);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.15s;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(241,237,224,0.05);
  color: rgba(241,237,224,0.8);
}

.btn-primary {
  padding: 9px 18px;
  background: rgba(159,212,212,0.15);
  color: #9FD4D4;
  border: 1px solid rgba(159,212,212,0.25);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
  font-weight: 500;
  transition: all 0.15s;
}

.btn-primary:hover:not(:disabled) {
  background: rgba(159,212,212,0.22);
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── RWD ────────────────────────────────────────── */
@media (max-width: 768px) {
  .modal-content { width: 95%; }
  .modal-header, .modal-body, .modal-footer { padding-left: 18px; padding-right: 18px; }
  .time-input-group { flex-direction: column; align-items: stretch; }
  .modal-footer { flex-direction: column-reverse; }
  .btn-secondary, .btn-primary { width: 100%; }
}
</style>
