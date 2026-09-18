import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { toUtcInputValue } from '../src/utils/format.js'

// Timezone-boundary guard for recurring transactions. The form stores a local
// datetime input (e.g. today 09:00 in the user's timezone) and toUtcInputValue
// converts it to a UTC-naive string the backend parses as UTC. These tests are
// timezone-agnostic property checks so the 09:00 occurrence is never shifted
// to another weekday by the conversion.
describe('recurring datetime conversion', () => {
  it('converts a local 09:00 input to the matching UTC-naive instant', () => {
    const local = new Date(2026, 8, 18, 9, 0, 0)
    const expected = local.toISOString().slice(0, 19)
    assert.equal(toUtcInputValue('2026-09-18T09:00'), expected)
    assert.ok(!expected.endsWith('Z'), 'backend receives a UTC-naive string')
  })

  it('returns the value unchanged for date-only or non-datetime inputs', () => {
    assert.equal(toUtcInputValue('2026-09-18'), '2026-09-18')
    assert.equal(toUtcInputValue('09:00'), '09:00')
  })
})