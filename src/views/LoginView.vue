<template>
  <div class="login-page">
    <!-- 背景光暈 -->
    <div class="bg-glow"></div>

    <div class="login-card">
      <!-- Logo -->
      <div class="login-logo">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 14.5A8.5 8.5 0 119.5 4a7 7 0 0010.5 10.5z"
            stroke="#9FD4D4"
            stroke-width="1.6"
          />
        </svg>
      </div>

      <h1 class="login-title">兒童青少年<br />睡眠健康平台</h1>
      <p class="login-sub">睡眠日誌 · CBT-I 課程 · 評估工具 · 放鬆訓練</p>

      <StatusMessage :message="statusMessage" :type="statusType" />

      <!-- 提示 -->
      <div class="login-hint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" />
          <path
            d="M12 8v4M12 16h.01"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
        請選擇登入方式開始使用
      </div>

      <!-- Google 登入 -->
      <button @click="signInWithGoogle" :disabled="isLoading" class="login-btn google">
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            fill="#9FD4D4"
            d="M21.35 11.1H12.18v2.73h6.51C18.36 17.64 15.19 19.27 12.19 19.27
               8.36 19.27 5 16.25 5 12c0-4.1 3.2-7 7-7 2.1 0 3.7.78 4.9 1.89
               L19.21 4.78C17.38 3.17 14.86 2 12 2 6.42 2 2.03 6.8 2.03 12
               c0 5.05 4.13 10 9.97 10 5.6 0 9.7-3.65 9.7-9.73
               0-.52-.2-.77-.35-1.17z"
          />
        </svg>
        使用 Google 帳號登入
      </button>

      <!-- 匿名登入 -->
      <button @click="signInAnonymouslyHandler" :disabled="isLoading" class="login-btn anon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" />
          <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="1.2" opacity=".6" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
        匿名訪客試用
      </button>

      <!-- 匿名說明 -->
      <div class="anon-explainer">
        <span @click="togglePrivacyInfo" class="anon-toggle">
          什麼是匿名試用？
          <svg width="14" height="14" viewBox="0 0 24 24" style="vertical-align: middle">
            <path
              fill="currentColor"
              d="M13 9h-2V7h2m0 10h-2v-6h2m-1-9A10 10 0 002 12a10 10 0 0010 10
                 10 10 0 0010-10A10 10 0 0012 2z"
            />
          </svg>
        </span>
        <div v-show="showPrivacyInfo" class="anon-info">
          <ul>
            <li><b>無需註冊</b>：不需提供個人資料即可開始使用。</li>
            <li><b>保障隱私</b>：系統不會存取您的姓名或 Email。</li>
            <li><b>資料綁定瀏覽器</b>：清除快取、更換裝置或瀏覽器將<b>無法找回</b>記錄。</li>
            <li>若需跨裝置同步，建議使用 Google 帳號登入。</li>
          </ul>
        </div>
      </div>

      <LoadingSpinner :show="isLoading" message="登入中..." />

      <!-- Footer -->
      <div class="login-footer">
        製作者：黃正憲醫師
        <span class="footer-sep">·</span>
        v3.5
        <span class="footer-sep">·</span>
        2025-10-10
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import StatusMessage from '@/components/StatusMessage.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

export default {
  name: 'LoginView',
  components: { StatusMessage, LoadingSpinner },
  setup() {
    const showPrivacyInfo = ref(false)
    const {
      isLoading,
      statusMessage,
      statusType,
      showMessage,
      signInWithGoogle,
      signInAnonymouslyHandler,
    } = useAuth()

    const togglePrivacyInfo = () => {
      showPrivacyInfo.value = !showPrivacyInfo.value
    }

    return {
      showPrivacyInfo,
      isLoading,
      statusMessage,
      statusType,
      togglePrivacyInfo,
      signInWithGoogle,
      signInAnonymouslyHandler,
    }
  },
}
</script>

<style scoped>
/* ── Page ───────────────────────────────────────── */
.login-page {
  min-height: 100vh;
  background: #0a1020;
  background-image: radial-gradient(ellipse at 50% 10%, rgba(159, 212, 212, 0.09), transparent 55%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  position: relative;
  overflow: hidden;
  font-family: -apple-system, 'PingFang TC', 'Helvetica Neue', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.bg-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(159, 212, 212, 0.05), transparent 70%);
  top: -200px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
}

/* ── Card ───────────────────────────────────────── */
.login-card {
  width: 100%;
  max-width: 420px;
  background: #131b33;
  border: 1px solid rgba(241, 237, 224, 0.08);
  border-radius: 24px;
  padding: 40px 36px 36px;
  position: relative;
  z-index: 1;
}

/* ── Logo ───────────────────────────────────────── */
.login-logo {
  width: 52px;
  height: 52px;
  background: rgba(159, 212, 212, 0.08);
  border: 1px solid rgba(159, 212, 212, 0.18);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

/* ── Title ──────────────────────────────────────── */
.login-title {
  font-size: 22px;
  font-weight: 700;
  color: #f1ede0;
  text-align: center;
  letter-spacing: -0.4px;
  line-height: 1.3;
  margin: 0 0 8px;
}

.login-sub {
  font-size: 12px;
  color: rgba(241, 237, 224, 0.4);
  text-align: center;
  margin: 0 0 28px;
  letter-spacing: 0.5px;
  line-height: 1.5;
}

/* ── Hint ───────────────────────────────────────── */
.login-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(159, 212, 212, 0.07);
  border: 1px solid rgba(159, 212, 212, 0.14);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 12px;
  color: #9fd4d4;
  margin-bottom: 20px;
}

/* ── Buttons ────────────────────────────────────── */
.login-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  border: none;
  margin-bottom: 10px;
  transition:
    opacity 0.2s,
    transform 0.1s;
  letter-spacing: -0.1px;
}

.login-btn:hover:not(:disabled) {
  opacity: 0.88;
  transform: translateY(-1px);
}

.login-btn:active:not(:disabled) {
  transform: translateY(0);
}

.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.login-btn.google {
  background: #1a2340;
  color: #f1ede0;
  border: 1px solid rgba(241, 237, 224, 0.12);
}

.login-btn.anon {
  background: rgba(159, 212, 212, 0.09);
  color: #9fd4d4;
  border: 1px solid rgba(159, 212, 212, 0.2);
}

/* ── Anon explainer ─────────────────────────────── */
.anon-explainer {
  text-align: center;
  margin-top: 4px;
  margin-bottom: 20px;
}

.anon-toggle {
  font-size: 12px;
  color: rgba(159, 212, 212, 0.7);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s;
}

.anon-toggle:hover {
  color: #9fd4d4;
  text-decoration: underline;
}

.anon-info {
  background: rgba(241, 237, 224, 0.04);
  border: 1px solid rgba(241, 237, 224, 0.08);
  border-radius: 10px;
  padding: 14px 16px;
  margin-top: 10px;
  text-align: left;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.anon-info ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.anon-info li {
  font-size: 12px;
  color: rgba(241, 237, 224, 0.55);
  margin-bottom: 8px;
  line-height: 1.55;
  padding-left: 0;
}

.anon-info li:last-child {
  margin-bottom: 0;
}

.anon-info b {
  color: rgba(241, 237, 224, 0.8);
}

/* ── Footer ─────────────────────────────────────── */
.login-footer {
  text-align: center;
  font-size: 11px;
  color: rgba(241, 237, 224, 0.2);
  margin-top: 8px;
  font-family: 'SF Mono', Menlo, monospace;
  letter-spacing: 0.5px;
}

.footer-sep {
  margin: 0 6px;
  opacity: 0.5;
}

/* ── RWD ────────────────────────────────────────── */
@media (max-width: 480px) {
  .login-card {
    padding: 32px 24px 28px;
    border-radius: 20px;
  }

  .login-title {
    font-size: 20px;
  }
}
</style>
