<template>
  <div v-if="message" :class="['status-message', `status-${type}`]">
    <div class="status-content">
      <span class="status-icon">{{ getIcon() }}</span>
      <span class="status-text">{{ message }}</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
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

const getIcon = () => {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  }
  return icons[props.type] || icons.info
}
</script>

<style scoped>
.status-message {
  margin: 15px 0;
  padding: 11px 14px;
  border-radius: 8px;
  border-left: 3px solid;
  animation: slideIn 0.25s ease-out;
  font-family: -apple-system, 'PingFang TC', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.status-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icon { font-size: 15px; }

.status-text {
  font-size: 13px;
  font-weight: 500;
}

.status-info {
  background: rgba(159,212,212,0.08);
  border-left-color: #9FD4D4;
  color: rgba(159,212,212,0.9);
}

.status-success {
  background: rgba(80,200,120,0.08);
  border-left-color: #50C878;
  color: rgba(100,210,140,0.9);
}

.status-error {
  background: rgba(224,112,112,0.08);
  border-left-color: #E07070;
  color: rgba(224,112,112,0.9);
}

.status-warning {
  background: rgba(212,179,106,0.08);
  border-left-color: #D4B36A;
  color: rgba(212,179,106,0.9);
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
