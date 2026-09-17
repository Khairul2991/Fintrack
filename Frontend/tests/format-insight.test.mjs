import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatCurrency,
  formatNumber,
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

  it('applies the numeric display rules to plain numbers', () => {
    assert.equal(formatNumber(25, 'id'), '25')
    assert.equal(formatNumber(25.0, 'id'), '25')
    assert.equal(formatNumber(25.5, 'id'), '25,5')
    assert.equal(formatNumber(25.567, 'id'), '25,57')
    assert.equal(formatNumber(1000, 'id'), '1.000')
    assert.equal(formatNumber(1000.0, 'id'), '1.000')
    assert.equal(formatNumber(1000.5, 'id'), '1.000,5')
    assert.equal(formatNumber(1000.25, 'id'), '1.000,25')
    assert.equal(formatNumber(1000.256, 'id'), '1.000,26')
  })

  it('applies the numeric display rules to percentages without trailing zeros', () => {
    const cases = [
      [0, '0%'],
      [12, '12%'],
      [12.0, '12%'],
      [12.5, '12,5%'],
      [12.25, '12,25%'],
      [12.256, '12,26%'],
      [1000, '1.000%'],
      [1000.0, '1.000%'],
      [1000.5, '1.000,5%'],
      [1000.25, '1.000,25%'],
      [1000.256, '1.000,26%'],
      [5100.0, '5.100%'],
      [5100.5, '5.100,5%'],
      [5100.25, '5.100,25%'],
    ]
    for (const [input, expected] of cases) {
      assert.equal(formatPercent(input, 'id'), expected, `formatPercent(${input}, 'id')`)
    }
  })

  it('never shows a trailing zero for whole currency amounts', () => {
    assert.equal(formatCurrency(1000), `Rp${NBSP}1.000`)
    assert.equal(formatCurrency(1000.5), `Rp${NBSP}1.000,50`)
    assert.equal(formatCurrency(1250.5), `Rp${NBSP}1.250,50`)
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