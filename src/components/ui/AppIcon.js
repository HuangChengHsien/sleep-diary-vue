// src/components/ui/AppIcon.js
// 線條圖示（取自 Lucide，ISC 授權：https://lucide.dev/license）。取代介面上的 emoji。
// 用法：<AppIcon name="house" />；大小跟著 font-size（1em），顏色跟著 currentColor。
// 純裝飾圖示預設 aria-hidden；需要被讀出時傳 label。

import { h } from 'vue'

const p = (d) => ['path', { d }]
const circle = (cx, cy, r) => ['circle', { cx, cy, r }]
const rect = (x, y, width, height, rx) => ['rect', { x, y, width, height, rx }]

export const ICONS = {
  house: [
    p('M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8'),
    p(
      'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    ),
  ],
  notebook: [
    p('M2 6h4'),
    p('M2 10h4'),
    p('M2 14h4'),
    p('M2 18h4'),
    rect(4, 2, 16, 20, 2),
    p('M16 2v20'),
  ],
  'graduation-cap': [
    p(
      'M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z',
    ),
    p('M22 10v6'),
    p('M6 12.5V16a6 3 0 0 0 12 0v-3.5'),
  ],
  'user-round': [circle(12, 8, 5), p('M20 21a8 8 0 0 0-16 0')],
  'chevron-left': [p('m15 18-6-6 6-6')],
  'chevron-right': [p('m9 18 6-6-6-6')],
  'arrow-right': [p('M5 12h14'), p('m12 5 7 7-7 7')],
  sun: [
    circle(12, 12, 4),
    p('M12 2v2'),
    p('M12 20v2'),
    p('m4.93 4.93 1.41 1.41'),
    p('m17.66 17.66 1.41 1.41'),
    p('M2 12h2'),
    p('M20 12h2'),
    p('m6.34 17.66-1.41 1.41'),
    p('m19.07 4.93-1.41 1.41'),
  ],
  moon: [p('M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z')],
  monitor: [rect(2, 3, 20, 14, 2), p('M8 21h8'), p('M12 17v4')],
  'log-out': [p('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'), p('m16 17 5-5-5-5'), p('M21 12H9')],
  wind: [
    p('M12.8 19.6A2 2 0 1 0 14 16H2'),
    p('M17.5 8a2.5 2.5 0 1 1 2 4H2'),
    p('M9.8 4.4A2 2 0 1 1 11 8H2'),
  ],
  'clipboard-list': [
    rect(8, 2, 8, 4, 1),
    p('M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'),
    p('M12 11h4'),
    p('M12 16h4'),
    p('M8 11h.01'),
    p('M8 16h.01'),
  ],
  'chart-line': [p('M3 3v16a2 2 0 0 0 2 2h16'), p('m19 9-5 5-4-4-3 3')],
  history: [
    p('M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8'),
    p('M3 3v5h5'),
    p('M12 7v5l4 2'),
  ],
  lightbulb: [
    p(
      'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5',
    ),
    p('M9 18h6'),
    p('M10 22h4'),
  ],
  'refresh-cw': [
    p('M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8'),
    p('M21 3v5h-5'),
    p('M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16'),
    p('M8 16H3v5'),
  ],
  info: [circle(12, 12, 10), p('M12 16v-4'), p('M12 8h.01')],
  'triangle-alert': [
    p('m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3'),
    p('M12 9v4'),
    p('M12 17h.01'),
  ],
  'circle-x': [circle(12, 12, 10), p('m15 9-6 6'), p('m9 9 6 6')],
  'external-link': [
    p('M15 3h6v6'),
    p('M10 14 21 3'),
    p('M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3'),
  ],
  'book-open': [
    p('M12 7v14'),
    p(
      'M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z',
    ),
  ],
  'pencil-line': [
    p('M12 20h9'),
    p(
      'M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z',
    ),
  ],
  check: [p('M20 6 9 17l-5-5')],
  phone: [
    p(
      'M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384',
    ),
  ],
  'heart-handshake': [
    p(
      'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
    ),
    p(
      'M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66',
    ),
    p('m18 15-2-2'),
    p('m15 18-2-2'),
  ],
  clock: [circle(12, 12, 10), p('M12 6v6l4 2')],
  'more-horizontal': [circle(12, 12, 1), circle(19, 12, 1), circle(5, 12, 1)],
  download: [p('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'), p('m7 10 5 5 5-5'), p('M12 15V3')],
  upload: [p('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'), p('m17 8-5-5-5 5'), p('M12 3v12')],
  printer: [
    p('M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2'),
    p('M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6'),
    rect(6, 14, 12, 8, 1),
  ],
  'trash-2': [
    p('M3 6h18'),
    p('M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6'),
    p('M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'),
    p('M10 11v6'),
    p('M14 11v6'),
  ],
  plus: [p('M5 12h14'), p('M12 5v14')],
  bed: [p('M2 4v16'), p('M2 8h18a2 2 0 0 1 2 2v10'), p('M2 17h20'), p('M6 8v9')],
  sunrise: [
    p('M12 2v8'),
    p('m4.93 10.93 1.41 1.41'),
    p('M2 18h2'),
    p('M20 18h2'),
    p('m19.07 10.93-1.41 1.41'),
    p('M22 22H2'),
    p('m8 6 4-4 4 4'),
    p('M16 18a4 4 0 0 0-8 0'),
  ],
  lock: [rect(3, 11, 18, 11, 2), p('M7 11V7a5 5 0 0 1 10 0v4')],
}

export default {
  name: 'AppIcon',
  props: {
    name: { type: String, required: true },
    label: { type: String, default: '' },
    strokeWidth: { type: [Number, String], default: 2 },
  },
  setup(props) {
    return () => {
      const parts = ICONS[props.name] || []
      return h(
        'svg',
        {
          class: 'app-icon',
          xmlns: 'http://www.w3.org/2000/svg',
          viewBox: '0 0 24 24',
          width: '1em',
          height: '1em',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': props.strokeWidth,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          focusable: 'false',
          ...(props.label ? { role: 'img', 'aria-label': props.label } : { 'aria-hidden': 'true' }),
        },
        parts.map(([tag, attrs]) => h(tag, attrs)),
      )
    }
  },
}
