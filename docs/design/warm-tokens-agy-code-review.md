以下僅針對會造成錯誤行為或異常狀態的問題，依嚴重度排序列出：

---

### 高

#### 1. 深色模式下 `readChartTheme({ forceLight: true })` 可能讀到深色並污染快取
- **檔案與位置**：`src/lib/chart-theme.js`（`readChartTheme` 中的 `probe` 與 `cache`）
- **問題**：當畫面在深色模式（`<html data-theme="dark">`）且呼叫 `readChartTheme({ forceLight: true })` 時，程式在 `document.body` 下插入 `<div data-theme="light">` 讀取計算樣式，並將結果寫入 `cache = { key: 'light', theme }`。但在 CSS 中 `:root` 只會匹配 `<html>`，不會匹配 `<div>`。若 `tokens.css` 僅在 `:root` 定義淺色變數、未同時列出 `[data-theme='light']`，該 `probe` 元素不會命中任何淺色規則，反而會從 `<html data-theme="dark">` 繼承**深色** token，並把這組深色快取在 `key: 'light'`。
- **具體會出事的情境**：
  1. 使用者在深色模式下列印報告或點擊「下載圖片」時，圖表會用深色色票繪製（白紙上印出淺灰文字、下載 PNG 變成深色底，違反規劃 §8.2 與 §8.11）。
  2. 接著使用者切換回淺色模式時，`readChartTheme()` 命中 `cache.key === 'light'`，會持續回傳剛才快取的深色色票，導致淺色畫面上的圖表錯色。
- **建議修正**：確認 `tokens.css` 的淺色定義選擇器為 `:root, [data-theme='light']`（而不只是 `:root`）；並補一則單元測試驗證在 `documentElement.dataset.theme = 'dark'` 時 `readChartTheme({ forceLight: true })` 確能讀到淺色 token，避免日後改寫 CSS 選擇器時靜默失效。

#### 2. `printingInLight` 與全域 `Chart.defaults` 在 `afterprint` 漏發或切頁時永久卡死在淺色
- **檔案與位置**：`src/views/AnalysisView.vue`（`printingInLight`、`renderChartForPrint`、`restoreChartAfterPrint`、`onBeforeUnmount`）
- **問題**：`renderChartForPrint()` 會將 `printingInLight` 設為 `true` 並呼叫 `applyChartTheme(light)` 修改**全域** `Chart.defaults`，但恢復只依賴 `afterprint`（與 `matchMedia('print')`）。既沒有在 `onBeforeUnmount` 還原全域 `Chart.defaults`，也未處理 iOS Safari / PWA 常見的 `afterprint` 不觸發或提早觸發。
- **具體會出事的情境**：
  1. 在 iOS Safari / PWA standalone 模式下取消列印或切換 App，若 `afterprint` 與 `matchMedia('print')` 均未觸發，`printingInLight` 會永久停在 `true`：之後使用者切換深淺主題時，`handleThemeChange` 因 `if (printingInLight) return` 不會重畫圖表；切換圖表類型或天數時，dataset 會讀當下深色但全域 `Chart.defaults`（標題、座標軸、圖例）仍卡在淺色，畫面變成半深半淺；連 `downloadChart` 的 `finally` 也會因 `if (!printingInLight)` 跳過恢復。
  2. 若使用者在列印狀態尚未恢復前離開趨勢頁，`onBeforeUnmount` 移除監聽器後全域 `Chart.defaults` 仍停在淺色，回到趨勢頁時座標軸與圖例會錯色，直到手動切主題或重整。
- **建議修正**：
  1. 在 `onBeforeUnmount` 中檢查 `if (printingInLight)`，重設 `printingInLight = false` 並呼叫 `applyChartTheme()` 還原全域預設。
  2. `renderChartForPrint` 內若 `readChartTheme` / `applyChartTheme` 拋錯，於 `catch` 重設 `printingInLight = false`。
  3. 針對 iOS / PWA 取消列印漏發 `afterprint`，可在 `printReport` 呼叫 `window.print()` 後搭配一次性的 `focus`／`visibilitychange` 備援檢查，回到前景時恢復主題。

---

### 中

#### 3. `MediaQueryList.addEventListener` 在舊版 Safari 會直接拋錯並中斷初始化
- **檔案與位置**：
  - `src/views/AnalysisView.vue`（`onMounted` 呼叫 `printMedia?.addEventListener('change', ...)`）
  - `src/lib/theme.js`（`initTheme` 呼叫 `darkQuery()?.addEventListener('change', ...)`）
- **問題**：`AnalysisView.vue` 註解指出 `printMedia` 是為了沒有 `afterprint` 的舊版 Safari 而設的備援，但 Safari < 14 的 `MediaQueryList` 並不支援 `addEventListener` / `removeEventListener`（僅有 `addListener` / `removeListener`），且兩處皆不在 `try/catch` 內。
- **具體會出事的情境**：在 Safari 13 或舊版 iOS WebView 開啟時，`main.js` 的 `initTheme()` 會直接拋出 `TypeError` 導致無法掛載 App；在 `AnalysisView.vue` 的 `onMounted` 中也會在進入資料載入 `try` 之前中斷，頁面永久停在「正在載入數據分析...」。
- **建議修正**：封裝一層能力偵測，支援 `addEventListener` 時用 `addEventListener('change', fn)`，否則改用 `addListener(fn)`（移除時對應 `removeEventListener` / `removeListener`）。

#### 4. 趨勢頁在載入中或錯誤狀態下仍可點擊「列印報告」
- **檔案與位置**：`src/views/AnalysisView.vue`（`AppPageHeader` `#actions` 內的「列印報告」按鈕）
- **問題**：按鈕移至 `AppPageHeader` 後移出了原本的 `v-else class="main-content"`，在 `isLoading` 或 `errorMessage` 狀態下仍可點擊。
- **具體會出事的情境**：載入中或錯誤時點擊「列印報告」，會印出載入中動畫或錯誤畫面，並同時執行 `renderChartForPrint()` 將 `printingInLight` 設為 `true` 及覆寫全域 `Chart.defaults`。
- **建議修正**：按鈕加上 `:disabled="isLoading || !!errorMessage || !selectedBabyId"`（或以 `v-if="!isLoading && !errorMessage"` 控制顯示）。

#### 5. `downloadChart` 透過 `rerenderChart` 重畫時，錯誤被吞掉會下載到壞圖
- **檔案與位置**：`src/views/AnalysisView.vue`（`downloadChart` 與 `rerenderChart`）
- **問題**：`downloadChart` 呼叫 `rerenderChart({ theme: light, animate: false })` 以淺色同步重畫，但 `rerenderChart` 內部自行 `try/catch` 吞掉例外不往外拋。
- **具體會出事的情境**：若淺色重畫失敗，`downloadChart` 仍會繼續將舊的深色 canvas（或已 destroy 的空白 canvas）貼到白底上並下載 PNG，使用者拿到壞圖卻沒有任何失敗提示。
- **建議修正**：`downloadChart` 內直接呼叫 `withRenderOptions({ theme: light, animate: false }, renderCurrentChart)`，讓重畫例外進入外層 `catch` 並中止下載（`finally` 仍負責恢復目前主題）。

---

### 低

#### 6. 無排除期間時，列印日誌頁會出現孤立的「不列入分析的期間」標題
- **檔案與位置**：`src/components/SleepRecordsTable.vue`（`.exclude-range` 區塊）
- **問題**：`.exclude-range-controls` 與 `.exclude-range-hint` 加了 `no-print`，但外層 `.exclude-range` 與 `.exclude-range-label` 沒有條件隱藏。
- **具體會出事的情境**：個案沒有設定任何排除期間（`excludedPeriodList.length === 0`）時，列印日誌頁會在表格上方印出一行底下完全空白的「不列入分析的期間」。
- **建議修正**：在 `.exclude-range` 加上 `:class="{ 'no-print': excludedPeriodList.length === 0 }"`。

#### 7. `drawNoDataMessage` 缺少預設 `theme` 防呆
- **檔案與位置**：`src/lib/charts/no-data.js`（`drawNoDataMessage`）
- **問題**：函式簽名改為 `(ctx, canvas, message, theme)` 並直接存取 `theme.ink`。目前 7 個圖表呼叫端皆有傳入，但若任何既有測試或新呼叫端省略第 4 參數會直接拋出 `TypeError`。
- **建議修正**：加上預設值 `theme = readChartTheme()`。

#### 8. `DiarySwitcher` 用 `!isDiary` 推斷「趨勢」為當前頁
- **檔案與位置**：`src/components/ui/DiarySwitcher.vue`（`isDiary` 與第二個 `<RouterLink>` 的 `active` / `aria-current`）
- **問題**：`isDiary` 判斷 `route.path === '/diary'`，而「趨勢」分頁直接綁 `!isDiary`。
- **具體會出事的情境**：若 `/` 路由未重導向至 `/diary`（或日後新增其他路由），停留於非 `/diary` 路徑時「趨勢」會被誤標為 `active` 與 `aria-current="page"`。
- **建議修正**：另建 `isAnalysis = computed(() => route.path === '/analysis')`，兩個分頁各自對應自己的狀態。

#### 9. `StatusMessage` 的 `role="status"` 與訊息同時掛載，部分螢幕報讀器可能漏報
- **檔案與位置**：`src/views/DiaryView.vue`（`<StatusMessage v-if="statusMessage" ... />`）與 `src/components/StatusMessage.vue`
- **問題**：外層與元件內都使用 `v-if` 動態插入帶有 `role="status"` 的節點。
- **具體會出事的情境**：`info` / `success` 類型使用 `role="status"` 時，部分螢幕報讀器（如 VoiceOver、NVDA）只會可靠朗讀「已存在於 DOM 內的 live region 內容變更」，同時插入節點可能不會觸發播報。
- **建議修正**：移除 `DiaryView.vue` 的 `v-if="statusMessage"`，改讓 live region 外框常駐於 DOM，僅依 `message` 切換內部內容顯示。

---

### 補充確認（重點 4 與 5）
- **資料邏輯與數字**：已逐檔比對 `useDiaryUtils.js`、`src/lib/charts/*.js`、`AnalysisView.vue`、`DiaryView.vue`，所有統計計算、過濾條件、排除邏輯與顯示數值皆未改動。
- **移除項目殘留**：`goToDashboard`、`logout`、`currentBabyDisplay`、`getIcon` 及 `useDiaryUtils` 的舊主題函式皆已同步從模板與 script 清除，無殘留呼叫。
