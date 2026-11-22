<template>
  <!-- 日誌的兩個畫面：記錄（/diary）與趨勢（/analysis），移植自眠序 -->
  <nav class="switcher" aria-label="日誌畫面">
    <RouterLink
      to="/diary"
      class="seg"
      :class="{ active: isDiary }"
      :aria-current="isDiary ? 'page' : undefined"
    >
      <AppIcon name="pencil-line" />
      記錄
    </RouterLink>
    <RouterLink
      :to="analysisTo"
      class="seg"
      :class="{ active: isAnalysis }"
      :aria-current="isAnalysis ? 'page' : undefined"
    >
      <AppIcon name="chart-line" />
      趨勢
    </RouterLink>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from './AppIcon.js'

const props = defineProps({
  // 目前個案；趨勢頁靠它決定要分析誰
  babyId: { type: String, default: '' },
})

const route = useRoute()
const isDiary = computed(() => route.path === '/diary')
const isAnalysis = computed(() => route.path === '/analysis')
const analysisTo = computed(() =>
  props.babyId ? { path: '/analysis', query: { babyId: props.babyId } } : '/analysis',
)
</script>

<style scoped>
.switcher {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-1);
  max-width: 960px;
  margin: 0 auto;
  padding: 0 var(--space-4) var(--space-3);
}

.seg {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 0.9375rem;
  text-decoration: none;
}

.seg.active {
  background: var(--primary-container);
  color: var(--on-primary-container);
  font-weight: 600;
}

.seg:hover:not(.active) {
  color: var(--text);
}

.seg:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

@media print {
  .switcher {
    display: none;
  }
}
</style>
