// src/composables/useThemeMenu.js
// 頁首選單（AppMenu）裡的「外觀」三個選項：跟隨系統／淺色／深色。日誌頁與趨勢頁共用。
// 用法：
//   const { themeMenuItems, handleThemeSelect } = useThemeMenu()
//   items = [...自己的項目, ...themeMenuItems.value]
//   onSelect(id) { if (handleThemeSelect(id)) return; ...自己的項目 }

import { computed, ref } from 'vue'
import { getPreference, setPreference } from '@/lib/theme.js'

const OPTIONS = [
  { pref: 'system', label: '外觀：跟隨系統', icon: 'monitor' },
  { pref: 'light', label: '外觀：淺色', icon: 'sun' },
  { pref: 'dark', label: '外觀：深色', icon: 'moon' },
]
const ID_PREFIX = 'theme:'

export function useThemeMenu() {
  const preference = ref(getPreference())

  // 目前選中的那一項用打勾圖示標示（AppMenu 項目只有 icon 與 label）
  const themeMenuItems = computed(() =>
    OPTIONS.map((o) => ({
      id: ID_PREFIX + o.pref,
      label: o.pref === preference.value ? `${o.label}（目前）` : o.label,
      icon: o.pref === preference.value ? 'check' : o.icon,
    })),
  )

  const handleThemeSelect = (id) => {
    if (typeof id !== 'string' || !id.startsWith(ID_PREFIX)) return false
    setPreference(id.slice(ID_PREFIX.length))
    preference.value = getPreference()
    return true
  }

  return { themeMenuItems, handleThemeSelect }
}
