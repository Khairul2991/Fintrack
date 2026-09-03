import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  toRawNumber,
  formatNumberDisplay,
  groupThousands,
  caretAfterMapping,
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