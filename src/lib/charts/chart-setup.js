// src/lib/charts/chart-setup.js
// Chart.js 的一次性初始化：註冊元件 / 插件並套用預設主題。
//
// 每個 renderXxxChart 模組都從這裡 import { Chart }，而不是直接從 'chart.js'。
// ES module 的求值順序保證這個檔案的 side-effect 會在任何 render 函式被呼叫前跑完，
// 也保證整個 app 只註冊一次。

import {
  Chart,
  LineController,
  BarController,
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

// 日期適配器和 annotation 插件
import 'chartjs-adapter-date-fns'
import annotationPlugin from 'chartjs-plugin-annotation'

import { applyChartTheme } from '@/lib/chart-theme.js'
import { onThemeChange } from '@/lib/theme.js'

Chart.register(
  LineController,
  BarController,
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin,
)

// 依目前主題（淺色／深色）設定 Chart.js 預設色；主題切換時重設。
// 已經畫好的圖要由各頁自己重畫才會換色（見 AnalysisView 的 onThemeChange）。
// 圖表字體跟介面一致，只用裝置內建字體
Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'PingFang TC', 'Noto Sans TC', system-ui, sans-serif"

applyChartTheme()
onThemeChange(() => applyChartTheme())

export { Chart }
