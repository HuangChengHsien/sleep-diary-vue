<template>
  <div class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>新增寶寶</h2>
        <button @click="handleClose" class="close-btn">&times;</button>
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
                👶 男寶
              </label>
              <label class="radio-label">
                <input type="radio" v-model="form.gender" value="female" :disabled="isLoading" />
                👧 女寶
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
  cursor: pointer;
  font-weight: normal;
  font-size: 13px;
  color: rgba(241,237,224,0.65);
  margin-bottom: 0;
}

.radio-label input[type='radio'] {
  width: auto;
  margin-right: 7px;
  margin-bottom: 0;
  accent-color: #9FD4D4;
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
  .radio-group { flex-direction: column; gap: 10px; }
  .modal-footer { flex-direction: column-reverse; }
  .btn-secondary, .btn-primary { width: 100%; }
}
</style>
