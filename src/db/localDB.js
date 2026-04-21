// src/db/localDB.js
// IndexedDB 資料庫定義（使用 Dexie）
// 所有資料儲存在本機裝置，不需要網路或帳號

import Dexie from 'dexie'

const db = new Dexie('SleepDiaryDB')

db.version(1).stores({
  // 個案 (寶寶) 資料表
  // 主鍵：id；索引：name, created
  babies: 'id, name, created',

  // 睡眠記錄資料表
  // 主鍵：id；索引：babyId（用於查詢特定個案的記錄）
  sleepRecords: 'id, babyId, date, created',

  // 事件記錄資料表
  // 主鍵：id；索引：babyId, timestamp
  eventRecords: 'id, babyId, timestamp, created',
})

export default db
