import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { translateNotification } from '../src/l10n/notifications.js'

const ITEMS = {
  recurringDue: {
    type: 'RECURRING_DUE',
    title: 'Recurring transaction due',
    message: '"Gaji" is due in your Food category.',
  },
  budgetExceeded: {
    type: 'BUDGET_LIMIT',
    title: 'Budget exceeded',
    message: 'You have exceeded your Food budget this month.',
  },
  budgetNear: {
    type: 'BUDGET_LIMIT',
    title: 'Approaching budget limit',
    message: 'Your Transportation budget is nearing its limit.',
  },
  goalDue: {
    type: 'GOAL_DEADLINE',
    title: 'Goal deadline approaching',
    message: 'Your financial goal "Liburan" is due in 5 day(s).',
  },
}

describe('notifications - translateNotification', () => {
  it('translated every generated template to Indonesian when lang=id', () => {
    const recurring = translateNotification(ITEMS.recurringDue, 'id')
    assert.equal(recurring.title, 'Transaksi berulang jatuh tempo')
    assert.equal(recurring.message, '"Gaji" jatuh tempo di kategori Food Anda.')

    const exceeded = translateNotification(ITEMS.budgetExceeded, 'id')
    assert.equal(exceeded.title, 'Anggaran terlampaui')
    assert.equal(exceeded.message, 'Anda telah melebihi anggaran Food bulan ini.')

    const near = translateNotification(ITEMS.budgetNear, 'id')
    assert.equal(near.title, 'Mendekati batas anggaran')
    assert.equal(near.message, 'Anggaran Transportation Anda hampir mencapai batas.')

    const goal = translateNotification(ITEMS.goalDue, 'id')
    assert.equal(goal.title, 'Batas waktu tujuan semakin dekat')
    assert.equal(goal.message, 'Tujuan keuangan Anda "Liburan" akan jatuh tempo dalam 5 hari.')
  })

  it('keeps the original English text when lang=en', () => {
    for (const item of Object.values(ITEMS)) {
      assert.deepEqual(translateNotification(item, 'en'), { title: item.title, message: item.message })
    }
  })

  it('passes unknown messages through unchanged', () => {
    const unknown = {
      type: 'BUDGET_LIMIT',
      title: 'Budget exceeded',
      message: 'Something brand new happened.',
    }
    assert.deepEqual(translateNotification(unknown, 'id'), {
      title: unknown.title,
      message: unknown.message,
    })
  })
})