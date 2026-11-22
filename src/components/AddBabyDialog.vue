<template>
  <div class="modal-overlay no-print" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>新增寶寶</h2>
        <button @click="handleClose" class="close-btn" aria-label="關閉">&times;</button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="baby-name">寶寶姓名 *</label>
            <input
              id="baby-name"
              type="text"
              v-model="form.name"
              placeholder="請輸入寶寶姓名"
              required
              :disabled="isLoading"
              autofocus
            />
          </div>

          <div class="form-group">
            <label for="baby-birthdate">出生日期 *</label>
            <input
              id="baby-birthdate"
              type="date"
              v-model="form.birthDate"
              required
              :disabled="isLoading"
              :max="maxDate"
            />
          </div>

          <div class="form-group">
            <label>性別 (可選)</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" v-model="form.gender" value="male" :disabled="isLoading" />
                男寶
              </label>
              <label class="radio-label">
                <input type="radio" v-model="form.gender" value="female" :disabled="isLoading" />
                女寶
              </label>
              <label class="radio-label">
                <input type="radio" v-model="form.gender" value="" :disabled="isLoading" />
                不指定
              </label>
            </div>
          </div>

          <div class="form-group">
            <label for="baby-notes">備註 (可選)</label>
            <textarea
              id="baby-notes"
              v-model="form.notes"
              placeholder="例：早產兒、過敏體質等特殊註記"
              rows="3"
              :disabled="isLoading"
            ></textarea>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button @click="handleClose" :disabled="isLoading" class="btn-secondary">取消</button>
        <button
          @click="handleSubmit"
          :disabled="isLoading || !form.name || !form.birthDate"
          class="btn-primary"
        >
          <span v-if="isLoading">新增中...</span>
          <span v-else>新增寶寶</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBabyManagement } from '@/composables/useBabyManagement'

const emit = defineEmits(['close', 'baby-added', 'show-message'])

const { addBaby } = useBabyManagement()

// 響應式數據
const isLoading = ref(false)
const form = ref({
  name: '',
  birthDate: '',
  gender: '',
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

const handleSubmit = async () => {
  if (!form.value.name.trim() || !form.value.birthDate) {
    emit('show-message', '請填入寶寶姓名和出生日期', 'error')
    return
  }

  // 驗證日期不能是未來
  const birthDate = new Date(form.value.birthDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (birthDate > today) {
    emit('show-message', '出生日期不能是未來日期', 'error')
    return
  }

  try {
    isLoading.value = true

    const babyData = {
      name: form.value.name.trim(),
      birthDate: form.value.birthDate,
      gender: form.value.gender || null,
      notes: form.value.notes.trim() || null,
      created: new Date().toISOString(),
    }

    await addBaby(babyData.name, babyData.birthDate)

    emit('baby-added', babyData)
    emit('close')
  } catch (error) {
    emit('show-message', error.message, 'error')
  } finally {
    isLoading.value = false
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
  max-width: 500px;
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

/* ── Radio group ────────────────────────────────── */
.radio-group {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.radio-label {
  display: flex;
  align-items: center;
  min-height: var(--tap-min);
  cursor: pointer;
  font-weight: normal;
  font-size: 14px;
  color: var(--text);
  margin-bottom: 0;
}

.radio-label input[type='radio'] {
  width: auto;
  min-height: 0;
  margin-right: 7px;
  margin-bottom: 0;
  accent-color: var(--primary);
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
  .radio-group { flex-direction: column; gap: 10px; }
  .modal-footer { flex-direction: column-reverse; }
  .btn-secondary, .btn-primary { width: 100%; }
}
</style>
