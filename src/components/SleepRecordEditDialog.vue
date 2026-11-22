<template>
  <div class="modal-overlay no-print" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>編輯睡眠記錄</h2>
        <button @click="handleClose" class="close-btn" aria-label="關閉">&times;</button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="edit-sleep-date">日期</label>
            <input
              id="edit-sleep-date"
              type="date"
              v-model="form.date"
              :disabled="isLoading"
              :max="maxDate"
            />
            <small class="help-text">可以修改記錄日期，但請注意不要設為未來日期</small>
          </div>

          <div class="form-group">
            <label for="edit-bedtime">上床時間 (HH:mm)</label>
            <div class="time-input-group">
              <input id="edit-bedtime" type="time" v-model="form.bedtime" :disabled="isLoading" />
              <button
                type="button"
                @click="setBedtimeNow"
                class="btn-small now-btn"
                :disabled="isLoading"
              >
                現在
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="edit-sleep-time">入睡時間 (HH:mm)</label>
            <div class="time-input-group">
              <input
                id="edit-sleep-time"
                type="time"
                v-model="form.sleepTime"
                :disabled="isLoading"
              />
              <button
                type="button"
                @click="setSleepTimeNow"
                class="btn-small now-btn"
                :disabled="isLoading"
              >
                現在
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="edit-wake-time">起床時間 (HH:mm)</label>
            <div class="time-input-group">
              <input
                id="edit-wake-time"
                type="time"
                v-model="form.wakeTime"
                :disabled="isLoading"
              />
              <button
                type="button"
                @click="setWakeTimeNow"
                class="btn-small now-btn"
                :disabled="isLoading"
              >
                現在
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="edit-wake-count">夜間醒來次數</label>
            <input
              id="edit-wake-count"
              type="number"
              v-model="form.wakeCount"
              min="0"
              :disabled="isLoading"
            />
          </div>

          <div class="form-group">
            <label for="edit-notes">備註</label>
            <textarea
              id="edit-notes"
              v-model="form.notes"
              rows="3"
              placeholder="例：難入睡、睡得很好..."
              :disabled="isLoading"
            ></textarea>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button @click="handleClose" :disabled="isLoading" class="btn-secondary">取消</button>
        <button @click="handleSubmit" :disabled="isLoading" class="btn-primary">
          <span v-if="isLoading">儲存中...</span>
          <span v-else>儲存變更</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue' // 修復：加入 computed
import { useSleepTracking } from '@/composables/useSleepTracking'
import { useDiaryUtils } from '@/composables/useDiaryUtils'
import { checkSleepRecordInput } from '@/lib/sleep-record-input.js'

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

const { editSleepRecord } = useSleepTracking()
const { normalizeTimestamp, getCurrentTime } = useDiaryUtils()

// 響應式數據
const isLoading = ref(false)
const form = ref({
  date: '',
  bedtime: '',
  sleepTime: '',
  wakeTime: '',
  wakeCount: 0,
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

const setBedtimeNow = () => {
  const { time } = getCurrentTime()
  form.value.bedtime = time
}

const setSleepTimeNow = () => {
  const { time } = getCurrentTime()
  form.value.sleepTime = time
}

const setWakeTimeNow = () => {
  const { time } = getCurrentTime()
  form.value.wakeTime = time
}

const handleSubmit = async () => {
  // 驗證日期不能是未來
  const recordDate = new Date(form.value.date)
  const today = new Date()
  today.setHours(23, 59, 59, 999)

  if (recordDate > today) {
    emit('show-message', '記錄日期不能是未來日期', 'error')
    return
  }

  // 明顯不合理的入睡耗時先跟使用者確認一次（只提示、不阻擋）
  const warning = checkSleepRecordInput(form.value)
  if (warning && !window.confirm(warning)) return

  try {
    isLoading.value = true

    await editSleepRecord(props.currentBabyId, props.record.id, form.value, () =>
      emit('record-updated'),
    )

    emit('show-message', '睡眠記錄已更新成功！', 'success')
    emit('close')
  } catch (error) {
    emit('show-message', error.message, 'error')
  } finally {
    isLoading.value = false
  }
}

// 初始化表單數據
const initializeForm = () => {
  const record = props.record

  // 處理日期
  let recordDate = ''
  if (record.date) {
    recordDate = record.date
  } else if (record.created) {
    const createdDate = normalizeTimestamp(record.created)
    recordDate = createdDate ? createdDate.toISOString().split('T')[0] : ''
  }

  // 處理時間
  const toTimeString = (timestamp) => {
    const date = normalizeTimestamp(timestamp)
    return date ? date.toTimeString().slice(0, 5) : ''
  }

  form.value = {
    date: recordDate,
    bedtime: toTimeString(record.bedTimestamp),
    sleepTime: toTimeString(record.sleepTimestamp),
    wakeTime: toTimeString(record.wakeTimestamp),
    wakeCount: record.wakeCount || 0,
    notes: record.notes || '',
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
  /* 遮罩刻意寫死黑色半透明：淺色、深色主題都適用（設計規劃 §2） */
  background: rgba(0, 0, 0, 0.6);
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
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 0;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-2);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideIn 0.25s ease;
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
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  border: none;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-2);
  line-height: 1;
  padding: 0;
  width: var(--tap-min);
  height: var(--tap-min);
  margin-right: -10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s, color 0.2s;
}

.close-btn:hover {
  background: var(--surface-2);
  color: var(--text);
}

/* ── Body ───────────────────────────────────────── */
.modal-body { padding: 20px 24px; }

.form-group { margin-bottom: 18px; }

.form-group label {
  display: block;
  margin-bottom: 7px;
  font-weight: 500;
  color: var(--text-2);
  font-size: 13px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  min-height: var(--tap-min);
  padding: 10px 12px;
  background: var(--surface-2);
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: 16px;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--primary);
}

.form-group input:disabled,
.form-group textarea:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

/* ── Time input group ───────────────────────────── */
.time-input-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.time-input-group input { flex: 1; }

.btn-small {
  min-height: var(--tap-min);
  padding: 6px 14px;
  font-size: 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
  font-family: inherit;
}

/* 「現在」＝次要操作（外框） */
.now-btn {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border-strong);
}

.now-btn:hover:not(:disabled) {
  background: var(--surface-2);
}

.now-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.help-text {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: var(--text-3);
  font-style: italic;
}

/* ── Footer ─────────────────────────────────────── */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px 24px;
  border-top: 1px solid var(--border);
}

/* 取消＝次要（外框）；送出＝主要（--primary） */
.btn-secondary,
.btn-primary {
  min-height: var(--tap-min);
  padding: 9px 18px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font: inherit;
  font-size: 15px;
  transition: background 0.15s;
}

.btn-secondary {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border-strong);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--surface-2);
}

.btn-primary {
  background: var(--primary);
  color: var(--on-primary);
  border: 1px solid var(--primary);
  font-weight: 600;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.45;
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
