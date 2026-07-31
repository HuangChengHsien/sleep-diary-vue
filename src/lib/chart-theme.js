// src/lib/chart-theme.js
// Chart.js 的深色 / 淺色主題與套用 helper。
// applyChartTheme 由 useChartAnalysis 在 import 時呼叫一次以設定預設。

import { Chart } from 'chart.js'

export const DARK_THEME = {
  color: 'rgba(241, 237, 224, 0.65)',
  borderColor: 'rgba(241, 237, 224, 0.1)',
  titleColor: '#F1EDE0',
  legendColor: 'rgba(241, 237, 224, 0.65)',
  canvasBg: '#131B33',
}

export const LIGHT_THEME = {
  color: '#444',
  borderColor: 'rgba(0, 0, 0, 0.12)',
  titleColor: '#111',
  legendColor: '#444',
  canvasBg: '#ffffff',
}

export const applyChartTheme = (theme) => {
  Chart.defaults.color = theme.color
  Chart.defaults.borderColor = theme.borderColor
  Chart.defaults.plugins.title.color = theme.titleColor
  Chart.defaults.plugins.legend.labels.color = theme.legendColor
}
