<template>
  <div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ statistics.totalRecords }}</div>
        <div class="stat-label">睡眠記錄總數</div>
        <div class="stat-subtitle">期間: {{ statistics.dateRange }}</div>
      </div>
      <div class="stat-card" :class="getRatingClass('dailySleep')">
        <div class="stat-value">{{ statistics.avgDailySleep }}</div>
        <div class="stat-label">每日平均總睡眠</div>
        <div class="stat-subtitle">小時 (含小睡)</div>
      </div>
      <div class="stat-card" :class="getRatingClass('latency')">
        <div class="stat-value">{{ statistics.avgSleepLatency }}</div>
        <div class="stat-label">平均要多久才會入睡</div>
        <div class="stat-subtitle">分鐘 (僅限夜晚首次就寢)</div>
      </div>
       <div class="stat-card">
          <div class="stat-value">{{ statistics.avgNightBedtime }}</div>
          <div class="stat-label">夜晚平均就寢時間</div>
          <div class="stat-subtitle">基於每次夜晚首次就寢時間計算</div>
        </div>
        <div class="stat-card" :class="getRatingClass('onset')">
          <div class="stat-value">{{ statistics.avgSleepOnset }}</div>
          <div class="stat-label">夜晚平均入睡時間</div>
          <div class="stat-subtitle">基於每次夜晚首次入睡時間計算</div>
        </div>
        <div class="stat-card" :class="getRatingClass('wakeup')">
          <div class="stat-value">{{ statistics.avgWakeUpTime }}</div>
          <div class="stat-label">夜晚平均起床時間</div>
          <div class="stat-subtitle">基於每次夜晚最終醒來時間計算</div>
        </div>
    </div>

    <div class="legend-container">
      <h3>📊 指標邊框顏色說明</h3>
      <p class="legend-intro">卡片左側邊框顏色代表該數據與同齡兒童參考值的比較結果：</p>
      <div class="legend-list">
        <div class="legend-entry"><span class="color-box good"></span><b>理想 / 良好</b></div>
        <div class="legend-entry"><span class="color-box acceptable"></span><b>可接受</b></div>
        <div class="legend-entry"><span class="color-box improvement"></span><b>需注意 / 改善</b></div>
        <div class="legend-entry"><span class="color-box default"></span><b>無評級</b></div>
      </div>
      <div class="legend-source-footer">
        <b>參考來源:</b> 每日總睡眠、入睡耗時 (National Sleep Fundation)・・入睡/起床時間 (Galland et al.)
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
import { 
  getLatencyRating, 
  getTotalSleepRating, 
  getSleepOnsetRating, 
  getSleepOffsetRating 
} from '@/composables/sleep-references.js';
import { calculateAgeInMonths } from '@/composables/useChartAnalysis'; // 假設此函數可單獨導入

const props = defineProps({
  statistics: {
    type: Object,
    required: true,
  },
  baby: {
    type: Object,
    default: null,
  },
});

const getRatingClass = (type) => {
  if (!props.baby?.dob || props.statistics.totalRecords === 0) {
    return 'default';
  }

  const ageInMonths = calculateAgeInMonths(props.baby.dob);
  let rating = '';

  switch (type) {
    case 'dailySleep':
      rating = getTotalSleepRating(parseFloat(props.statistics.avgDailySleep), ageInMonths);
      break;
    case 'latency':
      rating = getLatencyRating(props.statistics.avgSleepLatency);
      break;
    case 'onset':
      rating = getSleepOnsetRating(props.statistics.avgSleepOnset, ageInMonths);
      break;
    case 'wakeup':
      rating = getSleepOffsetRating(props.statistics.avgWakeUpTime, ageInMonths);
      break;
    default:
      return 'default';
  }

  switch (rating) {
    case 'good': return 'rating-good';
    case 'acceptable': return 'rating-acceptable';
    case 'improvement': return 'rating-improvement';
    default: return 'default';
  }
};
</script>

<style scoped>
/* ── Stats grid ──────────────────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #131B33;
  border: 1px solid rgba(241,237,224,0.07);
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  border-left: 4px solid rgba(241,237,224,0.15);
  transition: border-left-color 0.4s ease, transform 0.2s ease;
  font-family: -apple-system, 'PingFang TC', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.3);
}

.stat-card.rating-good      { border-left-color: #50C878; }
.stat-card.rating-acceptable { border-left-color: #D4B36A; }
.stat-card.rating-improvement { border-left-color: #E07070; }
.stat-card.default           { border-left-color: rgba(241,237,224,0.15); }

.stat-value {
  font-size: 2.2em;
  font-weight: 700;
  color: #F1EDE0;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(241,237,224,0.6);
}

.stat-subtitle {
  font-size: 11px;
  color: rgba(241,237,224,0.35);
  margin-top: 5px;
}

/* ── Legend ──────────────────────────────────────── */
.legend-container {
  background: #131B33;
  border: 1px solid rgba(241,237,224,0.07);
  padding: 15px 20px;
  border-radius: 12px;
  margin-bottom: 25px;
}

.legend-intro {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 13px;
  color: rgba(241,237,224,0.5);
}

.legend-list { display: flex; flex-wrap: wrap; gap: 15px; }

.legend-entry {
  color: rgba(241,237,224,0.6);
  display: flex;
  align-items: center;
  font-size: 13px;
}

.color-box {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  margin-right: 8px;
}

.color-box.good        { background: #50C878; }
.color-box.acceptable  { background: #D4B36A; }
.color-box.improvement { background: #E07070; }
.color-box.default     { background: rgba(241,237,224,0.2); border: 1px solid rgba(241,237,224,0.15); }

.legend-source-footer {
  font-size: 12px;
  color: rgba(241,237,224,0.3);
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid rgba(241,237,224,0.07);
  font-style: italic;
}
</style>