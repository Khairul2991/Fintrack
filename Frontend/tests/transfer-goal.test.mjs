import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveTransferSourceGoal } from '../src/utils/transferGoal.js'

describe('resolveTransferSourceGoal', () => {
  it('returns null for non-positive or missing amount', () => {
    assert.equal(resolveTransferSourceGoal({ amount: '', available: 100, goals: [] }), null)
    assert.equal(resolveTransferSourceGoal({ amount: '0', available: 100, goals: [] }), null)
    assert.equal(resolveTransferSourceGoal({ amount: '-50', available: 100, goals: [] }), null)
    assert.equal(resolveTransferSourceGoal({ amount: 'abc', available: 100, goals: [] }), null)
  })

  it('returns null when there are no funded goals', () => {
    const goals = [
      { id: 1, name: 'Vacation', currentAmount: 0 },
      { id: 2, name: 'Emergency', currentAmount: 0 },
    ]
    assert.equal(resolveTransferSourceGoal({ amount: '50', available: 100, goals }), null)
  })

  it('returns null when the transfer is covered by unallocated balance', () => {
    const goals = [{ id: 1, name: 'Vacation', currentAmount: 30 }]
    assert.equal(resolveTransferSourceGoal({ amount: '50', available: 100, goals }), null)
  })

  it('auto-selects the only funded goal when the transfer draws from its allocation', () => {
    const goal = { id: 1, name: 'Vacation', currentAmount: 80 }
    const result = resolveTransferSourceGoal({ amount: '80', available: 100, goals: [goal] })
    assert.equal(result.ambiguous, undefined)
    assert.equal(result.goal.id, 1)
    assert.equal(result.withdrawal, 80)
  })

  it('caps the withdrawal to the goal currentAmount when the transfer is larger', () => {
    const goal = { id: 1, name: 'Vacation', currentAmount: 40 }
    const result = resolveTransferSourceGoal({ amount: '80', available: 100, goals: [goal] })
    assert.equal(result.goal.id, 1)
    assert.equal(result.withdrawal, 40)
  })

  it('returns ambiguous when multiple funded goals exceed the unallocated balance', () => {
    const goals = [
      { id: 1, name: 'Vacation', currentAmount: 30 },
      { id: 2, name: 'Emergency', currentAmount: 20 },
    ]
    const result = resolveTransferSourceGoal({ amount: '70', available: 100, goals })
    assert.equal(result.ambiguous, true)
  })

  it('ignores unfunded goals when counting the number of funded goals', () => {
    const goals = [
      { id: 1, name: 'Funded', currentAmount: 80 },
      { id: 2, name: 'Empty', currentAmount: 0 },
    ]
    const result = resolveTransferSourceGoal({ amount: '90', available: 100, goals })
    assert.equal(result.ambiguous, undefined)
    assert.equal(result.goal.id, 1)
    assert.equal(result.withdrawal, 80)
  })

  it('withdraws the entire goal amount when transferring the full balance with a single funded goal', () => {
    const goal = { id: 1, name: 'Vacation', currentAmount: 80 }
    const result = resolveTransferSourceGoal({ amount: '100', available: 100, goals: [goal] })
    assert.equal(result.goal.id, 1)
    assert.equal(result.withdrawal, 80)
  })

  it('marks the transfer ambiguous when transferring the full balance with multiple funded goals', () => {
    const goals = [
      { id: 1, name: 'Vacation', currentAmount: 50 },
      { id: 2, name: 'Emergency', currentAmount: 50 },
    ]
    const result = resolveTransferSourceGoal({ amount: '100', available: 100, goals })
    assert.equal(result.ambiguous, true)
  })

  it('returns null when the goal has exactly zero currentAmount', () => {
    const goals = [{ id: 1, name: 'Empty', currentAmount: 0 }]
    assert.equal(resolveTransferSourceGoal({ amount: '50', available: 50, goals }), null)
  })
})
