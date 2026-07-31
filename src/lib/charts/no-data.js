// src/lib/charts/no-data.js
// 沒有資料時直接在 canvas 上畫一行說明文字（不建立 Chart 實例）。

export const drawNoDataMessage = (ctx, canvas, message) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = 'rgba(241, 237, 224, 0.35)'
  ctx.font = '20px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(message, canvas.width / 2, canvas.height / 2)
}
