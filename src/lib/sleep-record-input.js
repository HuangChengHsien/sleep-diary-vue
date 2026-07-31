// src/lib/sleep-record-input.js
// 手動輸入睡眠紀錄時的時間組裝與合理性檢查。純函式，與 Vue / DOM 無關。

// 入睡耗時的合理上限（分鐘）。
// 入睡耗時圖表（lib/charts/latency.js）與時間軸的「入睡準備」區段（lib/charts/timeline.js）
// 早就用這個門檻過濾資料，這裡把它抽成單一來源，讓輸入檢查與圖表用同一個標準。
export const MAX_PLAUSIBLE_LATENCY_MINUTES = 180

// 由「日期 + 三個 HH:mm」組出三個 Date，並套用跨日修正：
//   入睡早於上床 → 入睡是隔天
//   起床早於入睡（沒有入睡時間則比對上床）→ 起床是隔天
//
// 儲存路徑（useSleepTracking 的新增與編輯）和輸入檢查都呼叫這裡，
// 確保跳出來的提示講的就是實際會存進去的值。
export const buildRecordTimestamps = ({ date, bedtime, sleepTime, wakeTime }) => {
  if (!date) return { bedTimestamp: null, sleepTimestamp: null, wakeTimestamp: null }

  const bed = bedtime ? new Date(`${date}T${bedtime}`) : null
  const sleep = sleepTime ? new Date(`${date}T${sleepTime}`) : null
  const wake = wakeTime ? new Date(`${date}T${wakeTime}`) : null

  if (sleep && bed && sleep < bed) {
    sleep.setDate(sleep.getDate() + 1)
  }

  const anchor = sleep || bed
  if (wake && anchor && wake < anchor) {
    wake.setDate(wake.getDate() + 1)
  }

  return { bedTimestamp: bed, sleepTimestamp: sleep, wakeTimestamp: wake }
}

const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m} 分鐘`
  return m === 0 ? `${h} 小時` : `${h} 小時 ${m} 分`
}

// 檢查輸入是否有明顯不合理之處。
// 回傳要顯示給使用者的確認訊息，沒問題則回傳 null。
//
// 只提示、不阻擋 —— 極端個案確實可能出現超長的入睡耗時，
// 由使用者自己判斷，程式不該替他決定資料是不是真的。
export const checkSleepRecordInput = (formData) => {
  const { bedTimestamp, sleepTimestamp } = buildRecordTimestamps(formData)
  if (!bedTimestamp || !sleepTimestamp) return null

  const latencyMinutes = (sleepTimestamp - bedTimestamp) / 60000
  if (latencyMinutes <= MAX_PLAUSIBLE_LATENCY_MINUTES) return null

  const hhmm = (d) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

  return (
    `上床 ${hhmm(bedTimestamp)}、入睡 ${hhmm(sleepTimestamp)}，` +
    `相隔 ${formatDuration(latencyMinutes)}。\n\n` +
    `常見原因是上下午選錯（例如 22:55 誤選成 12:55）。\n` +
    `確定要照這樣儲存嗎？`
  )
}
