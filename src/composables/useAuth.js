// src/composables/useAuth.js
// 認證模組已移除 - App 改用本地儲存，不需要帳號登入
// 此檔案保留為空 stub，防止殘留 import 路徑報錯

import { ref, computed } from 'vue'

export function useAuth() {
  const isLoading = ref(false)
  const statusMessage = ref('')
  const statusType = ref('info')
  const user = ref(null)
  const isInitialized = ref(true)
  const isLoggedIn = computed(() => true)  // 本地版永遠視為「已登入」
  const isAnonymous = computed(() => false)
  const displayName = computed(() => '本機用戶')

  const logout = async () => {
    // 本地版無需登出，可選擇性清除 localStorage
    localStorage.removeItem('lastSelectedBabyId')
    localStorage.removeItem('selectedBabyId')
  }

  return {
    isLoading, statusMessage, statusType,
    user, isInitialized, isLoggedIn, isAnonymous, displayName,
    initializeAuth: async () => {},
    showMessage: () => {},
    signInWithGoogle: async () => {},
    signInAnonymouslyHandler: async () => {},
    logout,
    checkAuthAndRedirect: () => {},
    getCurrentUser: () => null,
    waitForAuth: async () => null,
  }
}
