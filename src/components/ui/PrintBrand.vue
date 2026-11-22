<template>
  <!-- 列印專用的品牌頁首或頁尾（螢幕上不顯示）。
       位置 header：單色小屋圖示＋「眠手帳 · by KidnSleep」，放在報告標題上方。
       位置 footer：報告最後一行，告訴拿到紙本的人這份報告從哪裡來、資料存在哪裡。
       圖示用 public/brand/icon-mono-dark.svg（單色深墨、透明底），黑白雷射印表機也印得清楚。 -->
  <div v-if="position === 'header'" class="print-brand print-brand-header" aria-hidden="true">
    <img src="/brand/icon-mono-dark.svg" alt="" class="print-brand-icon" width="28" height="28" />
    <span class="print-brand-name">眠手帳</span>
    <span class="print-brand-by">by KidnSleep</span>
  </div>
  <div v-else class="print-brand print-brand-footer">
    <p>本報告為使用者自行記錄後整理，供門診討論參考，不能取代醫師評估。</p>
    <p>由眠手帳產生 · diary.kidnsleep.com · 免登入，資料只存在使用者自己的裝置</p>
  </div>
</template>

<script setup>
defineProps({
  position: { type: String, default: 'header', validator: (v) => ['header', 'footer'].includes(v) },
})
</script>

<style scoped>
.print-brand {
  display: none;
}

@media print {
  .print-brand-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 10px;
    color: var(--text);
  }

  /* 約 7.5 mm：小屋的 28px 筆畫縮到約 1.5 px，雷射印表機仍不糊 */
  .print-brand-icon {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
  }

  .print-brand-name {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 1px;
  }

  .print-brand-by {
    font-size: 11px;
    color: var(--text-2);
  }

  .print-brand-footer {
    display: block;
    margin: 24px 0 0;
    padding: 8px 0 0;
    border-top: 1px solid var(--border-strong);
    font-size: 10px;
    color: var(--text-2);
    text-align: center;
    break-inside: avoid;
  }

  .print-brand-footer p {
    margin: 0;
  }

  .print-brand-footer p + p {
    margin-top: 2px;
  }
}
</style>
