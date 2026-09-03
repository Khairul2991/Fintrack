import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  toRawNumber,
  formatNumberDisplay,
  groupThousands,
  caretAfterMapping,
  MAX_FINANCIAL_AMOUNT,
  isAmountOverLimit,
} from '../src/utils/numberFormat.js'

describe('numberFormat - groupThousands', () => {
  it('groups single and small numbers without separator', () => {
    assert.equal(groupThousands('0'), '0')
    assert.equal(groupThousands('100'), '100')
    assert.equal(groupThousands('999'), '999')
  })

  it('groups thousands with a dot separator', () => {
    assert.equal(groupThousands('1000'), '1.000')
    assert.equal(groupThousands('10000'), '10.000')
    assert.equal(groupThousands('100000'), '100.000')
    assert.equal(groupThousands('1000000'), '1.000.000')
    assert.equal(groupThousands('123456789'), '123.456.789')
  })
})

describe('numberFormat - toRawNumber', () => {
  it('strips grouping dots to return the raw numeric digits', () => {
    assert.equal(toRawNumber('1.000'), '1000')
    assert.equal(toRawNumber('10.000'), '10000')
    assert.equal(toRawNumber('1.000.000'), '1000000')
  })

  it('handles empty and blank input', () => {
    assert.equal(toRawNumber(''), '')
    assert.equal(toRawNumber(null), '')
    assert.equal(toRawNumber(undefined), '')
    assert.equal(toRawNumber('   '), '')
  })

  it('returns a leading minus for negative values', () => {
    assert.equal(toRawNumber('-1000'), '-1000')
  })
})

describe('numberFormat - formatNumberDisplay', () => {
  it('formats raw values with dot thousands grouping', () => {
    assert.equal(formatNumberDisplay(''), '')
    assert.equal(formatNumberDisplay('1000'), '1.000')
    assert.equal(formatNumberDisplay('10000'), '10.000')
    assert.equal(formatNumberDisplay('1000000'), '1.000.000')
  })

  it('formats already-grouped input idempotently', () => {
    assert.equal(formatNumberDisplay('1.000'), '1.000')
    assert.equal(formatNumberDisplay('1.000.000'), '1.000.000')
  })
})

describe('numberFormat - caretAfterMapping', () => {
  it('places the caret after the same number of digits in the new display', () => {
    assert.equal(caretAfterMapping('1000', 2, '1.000'), 3)
    assert.equal(caretAfterMapping('1000000', 3, '1.000.000'), 4)
  })

  it('keeps the caret at the start for a leading position', () => {
    assert.equal(caretAfterMapping('1000', 0, '1.000'), 0)
  })
})

describe('numberFormat - isAmountOverLimit', () => {
  const MAX = String(MAX_FINANCIAL_AMOUNT)

  it('accepts normal amounts within the limit', () => {
    assert.equal(isAmountOverLimit('1000'), false)
    assert.equal(isAmountOverLimit('1000000'), false)
  })

  it('accepts exactly the maximum amount', () => {
    assert.equal(isAmountOverLimit(MAX), false)
  })

  it('rejects amounts above the maximum', () => {
    assert.equal(isAmountOverLimit(String(Number(MAX) + 1)), true)
    assert.equal(isAmountOverLimit(`${MAX}0`), true)
    assert.equal(isAmountOverLimit('99999999999999999999999999999999999999'), true)
  })

  it('rejects overlong pasted numbers safely without NaN or Infinity', () => {
    const huge = '9'.repeat(400)
    assert.equal(isAmountOverLimit(huge), true)
    assert.ok(Number.isNaN(isAmountOverLimit(huge)) === false)
    assert.ok(Number.isFinite(Number('9'.repeat(400))) === false)
  })

  it('handles empty and non-numeric input', () => {
    assert.equal(isAmountOverLimit(''), false)
    assert.equal(isAmountOverLimit(null), false)
    assert.equal(isAmountOverLimit(undefined), false)
    assert.equal(isAmountOverLimit('abc'), false)
  })
})