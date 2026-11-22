// src/lib/theme.spec.js

import { describe, it, expect } from 'vitest'
import { normalizePreference, resolveTheme } from './theme.js'

describe('theme preference', () => {
  it('未設定或不合法的值一律視為跟隨系統', () => {
    expect(normalizePreference(null)).toBe('system')
    expect(normalizePreference(undefined)).toBe('system')
    expect(normalizePreference('blue')).toBe('system')
  })

  it('明確選擇的 light / dark 有效', () => {
    expect(normalizePreference('light')).toBe('light')
    expect(normalizePreference('dark')).toBe('dark')
  })

  it('跟隨系統時依系統深淺決定', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme(null, true)).toBe('dark')
  })

  it('明確選擇時不理會系統設定', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})
