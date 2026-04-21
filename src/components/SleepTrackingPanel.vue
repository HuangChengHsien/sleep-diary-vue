<template>
  <div class="sleep-controls">
    <h2>😴 睡眠記錄</h2>
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
        🛏️ 上床
      </button>

      <button
        v-show="buttonStates.showSleepBtn"
        @click="handleSetSleepTime"
        :disabled="isLoading"
        class="sleep-btn"
      >
        😴 入睡
      </button>

      <button
        v-show="buttonStates.showWakeBtn"
        @click="handleSetWakeTime"
        :disabled="isLoading"
        class="wake-btn"
      >
        😊 起床
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

      <button @click="handleAddManualRecord" :disabled="isLoading">💾 儲存睡眠記錄</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSleepTracking } from '@/composables/useSleepTracking'
import { useDiaryUtils } from '@/composables/useDiaryUtils'

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
  currentSleepSession,
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
  background: #131B33;
  border: 1px solid rgba(241,237,224,0.08);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 20px;
  box-sizing: border-box;
  font-family: -apple-system, 'PingFang TC', 'Helvetica Neue', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.sleep-controls h2 {
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

/* ── Sleep status ───────────────────────────────── */
.sleep-status {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 16px;
  padding: 10px 14px;
  border-radius: 8px;
  text-align: center;
}

.sleeping {
  background: rgba(159,212,212,0.1);
  color: #9FD4D4;
  border: 1px solid rgba(159,212,212,0.2);
}

.awake {
  background: rgba(212,179,106,0.1);
  color: #D4B36A;
  border: 1px solid rgba(212,179,106,0.2);
}

/* ── Quick action buttons ───────────────────────── */
.sleep-quick-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.sleep-btn {
  background: rgba(159,212,212,0.12);
  color: #9FD4D4;
  border: 1px solid rgba(159,212,212,0.2);
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.15s;
}

.bedtime-btn {
  background: rgba(176,159,212,0.12);
  color: #B09FD4;
  border-color: rgba(176,159,212,0.2);
}

.wake-btn {
  background: rgba(212,179,106,0.12);
  color: #D4B36A;
  border-color: rgba(212,179,106,0.2);
}

.sleep-btn:hover:not(:disabled) {
  opacity: 0.85;
  transform: translateY(-1px);
}

.sleep-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Manual form ─────────────────────────────────── */
.manual-sleep-form {
  background: rgba(241,237,224,0.03);
  border: 1px solid rgba(241,237,224,0.08);
  border-radius: 10px;
  padding: 18px;
  margin-top: 16px;
}

.manual-sleep-form h3 {
  margin-top: 0;
  margin-bottom: 14px;
  color: rgba(241,237,224,0.6);
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
  color: rgba(241,237,224,0.5);
}

.form-group input {
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

.form-group input:focus {
  outline: none;
  border-color: rgba(159,212,212,0.35);
}

.btn-small {
  padding: 6px 10px;
  font-size: 12px;
  margin-left: 6px;
  background: rgba(241,237,224,0.07);
  color: rgba(241,237,224,0.55);
  border: 1px solid rgba(241,237,224,0.1);
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}

.btn-small:hover {
  background: rgba(241,237,224,0.12);
  color: rgba(241,237,224,0.85);
}

/* ── RWD ────────────────────────────────────────── */
@media (max-width: 768px) {
  .sleep-quick-actions { flex-direction: column; }
  .form-row { flex-direction: column; gap: 10px; }
  .form-group { min-width: auto; }
}
</style>
