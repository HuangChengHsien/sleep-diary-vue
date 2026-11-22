<template>
  <!-- 頁首（移植自眠序並簡化：本專案只有日誌與趨勢兩頁，用 DiarySwitcher 切換，不需要返回按鈕） -->
  <header class="page-header">
    <div class="page-header-inner">
      <h1 class="title" tabindex="-1">{{ title }}</h1>
      <span v-if="meta" class="meta">{{ meta }}</span>
      <div v-if="$slots.actions" class="actions">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </header>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  // 標題右側的簡短狀態文字
  meta: { type: String, default: '' },
})
</script>

<style scoped>
.page-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}

.page-header-inner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  max-width: 960px;
  margin: 0 auto;
  min-height: 56px;
  padding: var(--space-2) var(--space-4);
}

.title {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title:focus {
  outline: none;
}

.meta {
  flex-shrink: 0;
  font-size: 0.875rem;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

@media print {
  .page-header {
    position: static;
    border: none;
  }

  .actions {
    display: none;
  }
}
</style>
