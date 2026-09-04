import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatCurrency,
  formatPercent,
  formatCount,
  formatInsightMetric,
} from '../src/utils/format.js'

const NBSP = '\u00A0'

describe('format - insight metrics', () => {
  it('formats percentages with the Indonesian comma convention', () => {
    assert.equal(formatPercent(59.82, 'id'), '59,82%')
    assert.equal(formatPercent(49.78, 'id'), '49,78%')
    assert.equal(formatPercent(10, 'id'), '10%')
  })

  it('formats percentages with the English dot convention', () => {
    assert.equal(formatPercent(59.82, 'en'), '59.82%')
    assert.equal(formatPercent(49.78, 'en'), '49.78%')
    assert.equal(formatPercent(10, 'en'), '10%')
  })

  it('formats currency amounts with the Indonesian convention', () => {
    assert.equal(formatCurrency(2009000), `Rp${NBSP}2.009.000`)
    assert.equal(formatCurrency(2991000), `Rp${NBSP}2.991.000`)
    assert.equal(formatCurrency(5000000), `Rp${NBSP}5.000.000`)
  })

  it('formats counts without currency or percent signs', () => {
    assert.equal(formatCount(42, 'id'), '42')
    assert.equal(formatCount(42, 'en'), '42')
  })

  it('dispatches by format: percentage never becomes currency', () => {
    assert.equal(formatInsightMetric(59.82, 'percentage', 'id'), '59,82%')
    assert.equal(formatInsightMetric(49.78, 'percentage', 'id'), '49,78%')
    assert.equal(formatInsightMetric(10, 'percentage', 'id'), '10%')
  })

  it('dispatches by format: currency is formatted as currency', () => {
    assert.equal(formatInsightMetric(2009000, 'currency'), `Rp${NBSP}2.009.000`)
    assert.equal(formatInsightMetric(2991000, 'currency'), `Rp${NBSP}2.991.000`)
  })

  it('dispatches by format: number uses bare grouping', () => {
    assert.equal(formatInsightMetric(1000, 'number', 'id'), '1.000')
  })

  it('returns a placeholder for unknown or missing formats', () => {
    assert.equal(formatInsightMetric(59.82, null), '—')
    assert.equal(formatInsightMetric(59.82, 'unknown'), '—')
    assert.equal(formatInsightMetric(null, 'currency'), '—')
  })
})