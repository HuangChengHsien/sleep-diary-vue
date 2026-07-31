// src/lib/record-exclusion.js
// 「不列入分析」標記的純邏輯。與 Vue / DOM / IndexedDB 無關。
//
// 用途是排除「資料是真的、但不具代表性」的期間 —— 生病、住院、旅行時差、
// 換照顧者的適應期。這種判斷沒有任何自動偵測能取代，只能由使用者決定。
//
// 刻意「不」拿來藏打錯的資料：打錯的紀錄通常只有某個欄位錯，排除掉會連同
// 正確的部分一起丟掉，讓統計往另一個方向錯。那種情況應該去編輯該筆紀錄。

import { normalizeTimestamp, getLocalDateString } from './chart-calc.js'

export const isExcludedFromAnalysis = (record) => record?.excludedFromAnalysis === true

// 分析用的紀錄集合：濾掉被標記的
export const analysableRecords = (records) =>
  (records || []).filter((r) => !isExcludedFromAnalysis(r))

export const excludedRecords = (records) =>
  (records || []).filter((r) => isExcludedFromAnalysis(r))

// 紀錄歸屬的日期字串（YYYY-MM-DD），用於日期區間比對。
// 優先用 date 欄位（手動新增時就是照這個存的），沒有才從入睡／上床時間推。
export const recordDateString = (record) => {
  if (record?.date) return record.date
  const ts = normalizeTimestamp(record?.sleepTimestamp) || normalizeTimestamp(record?.bedTimestamp)
  return ts ? getLocalDateString(ts) : null
}

// 挑出日期落在 [startDate, endDate] 內的紀錄（兩端皆含，字串比較即可，格式固定為 YYYY-MM-DD）。
// 起迄顛倒時自動對調，使用者不必在意先後。
export const recordsInDateRange = (records, startDate, endDate) => {
  if (!startDate || !endDate) return []
  const [from, to] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate]
  return (records || []).filter((r) => {
    const d = recordDateString(r)
    return d !== null && d >= from && d <= to
  })
}
