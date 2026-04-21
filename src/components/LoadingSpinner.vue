<template>
  <div v-if="show" class="loading">
    <div class="loading-spinner"></div>
    <span>{{ message }}</span>
  </div>
</template>

<script>
export default {
  name: 'LoadingSpinner',
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    message: {
      type: String,
      default: '載入中...',
    },
  },
}
</script>

<style scoped>
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 15px 0;
  color: rgba(241,237,224,0.45);
  font-size: 14px;
  font-family: -apple-system, 'PingFang TC', system-ui, sans-serif;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(241,237,224,0.1);
  border-top: 2px solid #9FD4D4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 10px;
  flex-shrink: 0;
}

@keyframes spin {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
