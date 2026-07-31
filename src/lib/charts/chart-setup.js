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

import { DARK_THEME, applyChartTheme } from '@/lib/chart-theme.js'

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

// 全域套用深色主題（預設）
applyChartTheme(DARK_THEME)

export { Chart }
