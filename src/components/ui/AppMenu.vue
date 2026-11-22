<template>
  <!-- 揭露式選單（disclosure）：按鈕 + 一串動作按鈕，Esc 或點外面關閉 -->
  <div ref="rootEl" class="app-menu" @keydown.esc="close(true)">
    <button
      ref="toggleEl"
      type="button"
      class="menu-toggle"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="listId"
      @click="open = !open"
    >
      <AppIcon name="more-horizontal" />
      {{ label }}
    </button>
    <ul v-show="open" :id="listId" class="menu-list">
      <li v-for="item in items" :key="item.id">
        <button
          type="button"
          class="menu-item"
          :class="{ danger: item.danger }"
          :disabled="item.disabled"
          @click="select(item)"
        >
          <AppIcon v-if="item.icon" :name="item.icon" class="menu-icon" />
          {{ item.label }}
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import AppIcon from './AppIcon.js'

defineProps({
  label: { type: String, default: '更多' },
  // [{ id, label, icon?, danger?, disabled? }]
  items: { type: Array, required: true },
})
const emit = defineEmits(['select'])

const open = ref(false)
const listId = useId()
const rootEl = ref(null)
const toggleEl = ref(null)

const close = (returnFocus = false) => {
  if (!open.value) return
  open.value = false
  if (returnFocus) toggleEl.value?.focus()
}

const select = (item) => {
  close(true)
  emit('select', item.id)
}

// 打開時把焦點移到第一個項目，鍵盤使用者可以直接 Tab 往下
watch(open, async (isOpen) => {
  if (!isOpen) return
  await nextTick() // 等 v-show 移除 display:none，否則 focus 無效
  rootEl.value?.querySelector('.menu-item:not(:disabled)')?.focus()
})

const onPointerDown = (e) => {
  if (rootEl.value && !rootEl.value.contains(e.target)) close()
}
// 焦點移到選單外的元素（Tab 出去）才關閉。relatedTarget 為 null 時不關：
// Safari 點按鈕不會給按鈕焦點，relatedTarget 會是 null，若照樣關閉，點擊還沒生效選單就消失了；
// 點選單外的地方已由 onPointerDown 處理
const onFocusOut = (e) => {
  if (e.relatedTarget && rootEl.value && !rootEl.value.contains(e.relatedTarget)) close()
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  rootEl.value?.addEventListener('focusout', onFocusOut)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  rootEl.value?.removeEventListener('focusout', onFocusOut)
})
</script>

<style scoped>
.app-menu {
  position: relative;
}

.menu-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: var(--tap-min);
  padding: 0 var(--space-3);
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--primary);
  font: inherit;
  font-size: 0.9375rem;
  cursor: pointer;
}

.menu-toggle:hover,
.menu-toggle[aria-expanded='true'] {
  background: var(--primary-container);
}

.menu-list {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  z-index: 200;
  min-width: 220px;
  margin: 0;
  padding: var(--space-1);
  list-style: none;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-2);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: var(--tap-min);
  padding: 0 var(--space-3);
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.menu-item:hover:not(:disabled) {
  background: var(--surface-2);
}

.menu-item:disabled {
  color: var(--text-3);
  cursor: not-allowed;
}

.menu-item.danger {
  color: var(--danger);
}

.menu-icon {
  flex-shrink: 0;
  font-size: 18px;
}

.menu-toggle:focus-visible,
.menu-item:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}
</style>
