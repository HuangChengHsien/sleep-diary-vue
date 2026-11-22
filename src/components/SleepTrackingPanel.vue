<template>
  <!-- 整塊都是操作（按鈕＋表單），紙本不印 -->
  <div class="sleep-controls no-print">
    <h2><AppIcon name="moon" class="title-icon" />睡眠記錄</h2>
    <p class="info-box">入睡時間指的是真正睡著的時間。上床時間是開始準備睡覺的時間。</p>

    <!-- 睡眠狀態顯示 -->
    <div :class="['sleep-status', sleepStatus.class]">
      {{ sleepStatus.text }}
    </div>

    <!-- 快速操作按鈕 -->
    <div class="sleep-quick-actions">
      <button
        v-show="buttonStates.showBedtimeBtn"
        @click="handleSetBedtime"
        :disabled="isLoading"
        class="sleep-btn bedtime-btn"
      >
        <AppIcon name="bed" />
        上床
      </button>

      <button
        v-show="buttonStates.showSleepBtn"
        @click="handleSetSleepTime"
        :disabled="isLoading"
        class="sleep-btn"
      >
        <AppIcon name="moon" />
        入睡
      </button>

      <button
        v-show="buttonStates.showWakeBtn"
        @click="handleSetWakeTime"
        :disabled="isLoading"
        class="sleep-btn wake-btn"
      >
        <AppIcon name="sunrise" />
        起床
      </button>
    </div>

    <!-- 手動記錄表單 -->
    <div class="manual-sleep-form">
      <h3>手動記錄睡眠</h3>

      <div class="form-row">
        <div class="form-group">
          <label>日期:</label>
          <input type="date" v-model="manualForm.date" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>上床時間:</label>
          <input type="time" v-model="manualForm.bedtime" />
          <button @click="setBedtimeNow" class="btn-small">現在</button>
        </div>

        <div class="form-group">
          <label>入睡時間:</label>
          <input type="time" v-model="manualForm.sleepTime" />
          <button @click="setSleepTimeNow" class="btn-small">現在</button>
        </div>

        <div class="form-group">
          <label>起床時間:</label>
          <input type="time" v-model="manualForm.wakeTime" />
          <button @click="setWakeTimeNow" class="btn-small">現在</button>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>夜間醒來次數:</label>
          <input type="number" v-model="manualForm.wakeCount" min="0" style="width: 80px" />
        </div>

        <div class="form-group">
          <label>備註:</label>
          <input type="text" v-model="manualForm.notes" placeholder="例：難入睡、睡得很好..." />
        </div>
      </div>

      <button @click="handleAddManualRecord" :disabled="isLoading" class="btn-primary save-btn">
        儲存睡眠記錄
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useSleepTracking } from '@/composables/useSleepTracking'
import { useDiaryUtils } from '@/composables/useDiaryUtils'
import { checkSleepRecordInput } from '@/lib/sleep-record-input.js'
import AppIcon from '@/components/ui/AppIcon.js'

const props = defineProps({
  currentBabyId: {
    type: String,
    default: null,
  },
  sleepRecords: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update-records', 'show-message'])

const { getCurrentTime } = useDiaryUtils()
const {
  sleepStatus,
  buttonStates,
  checkCurrentSleepStatus,
  setBedtime,
  setSleepTime,
  setWakeTime,
  addManualSleepRecord,
} = useSleepTracking()

// 響應式數據
const isLoading = ref(false)
const manualForm = ref({
  date: '',
  bedtime: '',
  sleepTime: '',
  wakeTime: '',
  wakeCount: 0,
  notes: '',
})

// 監聽睡眠記錄變化，更新當前狀態
watch(
  () => props.sleepRecords,
  (newRecords) => {
    checkCurrentSleepStatus(newRecords)
  },
  { immediate: true },
)

// 快速操作方法
const handleSetBedtime = async () => {
  try {
    isLoading.value = true
    const message = await setBedtime(props.currentBabyId, props.sleepRecords, () =>
      emit('update-records'),
    )
    emit('show-message', message, 'success')
  } catch (error) {
    emit('show-message', error.message, 'error')
  } finally {
    isLoading.value = false
  }
}

const handleSetSleepTime = async () => {
  try {
    isLoading.value = true
    const message = await setSleepTime(props.currentBabyId, props.sleepRecords, () =>
      emit('update-records'),
    )
    emit('show-message', message, 'success')
  } catch (error) {
    emit('show-message', error.message, 'error')
  } finally {
    isLoading.value = false
  }
}

const handleSetWakeTime = async () => {
  try {
    isLoading.value = true
    const message = await setWakeTime(props.currentBabyId, props.sleepRecords, () =>
      emit('update-records'),
    )
    emit('show-message', message, 'success')
  } catch (error) {
    emit('show-message', error.message, 'error')
  } finally {
    isLoading.value = false
  }
}

// 手動表單方法
const setBedtimeNow = () => {
  const { time } = getCurrentTime()
  manualForm.value.bedtime = time
}

const setSleepTimeNow = () => {
  const { time } = getCurrentTime()
  manualForm.value.sleepTime = time
}

const setWakeTimeNow = () => {
  const { time } = getCurrentTime()
  manualForm.value.wakeTime = time
}

const handleAddManualRecord = async () => {
  // 明顯不合理的入睡耗時先跟使用者確認一次（只提示、不阻擋）
  const warning = checkSleepRecordInput(manualForm.value)
  if (warning && !window.confirm(warning)) return

  try {
    isLoading.value = true
    const message = await addManualSleepRecord(props.currentBabyId, manualForm.value, () =>
      emit('update-records'),
    )

    // 清空表單
    manualForm.value = {
      date: getCurrentTime().date,
      bedtime: '',
      sleepTime: '',
      wakeTime: '',
      wakeCount: 0,
      notes: '',
    }

    emit('show-message', message, 'success')
  } catch (error) {
    emit('show-message', error.message, 'error')
  } finally {
    isLoading.value = false
  }
}

// 初始化
onMounted(() => {
  const { date } = getCurrentTime()
  manualForm.value.date = date
})
</script>

<style scoped>
/* ── Panel ──────────────────────────────────────── */
.sleep-controls {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-1);
  padding: var(--space-5);
  margin-bottom: var(--space-5);
  box-sizing: border-box;
  color: var(--text);
}

.sleep-controls h2 {
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

/* ── Sleep status（.sleeping 由 useSleepTracking 的 sleepStatus.class 套上；醒著用預設中性樣式） ── */
.sleep-status {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: var(--space-4);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  text-align: center;
  background: var(--surface-2);
  color: var(--text-2);
}

.sleep-status.sleeping {
  background: var(--primary-container);
  color: var(--on-primary-container);
}

/* ── Quick action buttons：上床、入睡＝主色，起床＝輔色 ── */
.sleep-quick-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: var(--space-5);
  flex-wrap: wrap;
}

.sleep-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--tap-min);
  background: var(--primary);
  color: var(--on-primary);
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  transition: background 0.15s;
}

.sleep-btn:hover:not(:disabled) {
  background: var(--primary-hover);
}

.wake-btn,
.wake-btn:hover:not(:disabled) {
  background: var(--accent);
  color: var(--on-accent);
}

.sleep-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── Manual form ─────────────────────────────────── */
.manual-sleep-form {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 18px;
  margin-top: var(--space-4);
}

.manual-sleep-form h3 {
  margin-top: 0;
  margin-bottom: 14px;
  color: var(--text-2);
  font-size: 14px;
  font-weight: 500;
}

.form-row {
  display: flex;
  gap: 15px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.form-group {
  flex: 1;
  min-width: 160px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
}

.form-group input {
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

.form-group input:focus {
  border-color: var(--primary);
}

/* 次要操作：外框按鈕 */
.btn-small {
  min-height: var(--tap-min);
  padding: 6px 14px;
  font-size: 14px;
  margin-top: 6px;
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}

.btn-small:hover {
  background: var(--surface-2);
}

.btn-primary {
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
  .sleep-quick-actions { flex-direction: column; }
  .form-row { flex-direction: column; gap: 10px; }
  .form-group { min-width: auto; }
}
</style>
