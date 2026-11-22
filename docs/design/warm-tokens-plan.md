# 設計系統改版：暖墨＋金 token、淺色／深色跟隨系統、cbti 頁首（2026-11-22）

## 背景與範圍
免登入睡眠日誌最初從眠序（`~/Projects/sleep-diary-cbti`）分支出來。眠序 2026-11 完成「夜讀燈」設計改版（tokens.css、主題跟隨系統、AppPageHeader）。
本次把**設計系統與頁首**對齊眠序，但配色用睡眠日誌自己的「暖墨＋金」（醫師 2026-11-22 核可）。

**做：** token、主題機制、字型 token、頁首與導覽、所有元件與圖表改用 token、列印在兩種主題下都正確。
**不做：** 每日卡片、小睡新規則、家長／青少年身分（眠序 `diary-daily-cards-plan.md` 的內容）；資料邏輯、計算與報告數字一律不動。
不載入任何 webfont（醫師決定，PR #20）；不加任何追蹤。

## 1. 色票（醫師核可，不得自行更改）

| token | 淺色 | 深色 |
|---|---|---|
| --bg | #FAF7F0 | #14100C |
| --surface | #FFFFFF | #1F1914 |
| --surface-2 | #F1ECE1 | #2A221B |
| --primary | #7B5D12 | #D4B36A |
| --on-primary | #FFFFFF | #231C15 |
| --primary-hover | #634A0D | #E0C482 |
| --primary-container | #F5ECD4 | #382D18 |
| --on-primary-container | #523D0A | #EDE0BE |
| --accent | #0B7A73 | #56C7BA |
| --on-accent | #FFFFFF | #10211F |
| --accent-container | #E3F3F1 | #183330 |
| --text | #231C15 | #EDE7DC |
| --text-2 | #594F44 | #B3A796 |
| --text-3 | #6B6053 | #9F9382 |
| --border | #E5DED0 | #362C23 |
| --border-strong | #877B6A | #7A6D5E |
| --success / -container | #256D3F / #E6F3EA | #6BC68B / #1A3122 |
| --warning / -container | #944F00 / #FCF0DC | #EBB05A / #362612 |
| --danger / -container | #B83227 / #FDECEB | #F28B7E / #3B1E1B |
| --chart-1 / -2 / -3 | #946F14 / #256ABF / #D55181 | #B08E40 / #3987E5 / #D55181 |
| --shadow-1 | 0 1px 2px rgba(35,28,21,.06) | none |
| --shadow-2 | 0 4px 16px rgba(35,28,21,.09) | none |

驗證：所有文字配對過 WCAG AA（4.5:1），--border-strong 過 3:1；圖表三色以 dataviz `validate_palette.js --pairs all` 在 --surface 上淺、深兩種模式全過（CVD 最差 ΔE 9.7）。
不隨主題變的 token 沿用眠序：--radius-*、--space-*、--tap-min；`--font-sans` 為系統字體堆疊；**不定義 --font-display、不用 Huninn**。

## 2. 語意對應規則（元件換色時照這張表）

| 現在 | 改成 | 說明 |
|---|---|---|
| #0A1020 頁面底 | --bg | |
| #131B33 卡片 | --surface ＋ 1px --border | 深色模式不用陰影，靠邊框分層 |
| #1A2340 select／input／dialog | --surface-2（輸入框）、--surface（dialog） | |
| #F1EDE0 主文字 | --text | |
| rgba(241,237,224,.5–.85) | --text-2 | |
| rgba(241,237,224,.2–.45) 文字 | --text-3 | 停用狀態另配 opacity |
| rgba(241,237,224,.02–.15) 邊框／淡底 | --border（邊框）、--surface-2（淡底） | 不要整批取代，依用途判斷 |
| #9FD4D4 青綠主要操作（88 處） | --primary / --on-primary；次要操作用外框 --border-strong ＋ --text | 青綠只留給「起床／下一步」 |
| 起床按鈕、「下一步」導引 | --accent / --on-accent | |
| #B09FD4 上床按鈕 | --primary | |
| #D4B36A 金：品牌強調 | --primary（文字）／--primary-container | |
| #D4B36A 金：提醒、可信度提醒、.status-warning | --warning ＋ --warning-container ＋ 圖示 | 不單靠顏色 |
| #D4B36A 金：已排除期間 | --primary-container / --on-primary-container | 中性標記，不是警告 |
| 刪除、危險 | --danger（外框按鈕或 --danger-container） | **紅色只用於破壞性操作** |
| 成功訊息 | --success / --success-container | |
| rgba(0,0,0,.6/.7) 遮罩 | 保留 rgba 遮罩（兩種主題都適用） | |

### 評級顏色（分析頁統計卡左邊框與圖例）
現況：理想／良好＝綠、可接受＝藍 #6EA8D4、需注意＝金。眠序用 綠／琥珀／紅，但本專案品牌規則「不用紅色表示沒睡好」。
本案：**理想／良好＝--success、可接受＝--border-strong（中性）、需注意＝--warning**。圖例色塊與邊框同色，且一定有文字標籤。

### 圖表
- 所有圖表色改從 token 讀（移植眠序 `src/lib/chart-theme.js` 的 `readChartTheme()`／`withAlpha()`）：系列色＝--chart-1..3 依固定順序；文字＝--text-2；格線＝--border；標籤底＝--surface。
- 參考帶（入睡耗時理想／可接受、每日睡眠建議範圍）：用 `withAlpha(--success, 0.12)`、`withAlpha(--warning, 0.12)`，保留原本的語意。
- 醒來次數圖不用紅色（現在 #f44336）→ 系列色。
- 時間軸：睡眠段＝--chart-1，事件標記＝--chart-3。
- 主題切換時重設 Chart.defaults 並重畫（A 的 chart-manager 重畫前本來就會 destroy）。
- 下載 PNG 的底色改讀 --surface。

## 3. 主題機制（移植眠序）
- `index.html` inline script：首屏前依 `localStorage.theme`（system｜light｜dark，預設 system）設 `<html data-theme>` 與 `meta theme-color`。**刪掉眠序的舊 `darkMode` 相容段**（本專案沒有）。
- `src/lib/theme.js`：照搬，`THEME_COLORS = { light: '#FAF7F0', dark: '#14100C' }`，刪掉 legacy 段。`main.js` 呼叫 `initTheme()`。
- `src/composables/useDiaryUtils.js` 裡沒用到的 `currentTheme/toggleTheme/applyTheme/isDarkMode` 刪除（它用同一個 `theme` key、預設 `light`，從未被呼叫；刪掉避免衝突）。
- 刪除死檔：`src/assets/base.css`、`src/assets/main.css`、`src/assets/styles/dark-mode.css`（確認無 import）；`App.vue` 與 `styles/main.css` 裡兩組互相衝突的 `:root`／`body.dark-mode` 變數刪除，改 import `tokens.css`。
- PWA manifest `theme_color`／`background_color` 只能一個值：維持深色 **#14100C**（啟動畫面多在睡前，避免先閃亮白）；狀態列由 inline script 動態改。
- 主題切換 UI：放在頁首選單（AppMenu）「外觀」：跟隨系統／淺色／深色，目前選項打勾。

## 4. 頁首與導覽（移植眠序）
- 搬 `AppIcon.js`、`AppMenu.vue`、`DiarySwitcher.vue`（記錄／趨勢分段切換，帶 babyId query）。
- `AppPageHeader.vue` 簡化：刪掉 `TAB_ROOTS` 與 history 判斷（本專案只有兩頁），標題用 --font-sans。
- 日誌頁：頁首標題「睡眠日誌」，右側 AppMenu：備份、列印、還原、外觀；下方 DiarySwitcher。原本的「回主控台」按鈕（實際只是導回 /diary）刪除。「資料儲存於本機裝置，完全離線，無需帳號」這行保留（--text-3）。
- 分析頁：頁首標題「趨勢」，右側列印按鈕＋AppMenu（外觀）；下方 DiarySwitcher；個案下拉選單保留在頁首下方。刪除「登出」（單機版無意義）與 📊、🖨️ emoji（介面不用 emoji，改 AppIcon）。
- 不搬 AppTabBar（只有兩頁，用 DiarySwitcher）。
- 分析頁載入文字「正在驗證登入狀態並載入寶寶資料」改為「正在載入個案資料」（單機版沒有登入）。

## 5. 列印
現在列印靠 `filter: invert(1)` 把深色圖表反轉成淺色（AnalysisView.vue 約 1448 行），改成跟隨主題後在淺色模式會反轉成深色，必須改：
- `@media print`：把 token 覆寫成淺色值（列印永遠是淺色紙本），刪掉 invert。
- 圖表：`beforeprint` 時用淺色圖表主題重畫，`afterprint` 恢復目前主題。
- 列印專用的配色（提醒框等）改用淺色 token，報告內容與數字不變。

## 6. 分工
1. **Claude（主 session）**：寫 tokens.css、theme.js、index.html script、chart-theme.js、main.js 接線（基礎，其他人依賴）。
2. **Claude subagent A**：日誌頁＋所有 `src/components/*.vue`（不含分析頁）。
3. **Claude subagent B**：分析頁＋`src/lib/charts/*`＋列印。
4. **agy**：審本規劃；實作完成後審程式碼（diff 內嵌在提示裡）。
5. **Claude（主 session）**：最終審查、跑測試與建置、淺／深兩種主題截圖給醫師確認。

## 7. 驗收
- 兩種主題下所有頁面無寫死色碼殘留（`grep -E '#[0-9a-fA-F]{3,6}|rgba?\(' src/**/*.vue` 只剩遮罩與列印例外並附註解）。
- `npm run build` 成功；vitest 除了既有的 `useDiaryUtils.spec.js` localStorage 問題外全過。
- 淺、深兩種主題的日誌頁（有資料）、分析頁、列印預覽截圖。
- 不改 CHANGELOG（不影響報告數字與判讀）；若評級顏色改變被認為影響判讀，再補。

---

## 8. agy 規劃審查後的修訂（2026-11-22）
審查全文在 `docs/design/warm-tokens-agy-plan-review.md`。以下條目**取代**前面相衝突的段落。

**採納**
1. 共用元件先由主 session 做好並鎖定介面，A、B 才開工：`src/components/ui/AppIcon.js`、`AppMenu.vue`、`DiarySwitcher.vue`（照搬眠序）、`AppPageHeader.vue`（簡化，props：`title`、`meta`；slots：`actions`、預設）、`src/composables/useThemeMenu.js`（`themeMenuItems`、`handleThemeSelect(id)`）。
2. 列印：全站淺色 token 覆寫寫在 `tokens.css` 的 `@media print`（同時覆寫 `:root` 與 `[data-theme='dark']`，紙本底色純白）；`main.css` 提供 `.no-print`、`.print-exact`（`print-color-adjust: exact`）。
   站內「列印」按鈕：先用 `readChartTheme({ forceLight: true })` 以 `animation: false` 同步重畫圖表，再呼叫 `window.print()`；恢復目前主題靠 `afterprint`，再加 `matchMedia('print')` 的 change 當備援。`beforeprint` 只是給 Cmd/Ctrl+P 的備援。
3. 先拆掉 `DiaryView` 的 `:deep(button)`＋`!important` 全域按鈕覆蓋，各按鈕改用語意 class。
4. 焦點外框：`main.css` 全域 `:focus-visible { outline: 2px solid var(--primary) }`，元件不要再自己拿掉 outline。
   hover：在 --surface 上的 hover 用 --surface-2；在 --surface-2 上的 hover 改邊框為 --border-strong（不疊同色）。
   停用：整個控制項 `opacity: 0.45; cursor: not-allowed`，全站一致。
5. 圖表每次重畫都要呼叫 `readChartTheme()`，不准在 module scope 快取顏色；分析頁用 `onThemeChange` 重畫（系統深淺自動切換也會觸發）。
6. 評級與參考帶統一：**理想／良好＝--success、可接受＝中性（--border-strong 邊框／色塊）、需注意＝--warning**。圖表參考帶同一套：理想＝success、可接受＝border-strong，不用 warning 表示可接受。透明度至少 0.18，列印預覽要看得見。`--border-strong` 不得當文字色。
7. 「已排除期間」改為中性標記：--surface-2 ＋ 虛線 --border-strong ＋ --text-2，不用 --primary-container。
8. 任何 *-container 上的一般文字用 --text（狀態文字用對應的 --success/--warning/--danger，已驗過 4.5:1）。深色遮罩 rgba(0,0,0,.6) 上直接放的文字／圖示保留白色。
9. 驗收 grep 改掃整個 `src/`（排除 tokens.css、theme.js、chart-theme.js 的後備值）：`#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(`。
10. 醒來次數圖固定用 --chart-2（不用偏紅的 --chart-3）。
11. 下載圖表 PNG 一律用淺色（同列印），方便傳給醫師或印出。

**已處理／不採納**
- color-scheme：tokens.css 已在兩個主題各自設定。
- localStorage 白名單與 try/catch：inline script 與 theme.js 都已有。
- 刪舊函式：已 grep 含 spec，已清理；`useDiaryUtils.spec.js` 因此恢復可執行。全域 reset 保留在 main.css。
- `apple-mobile-web-app-status-bar-style`：index.html 沒設，維持預設。
- manifest 用深色 #14100C：淺色系統啟動時會先看到深色啟動畫面，接受這個取捨（反過來在半夜閃白更糟）。
- `.sleeping`／`.awake`：模板沒用到，是殘留 CSS，直接刪除。
- 個案 query key：本專案分析頁讀的就是 `babyId`，與 DiarySwitcher 一致。

## 9. 實作後程式碼審查（agy，2026-11-22）
全文在 `docs/design/warm-tokens-agy-code-review.md`。處理結果：
- 已修：列印狀態可能卡在淺色（unmount 還原、例外時重設、iOS 取消列印時靠 focus／visibilitychange 恢復）；載入中／錯誤／未選個案時停用「列印報告」；下載圖片重畫失敗不再下載壞圖；舊版 Safari 的 MediaQueryList 相容（`theme.js` 的 `onMediaQueryChange`）；沒有排除期間時列印不留空標題；`drawNoDataMessage` 預設主題；DiarySwitcher 各自判斷路由。
- 不成立：「forceLight 讀到深色」——tokens.css 的淺色選擇器是 `:root, [data-theme='light']`，深色畫面輸出的列印 PDF 實測為淺色。
- 暫不處理：StatusMessage 的 live region 常駐（原本就是 v-if 插入，另案改善）。
- 錯誤訊息仍用 --danger：品牌規則禁止的是用紅色表示「沒睡好」，系統錯誤提示不在此限。

主 session 驗收另外修正：表格內按鈕在窄螢幕縮小；個案顯示名稱拿掉 emoji；報告標題「睡眠日記」→「睡眠日誌」（品牌名稱）；參考來源拼字 Fundation → Foundation。
驗收：vitest 5 檔 112 個測試全過、build、eslint 通過；淺／深色截圖、系統深淺自動切換時圖表即時重畫、深色畫面下輸出的列印 PDF 為淺色，皆已實測。
