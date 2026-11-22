<template>
  <div
    v-if="message"
    :class="['status-message', `status-${type}`, 'no-print']"
    :role="type === 'error' || type === 'warning' ? 'alert' : 'status'"
  >
    <div class="status-content">
      <!-- 狀態不只靠顏色分辨：每種都有自己的圖示（Lucide 線條，ISC 授權） -->
      <AppIcon v-if="type === 'success'" name="check" class="status-icon" />
      <AppIcon v-else-if="type === 'warning'" name="triangle-alert" class="status-icon" />
      <AppIcon v-else-if="type === 'error'" name="circle-x" class="status-icon" />
      <AppIcon v-else name="info" class="status-icon" />
      <span class="status-text">{{ message }}</span>
    </div>
  </div>
</template>

<script setup>
import AppIcon from '@/components/ui/AppIcon.js'

defineProps({
  message: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['info', 'success', 'error', 'warning'].includes(value),
  },
})
</script>

<style scoped>
/* 一般文字用 --text，圖示與左邊框用狀態色（*-container 上已驗過 4.5:1） */
.status-message {
  margin: 15px 0;
  padding: 11px 14px;
  border-radius: var(--radius-sm);
  border-left: 3px solid;
  color: var(--text);
  animation: slideIn 0.25s ease-out;
}

.status-content {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.status-icon {
  flex-shrink: 0;
  font-size: 18px;
}

.status-text {
  font-size: 14px;
  font-weight: 500;
}

.status-info {
  background: var(--surface-2);
  border-left-color: var(--border-strong);
}

.status-info .status-icon {
  color: var(--text-2);
}

.status-success {
  background: var(--success-container);
  border-left-color: var(--success);
}

.status-success .status-icon {
  color: var(--success);
}

.status-error {
  background: var(--danger-container);
  border-left-color: var(--danger);
}

.status-error .status-icon {
  color: var(--danger);
}

.status-warning {
  background: var(--warning-container);
  border-left-color: var(--warning);
}

.status-warning .status-icon {
  color: var(--warning);
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
