以下依嚴重度列出本規劃的實質風險、遺漏與錯誤。

---

## 高嚴重度

### 1. 分工邊界有依賴斷裂與寫入衝突
- **問題**：新搬入的 4 個共用頁首元件（`AppIcon.js`、`AppMenu.vue`、`DiarySwitcher.vue`、`AppPageHeader.vue`）未列在主 session 的工作項目中；`@media print` 覆寫也只寫在 B 的範圍。
- **為什麼會出事**：
  - 若這 4 個元件歸 A（`src/components/*.vue`），A 與 B 並行時 B 改分析頁頁首會沒有元件可 import、props/slots 介面也無從對齊；B 的列印樣式要隱藏頁首與切換器時也會對不上 class。
  - 若 B 把 `@media print` 的 token 覆寫寫在 `AnalysisView.vue` 的 `<style scoped>`，不但因 scoped attribute 無法正確覆寫 `:root`／`[data-theme="dark"]`，日誌頁選單的「列印」功能也吃不到。
  - A 改造共用元件（例如拆掉 `DiaryView` 的按鈕覆蓋並調整子元件 class）時，可能影響分析頁也引用的共用元件。
- **建議修正**：
  - 主 session 必須先完成並鎖定 4 個共用頁首元件的介面（props/slots/events），再啟動 A、B。
  - `@media print` 的全站淺色 token 覆寫與列印隱藏 helper（如 `.no-print`）統一由主 session 寫進 `tokens.css`。

### 2. 列印方案在 iOS Safari／PWA 高度不可靠，且漏掉 Chart.js 動畫與 CSS 權重陷阱
- **問題**：僅依賴 `beforeprint`／`afterprint` 重畫 Chart.js，並以 `@media print` 覆寫 token。
- **為什麼會出事**：
  - **iOS Safari／PWA 事件不可靠**：iOS 的「分享 → 列印」與 standalone PWA 中，`beforeprint` 常不觸發或晚於列印快照；`afterprint` 在取消列印後也常不觸發，導致深色模式使用者點列印後，圖表永久卡在淺色主題。
  - **Chart.js 動畫導致空白或殘影**：`beforeprint` 是同步回呼，若重畫未強制關閉動畫（`animation: false` 或 `update('none')`），瀏覽器擷取畫面時 canvas 會是空白、畫到一半或仍是深色。
  - **CSS 權重失效**：若深色主題用 `[data-theme="dark"]` 定義，`@media print` 只覆寫 `:root` 會被前者同權重（若順序在後）或更高權重（`html[data-theme="dark"]`）蓋掉。
  - **色塊印不出來**：瀏覽器列印預設關閉背景色，評級圖例色塊與提醒框底色若未加 `print-color-adjust: exact`，印出紙本後色塊會全部變白、圖例失效。
- **建議修正**：
  - 站內「列印」按鈕不要只靠 `beforeprint`：按下時先同步切換為淺色圖表設定並以 `animation: false` 重畫（或將 canvas 輸出成靜態 `<img>` 供 `@media print` 顯示），再呼叫 `window.print()`；`beforeprint`/`afterprint` 僅作為鍵盤 `Cmd/Ctrl+P` 的備援。
  - `@media print` 明確寫 `:root, [data-theme="dark"] { ... }`，並將紙本 `--bg`／`--surface` 覆寫為 `#FFFFFF`（避免整頁印出米黃底耗墨）。
  - 在圖例色塊與提醒框加上 `-webkit-print-color-adjust: exact; print-color-adjust: exact;`。

### 3. 漏拆 `DiaryView` 的 `:deep(button) !important`，且漏設 `color-scheme`
- **問題**：規劃未處理現況盤點提到的 `DiaryView` `:deep(button) !important`，也未在主題切換時設定 CSS `color-scheme`。
- **為什麼會出事**：
  - 不先拆掉 `:deep(button) !important`，子元件改好的 `--danger` 刪除鈕、`--accent` 起床鈕、次要外框按鈕在日誌頁裡會全部被蓋成同一個按鈕色，語意全毀。
  - 沒設 `color-scheme: light` / `color-scheme: dark`，深色模式下原生 `<input type="date">`、`<input type="time">`、`<select>` 下拉清單與捲軸會保持亮白原生樣式，且 WebKit 的黑色日曆／時鐘圖示（`::-webkit-calendar-picker-indicator`）疊在 `--surface-2`（`#2A221B`）上幾乎看不見。
- **建議修正**：
  - 明確要求 A 第一步移除 `DiaryView` 的 `:deep(button) !important`，改由各按鈕套用語意 class。
  - 在 `tokens.css` 的 `:root` 設 `color-scheme: light;`，`[data-theme="dark"]` 設 `color-scheme: dark;`。

### 4. 語意對應表有「同色相撞」、「互動狀態缺失」與「漏項」
- **問題**：
  1. `rgba(241,237,224, .02–.15)` 淡底一律改 `--surface-2`，但輸入框／區塊底色也是 `--surface-2`。
  2. 缺少 `--focus-ring`、`--accent-hover`、`--danger-hover`、`--surface-hover` 與統一的停用狀態規範。
  3. 現況盤點列出的 `.awake` 狀態在對應表中完全遺漏。
- **為什麼會出事**：
  - 原本靠半透明白色疊在 `#1A2340` 上自然變亮的區塊（例如輸入框內按鈕、已用 `--surface-2` 的列表 hover／斑馬紋／選中態），改完後變成 `--surface-2` 疊在 `--surface-2` 上，層次完全消失。
  - 缺少 `--focus-ring` 會導致鍵盤操作無焦點外框（違反 WCAG 2.4.7 / 1.4.11）；A、B 各自用不同 `opacity` 做停用狀態，除了不一致，若套在有底色或 `--text-3` 的元件上，會讓文字難以辨識或元件透出底色。
  - `.awake` 沒指定語意，subagent 很可能隨手歸給 `--warning` 或 `--primary`，破壞語意一致性。
- **建議修正**：
  - 補齊 `--focus-ring`（淺／深皆過 3:1）、`--accent-hover`、`--surface-hover`（或明確定義第三層 `--surface-3`／微調透明疊色）與 `--disabled-opacity` 規範（文字停用改用專用色而非整塊套 opacity）。
  - 在語意表補上 `.awake` 的明確對應。

### 5. 系統主題即時切換時 Chart.js 不同步，且 PWA 狀態列與 `localStorage` 缺防禦
- **問題**：規劃未說明 `theme === 'system'` 時如何監聽系統深淺色變更並重畫圖表；未檢查 `apple-mobile-web-app-status-bar-style`；未規範 `localStorage.theme` 的異常值處理。
- **為什麼會出事**：
  - 使用者選「跟隨系統」且裝置在夜間自動切換深淺色時，CSS token 會即時變動，但若沒有 `matchMedia('(prefers-color-scheme: dark)')` 監聽器驅動 Chart.js 重畫（或 chart 模組在頂層快取了色碼），圖表會留在舊主題變成深底黑字或白底白字。
  - iOS PWA 若 `<meta name="apple-mobile-web-app-status-bar-style">` 設為 `black-translucent` 或 `black`，淺色模式時白色狀態列文字會蓋在 `#FAF7F0` 上看不見；且 manifest 寫死 `#14100C` 在淺色系統啟動會出現「深咖啡閃亮白」。
  - `localStorage` 在受限環境可能拋錯，或存有非 `system|light|dark` 的舊值／髒值，若 inline script 沒包 `try/catch` 與白名單檢查，首屏主題會失效。
- **建議修正**：
  - `theme.js` 監聽 `prefers-color-scheme` 的 `change` 事件，並匯出「實際生效主題（`light | dark`）」的 reactive 狀態或事件，讓圖表頁監聽重畫；確認所有 chart builder 每次重畫都重新呼叫 `readChartTheme()`，不在 module scope 快取顏色。
  - 檢查並統一 `index.html` 的 `apple-mobile-web-app-status-bar-style`（建議 `default` 搭配動態 `meta[name="theme-color"]`）。
  - `index.html` 與 `theme.js` 讀取 `localStorage` 皆加 `try/catch` 與白名單 fallback 至 `'system'`。

---

## 中嚴重度

### 6. 評級「可接受＝`--border-strong`」失去評級語意，且與圖表參考帶語意矛盾
- **問題**：統計卡評級為「良好＝`--success`、可接受＝`--border-strong`、需注意＝`--warning`」，但圖表「入睡耗時理想／可接受」參考帶卻用 `withAlpha(--success, 0.12)` 與 `withAlpha(--warning, 0.12)`。
- **為什麼會出事**：
  - `--border-strong` 同時是次要按鈕外框，用在統計卡左邊框會被看成「無評級／一般邊框」；且對比度僅約 3.5:1（深色）／4.1:1（淺色），若任何地方順手拿它當評級文字色就會違反 WCAG AA 4.5:1。
  - 使用者在統計卡看到「可接受」是灰褐色，在圖表裡看到「可接受」卻是跟「需注意」相同的橘黃色，三級判讀互相打架。另外 `0.12` 透明度在淺色紙本列印時幾乎不可見。
- **建議修正**：
  - 評級文字一律使用 `--text` 或通過 4.5:1 的文字 token，明文禁止 `--border-strong` 用於文字；若「可接受」維持中性色，建議以明確的 badge（`--surface-2`＋`--border-strong` 邊框＋`--text-2` 文字）與普通卡片區隔。
  - 統一卡片與圖表的「可接受」色系（例如參考帶改用 `--border-strong` 或 `--chart-2` 淡色，不要與 `--warning` 混用），並確認列印時的透明度足夠辨識。

### 7. `--primary` 過度複用，重演 `#D4B36A` 一色多用
- **問題**：主要操作（88 處）、上床按鈕（原 `#B09FD4`）、品牌強調、已排除期間全部收斂到 `--primary`／`--primary-container`。
- **為什麼會出事**：日誌頁上「上床」按鈕是核心流程動作，與一般主要操作同色會失去視覺辨識度；「已排除期間」與品牌強調同用 `--primary-container`，使用者容易把排除標記誤看成一般強調區塊。
- **建議修正**：「已排除期間」既定位為「中性標記」，應改用 `--surface-2`＋`--border-strong`（或虛線邊框）＋`--text-2`，把 `--primary-container` 留給品牌／選中強調。

### 8. `--accent` 配 `--accent-container` 對比度壓線，且遮罩內文字未規範
- **問題**：未定義 `--on-*-container` 文字 token；保留 `rgba(0,0,0,.6/.7)` 遮罩但未規範遮罩上的直接文字／關閉鈕。
- **為什麼會出事**：
  - 淺色模式 `#0B7A73` 在 `#E3F3F1` 上對比度約 4.53:1，僅勉強壓在 WCAG AA 4.5:1 邊緣，小字體在非 Retina 螢幕容易掉線。
  - 若有 loading overlay 或圖片燈箱直接把文字／`×` 按鈕放在深色遮罩上，改用 `--text`（`#231C15`）後在淺色模式會變黑字黑底。
- **建議修正**：
  - 明定 `*-container` 上的文字一律使用 `--text`（或單獨定義 `--on-accent-container` 壓深一階）。
  - 在語意表補上「深色遮罩上的直接文字／圖示保留高對比淺色（如 `#FFFFFF`），不隨 `--text` 反轉」。

### 9. 刪除舊函式與舊 CSS 的連帶破壞風險
- **問題**：規劃要刪除 `useDiaryUtils.js` 的 4 個主題相關項目，以及 `App.vue`／`styles/main.css` 的舊樣式區塊。
- **為什麼會出事**：
  - 若 `useDiaryUtils.spec.js` 有 import 或測試這 4 個項目，刪除會讓測試直接報錯而非原本已知的 localStorage 失敗。
  - `App.vue` 與 `styles/main.css` 若在 `:root`／`body.dark-mode` 附近夾帶全域 reset（如 `box-sizing`、`body` 預設 margin／底色／字體），一併刪除會導致全站跑版。
- **建議修正**：刪除前先 grep 所有引用（含 `*.spec.js`）並同步清理測試；確認全域 base reset 完整移入新架構後再刪舊檔。

### 10. 驗收 grep 漏掃 JS／CSS 與 8 碼色碼
- **問題**：驗收指令為 `grep -E '#[0-9a-fA-F]{3,6}|rgba?\(' src/**/*.vue`。
- **為什麼會出事**：圖表的寫死色碼（如 `#f44336`、Material 色、PNG 底色 `#131B33`）都在 `src/lib/charts/*.js` 而非 `.vue` 裡；該指令完全掃不到 `.js`／`.css`，也漏掉 `#RRGGBBAA`（8 碼 hex）與 `hsla?(`。
- **建議修正**：改掃整個 `src/`（排除 `tokens.css` 與 `theme.js`），模式改為 `#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(`。

---

## 低嚴重度

### 11. 醒來次數圖改「系列色」可能撞到偏紅粉的 `--chart-3`
- **問題**：規劃寫「醒來次數圖不用紅色（#f44336）→ 系列色」，但 `--chart-3` 為洋紅 `#D55181`。
- **為什麼會出事**：若該圖表剛好輪到第 3 系列，視覺上仍偏紅，易與「不用紅色表示沒睡好」的品牌規則擦邊。
- **建議修正**：明文指定醒來次數固定使用 `--chart-1` 或 `--chart-2`，不使用 `--chart-3`。

### 12. 深色模式下「下載 PNG」底色與使用情境的落差
- **問題**：下載 PNG 底色改讀 `--surface`。
- **為什麼會出事**：使用者在夜間（深色模式）下載圖表想傳給醫師或列印時，會得到深咖啡底（`#1F1914`）的圖片，在白紙或診間螢幕上反而不易判讀。
- **建議修正**：與醫師確認下載 PNG 是要「跟隨目前主題」還是「比照列印固定輸出淺色白底」。

### 13. 日誌頁列印與 `DiarySwitcher` 的 `babyId` query 未對齊
- **問題**：規劃 4 在日誌頁選單放了「列印」且要求 `DiarySwitcher` 帶 `babyId` query，但規劃 5 未涵蓋日誌頁列印樣式，也未確認單機版路由是否真的使用 `babyId`。
- **為什麼會出事**：日誌頁列印可能把頁首選單、輸入表單按鈕一併印出；若單機版 query key 名稱不同（如 `profileId` 或無 query），切換頁會丟失目前個案。
- **建議修正**：補齊日誌頁列印時的隱藏區塊規範，並先確認本專案既有路由的個案 query key 名稱。
