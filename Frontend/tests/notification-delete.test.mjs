import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startBackend, stopBackend, resetDb, isoDate } from './helpers.mjs'
import { ApiError } from '../src/services/api.js'
import {
  deleteNotification,
  generateNotifications,
  listNotifications,
} from '../src/services/notificationApi.js'
import {
  createRecurringTransaction,
  deleteRecurringTransaction,
} from '../src/services/recurringTransactionApi.js'
import { listCategories } from '../src/services/categoryApi.js'

before(async () => {
  await startBackend()
})

after(() => {
  stopBackend()
})

describe('notification delete', () => {
  before(async () => {
    await resetDb()
  })

  async function createDueRecurring(description) {
    const now = new Date()
    const start = isoDate(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate())
    const food = (await listCategories()).data.find((c) => c.name === 'Food')
    const res = await createRecurringTransaction({
      description,
      amount: '50000',
      type: 'EXPENSE',
      categoryId: food.id,
      frequency: 'WEEKLY',
      startDate: start,
    })
    return res.data
  }

  it('deletes a generated notification and removes it from the list', async () => {
    const recurring = await createDueRecurring('FE delete rent')
    await generateNotifications()

    const list = await listNotifications()
    const note = list.data.items.find((n) => n.message.includes('FE delete rent'))
    assert.ok(note, 'expected a generated notification to delete')

    await deleteNotification(note.id)

    const after = await listNotifications()
    assert.ok(
      !after.data.items.some((n) => n.id === note.id),
      'deleted notification must not appear in the list anymore',
    )

    await deleteRecurringTransaction(recurring.id)
  })

  it('rejects deleting a nonexistent notification with a 404', async () => {
    await assert.rejects(() => deleteNotification(999999), (error) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.status, 404)
      return true
    })
  })
})