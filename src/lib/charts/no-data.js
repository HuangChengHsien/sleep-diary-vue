// src/lib/charts/no-data.js
// 沒有資料時直接在 canvas 上畫一行說明文字（不建立 Chart 實例）。

import { CHART_FONT_FAMILY } from './chart-manager.js'
import { readChartTheme } from '@/lib/chart-theme.js'

export const drawNoDataMessage = (ctx, canvas, message, theme = readChartTheme()) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = theme.ink
  ctx.font = `20px ${CHART_FONT_FAMILY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(message, canvas.width / 2, canvas.height / 2)
}
