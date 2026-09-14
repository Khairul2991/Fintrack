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

  it('auto-selects the only funded goal and takes only the shortfall', () => {
    const goal = { id: 1, name: 'Vacation', currentAmount: 80 }
    const result = resolveTransferSourceGoal({ amount: '80', available: 100, goals: [goal] })
    assert.equal(result.ambiguous, undefined)
    assert.equal(result.goal.id, 1)
    assert.equal(result.unallocated, 20)
    assert.equal(result.shortfall, 60)
    assert.equal(result.withdrawal, 60)
  })

  it('takes only the shortfall even when the transfer is larger than the goal', () => {
    const goal = { id: 1, name: 'Vacation', currentAmount: 40 }
    const result = resolveTransferSourceGoal({ amount: '90', available: 100, goals: [goal] })
    assert.equal(result.ambiguous, undefined)
    assert.equal(result.goal.id, 1)
    assert.equal(result.unallocated, 60)
    assert.equal(result.withdrawal, 30)
  })

  it('caps the shortfall to the goal currentAmount', () => {
    const goal = { id: 1, name: 'Vacation', currentAmount: 40 }
    const result = resolveTransferSourceGoal({ amount: '120', available: 100, goals: [goal] })
    assert.equal(result.goal.id, 1)
    assert.equal(result.withdrawal, 40)
  })

  it('returns ambiguous when multiple funded goals contribute to the shortfall', () => {
    const goals = [
      { id: 1, name: 'Vacation', currentAmount: 30 },
      { id: 2, name: 'Emergency', currentAmount: 20 },
    ]
    const result = resolveTransferSourceGoal({ amount: '70', available: 100, goals })
    assert.equal(result.ambiguous, true)
    assert.equal(result.unallocated, 50)
    assert.equal(result.shortfall, 20)
  })

  it('ignores unfunded goals when counting the number of funded goals', () => {
    const goals = [
      { id: 1, name: 'Funded', currentAmount: 80 },
      { id: 2, name: 'Empty', currentAmount: 0 },
    ]
    const result = resolveTransferSourceGoal({ amount: '90', available: 100, goals })
    assert.equal(result.ambiguous, undefined)
    assert.equal(result.goal.id, 1)
    assert.equal(result.withdrawal, 70)
  })

  it('deducts only the shortfall from a partially funded account', () => {
    const goal = { id: 1, name: 'Vacation', currentAmount: 25 }
    const result = resolveTransferSourceGoal({ amount: '20', available: 40, goals: [goal] })
    assert.equal(result.goal.id, 1)
    assert.equal(result.unallocated, 15)
    assert.equal(result.shortfall, 5)
    assert.equal(result.withdrawal, 5)
  })

  it('returns null when the transfer uses only free balance', () => {
    const goal = { id: 1, name: 'Vacation', currentAmount: 25 }
    assert.equal(resolveTransferSourceGoal({ amount: '15', available: 40, goals: [goal] }), null)
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
