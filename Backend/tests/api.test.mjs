import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startApp, stopApp, request, resetDb, getCategories, isoDate, currentKeys } from './helpers.mjs'

let state

before(async () => {
  state = await startApp()
})

after(async () => {
  await stopApp(state.server)
})

describe('Categories API', () => {
  before(async () => {
    await resetDb(state.base, state.testUserId)
  })

  it('lists 10 baseline categories sorted by name asc', async () => {
    const categories = await getCategories(state.base, state.testUserId)
    assert.equal(categories.length, 10)
    const names = categories.map((c) => c.name)
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)))
  })

  it('creates a category and returns 201 with the record', async () => {
    const res = await request(state.base, 'POST', '/categories', {
      name: 'Travel',
      icon: '✈️',
      color: '#0ea5e9',
    }, { userId: state.testUserId })
    assert.equal(res.status, 201)
    assert.equal(res.data.success, true)
    assert.equal(res.data.data.name, 'Travel')
    assert.ok(Number.isInteger(res.data.data.id))
  })

  it('rejects a duplicate category name with 409', async () => {
    const res = await request(state.base, 'POST', '/categories', SEED_PAYLOAD('Food'), { userId: state.testUserId })
    assert.equal(res.status, 409)
    assert.match(res.data.message, /already exists/)
  })

  it('rejects a create without a name with 400', async () => {
    const res = await request(state.base, 'POST', '/categories', { icon: '🧪', color: '#111111' }, { userId: state.testUserId })
    assert.equal(res.status, 400)
    assert.equal(res.data.message, 'Name is required.')
  })

  it('rejects an invalid hex color with 400', async () => {
    const res = await request(state.base, 'POST', '/categories', {
      name: 'Travel2',
      icon: '✈️',
      color: 'red',
    }, { userId: state.testUserId })
    assert.equal(res.status, 400)
    assert.equal(res.data.message, 'Color must be a hex value like #f59e0b.')
  })

  it('rejects a name longer than 50 chars with 400', async () => {
    const res = await request(state.base, 'POST', '/categories', {
      name: 'A'.repeat(51),
      icon: '🧪',
      color: '#111111',
    }, { userId: state.testUserId })
    assert.equal(res.status, 400)
    assert.equal(res.data.message, 'Name must be at most 50 characters.')
  })

  it('gets an existing category by id', async () => {
    const categories = await getCategories(state.base, state.testUserId)
    const res = await request(state.base, 'GET', `/categories/${categories[0].id}`, undefined, { userId: state.testUserId })
    assert.equal(res.status, 200)
    assert.equal(res.data.data.id, categories[0].id)
  })

  it('returns 404 for a nonexistent category', async () => {
    const res = await request(state.base, 'GET', '/categories/999999', undefined, { userId: state.testUserId })
    assert.equal(res.status, 404)
    assert.equal(res.data.message, 'Category not found.')
  })

  it('updates a category', async () => {
    const created = await request(state.base, 'POST', '/categories', SEED_PAYLOAD('TempCat'), { userId: state.testUserId })
    const res = await request(state.base, 'PUT', `/categories/${created.data.data.id}`, {
      name: 'TempCat2',
      icon: '🔄',
      color: '#000000',
    }, { userId: state.testUserId })
    assert.equal(res.status, 200)
    assert.equal(res.data.data.name, 'TempCat2')
    assert.equal(res.data.data.color, '#000000')
  })

  it('returns 404 when updating a nonexistent category', async () => {
    const res = await request(state.base, 'PUT', '/categories/999999', SEED_PAYLOAD('X'), { userId: state.testUserId })
    assert.equal(res.status, 404)
  })

  it('deletes an unused category and returns its id', async () => {
    const created = await request(state.base, 'POST', '/categories', SEED_PAYLOAD('ToDelete'), { userId: state.testUserId })
    const res = await request(state.base, 'DELETE', `/categories/${created.data.data.id}`, undefined, { userId: state.testUserId })
    assert.equal(res.status, 200)
    assert.equal(res.data.data.id, created.data.data.id)
  })

  it('blocks deleting a category used by a transaction with 409', async () => {
    const category = (await request(state.base, 'POST', '/categories', SEED_PAYLOAD('InUse'), { userId: state.testUserId })).data.data
    await request(state.base, 'POST', '/transactions', {
      description: 'trip',
      amount: '1000',
      type: 'EXPENSE',
      categoryId: category.id,
      date: '2026-08-15',
    }, { userId: state.testUserId })
    const res = await request(state.base, 'DELETE', `/categories/${category.id}`, undefined, { userId: state.testUserId })
    assert.equal(res.status, 409)
    assert.equal(res.data.message, 'This category cannot be deleted because it is currently in use.')
  })

  it('blocks deleting a category used by a budget with 409', async () => {
    const category = (await request(state.base, 'POST', '/categories', SEED_PAYLOAD('InUse2'), { userId: state.testUserId })).data.data
    const { curM, curY } = currentKeys()
    await request(state.base, 'POST', '/budgets', {
      categoryId: category.id,
      month: curM,
      year: curY,
      amount: '50000',
    }, { userId: state.testUserId })
    const res = await request(state.base, 'DELETE', `/categories/${category.id}`, undefined, { userId: state.testUserId })
    assert.equal(res.status, 409)
  })
})

describe('Transactions API', () => {
  before(async () => {
    await resetDb(state.base, state.testUserId)
  })

  it('creates a transaction and returns 201 with stringified amount', async () => {
    const cat = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const res = await request(state.base, 'POST', '/transactions', {
      description: 'Groceries',
      amount: '25000',
      type: 'EXPENSE',
      categoryId: cat.id,
      date: '2026-08-10',
    }, { userId: state.testUserId })
    assert.equal(res.status, 201)
    assert.equal(res.data.data.description, 'Groceries')
    assert.equal(res.data.data.amount, '25000')
    assert.equal(res.data.data.type, 'EXPENSE')
  })

  it('stores a trimmed note and null when blank', async () => {
    const cat = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const withNote = await request(state.base, 'POST', '/transactions', {
      description: 'Lunch',
      amount: '15000',
      type: 'EXPENSE',
      categoryId: cat.id,
      date: '2026-08-11',
      note: '  at the canteen  ',
    }, { userId: state.testUserId })
    assert.equal(withNote.data.data.note, 'at the canteen')
    const blank = await request(state.base, 'POST', '/transactions', {
      description: 'Snack',
      amount: '1000',
      type: 'EXPENSE',
      categoryId: cat.id,
      date: '2026-08-12',
      note: '   ',
    }, { userId: state.testUserId })
    assert.equal(blank.data.data.note, null)
  })

  it('validates required fields and value ranges', async () => {
    const res = await request(state.base, 'POST', '/transactions', {}, { userId: state.testUserId })
    assert.equal(res.status, 400)
    assert.equal(res.data.message, 'Description is required.')

    const cat = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const cases = [
      [{ description: 'x', amount: '0', type: 'EXPENSE', categoryId: cat.id, date: '2026-08-01' }, 'Amount must be greater than 0.'],
      [{ description: 'x', amount: '-5', type: 'EXPENSE', categoryId: cat.id, date: '2026-08-01' }, 'Amount must be a positive number.'],
      [{ description: 'x', amount: 'abc', type: 'EXPENSE', categoryId: cat.id, date: '2026-08-01' }, 'Amount must be a positive number.'],
      [{ description: 'x', amount: '10', type: 'TRANSFER', categoryId: cat.id, date: '2026-08-01' }, 'Type must be INCOME or EXPENSE.'],
      [{ description: 'x', amount: '10', type: 'EXPENSE', categoryId: cat.id, date: '2026-13-40' }, 'Invalid date. Use YYYY-MM-DD.'],
      [{ description: 'x', amount: '10', type: 'EXPENSE', categoryId: 999999, date: '2026-08-01' }, 'Category not found.'],
      [{ description: 'x', amount: '10', type: 'EXPENSE', categoryId: 'z', date: '2026-08-01' }, 'categoryId must be an integer.'],
    ]
    for (const [payload, message] of cases) {
      const r = await request(state.base, 'POST', '/transactions', payload, { userId: state.testUserId })
      assert.equal(r.status, 400, JSON.stringify(payload))
      assert.equal(r.data.message, message, JSON.stringify(payload))
    }
  })

  it('rejects a note longer than 500 chars', async () => {
    const cat = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const res = await request(state.base, 'POST', '/transactions', {
      description: 'x',
      amount: '10',
      type: 'EXPENSE',
      categoryId: cat.id,
      date: '2026-08-01',
      note: 'n'.repeat(501),
    }, { userId: state.testUserId })
    assert.equal(res.status, 400)
    assert.equal(res.data.message, 'Note must be at most 500 characters.')
  })

  it('filters by type, search, category, and date range', async () => {
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const salary = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Salary')
    await request(state.base, 'POST', '/transactions', {
      description: 'Market run',
      amount: '40000',
      type: 'EXPENSE',
      categoryId: food.id,
      date: '2026-08-15',
    }, { userId: state.testUserId })
    await request(state.base, 'POST', '/transactions', {
      description: 'Salary deposit',
      amount: '8000000',
      type: 'INCOME',
      categoryId: salary.id,
      date: '2026-08-20',
    }, { userId: state.testUserId })

    const incomeOnly = await request(state.base, 'GET', '/transactions?type=INCOME', undefined, { userId: state.testUserId })
    assert.equal(incomeOnly.data.data.length, 1)
    assert.equal(incomeOnly.data.data[0].type, 'INCOME')

    const search = await request(state.base, 'GET', '/transactions?search=market', undefined, { userId: state.testUserId })
    assert.equal(search.data.data.length, 1)
    assert.equal(search.data.data[0].description, 'Market run')

    const byCat = await request(state.base, 'GET', `/transactions?categoryId=${food.id}`, undefined, { userId: state.testUserId })
    assert.equal(byCat.data.data.length, 4)
    assert.ok(byCat.data.data.every((t) => t.category.id === food.id))

    const ranged = await request(
      state.base,
      'GET',
      '/transactions?startDate=2026-08-16&endDate=2026-08-20',
      undefined,
      { userId: state.testUserId },
    )
    assert.equal(ranged.data.data.length, 1)
    assert.equal(ranged.data.data[0].description, 'Salary deposit')
  })

  it('sorts by amount asc/desc and rejects invalid sort keys', async () => {
    const asc = await request(state.base, 'GET', '/transactions?sortBy=amount&sortOrder=asc', undefined, { userId: state.testUserId })
    const amountsAsc = asc.data.data.map((t) => Number(t.amount))
    assert.deepEqual(amountsAsc, [...amountsAsc].sort((a, b) => a - b))

    const desc = await request(state.base, 'GET', '/transactions?sortBy=amount&sortOrder=desc', undefined, { userId: state.testUserId })
    const amountsDesc = desc.data.data.map((t) => Number(t.amount))
    assert.deepEqual(amountsDesc, [...amountsDesc].sort((a, b) => b - a))

    const badSort = await request(state.base, 'GET', '/transactions?sortBy=category', undefined, { userId: state.testUserId })
    assert.equal(badSort.status, 400)
    assert.equal(badSort.data.message, 'sortBy must be date or amount.')

    const badOrder = await request(state.base, 'GET', '/transactions?sortOrder=sideways', undefined, { userId: state.testUserId })
    assert.equal(badOrder.status, 400)
    assert.equal(badOrder.data.message, 'sortOrder must be asc or desc.')
  })

  it('paginates with correct meta', async () => {
    const total = 5
    const res = await request(state.base, 'GET', '/transactions?page=1&limit=2', undefined, { userId: state.testUserId })
    assert.equal(res.data.data.length, 2)
    assert.equal(res.data.meta.total, total)
    assert.equal(res.data.meta.totalPages, 3)
    assert.equal(res.data.meta.page, 1)

    const page3 = await request(state.base, 'GET', '/transactions?page=3&limit=2', undefined, { userId: state.testUserId })
    assert.equal(page3.data.data.length, 1)
    assert.equal(page3.data.meta.page, 3)
  })

  it('rejects invalid pagination parameters', async () => {
    const badPage = await request(state.base, 'GET', '/transactions?page=0', undefined, { userId: state.testUserId })
    assert.equal(badPage.status, 400)
    assert.equal(badPage.data.message, 'page must be at least 1.')

    const badLimit = await request(state.base, 'GET', '/transactions?limit=101', undefined, { userId: state.testUserId })
    assert.equal(badLimit.status, 400)
    assert.equal(badLimit.data.message, 'limit must be at most 100.')
  })

  it('gets, updates, and deletes a transaction', async () => {
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const created = await request(state.base, 'POST', '/transactions', {
      description: 'Coffee',
      amount: '12000',
      type: 'EXPENSE',
      categoryId: food.id,
      date: '2026-08-25',
    }, { userId: state.testUserId })
    const id = created.data.data.id

    const got = await request(state.base, 'GET', `/transactions/${id}`, undefined, { userId: state.testUserId })
    assert.equal(got.status, 200)
    assert.equal(got.data.data.description, 'Coffee')

    const updated = await request(state.base, 'PUT', `/transactions/${id}`, {
      description: 'Coffee beans',
      amount: '20000',
      type: 'EXPENSE',
      categoryId: food.id,
      date: '2026-08-26',
    }, { userId: state.testUserId })
    assert.equal(updated.status, 200)
    assert.equal(updated.data.data.amount, '20000')

    const deleted = await request(state.base, 'DELETE', `/transactions/${id}`, undefined, { userId: state.testUserId })
    assert.equal(deleted.status, 200)
    assert.equal(deleted.data.data.id, id)

    const missing = await request(state.base, 'GET', `/transactions/${id}`, undefined, { userId: state.testUserId })
    assert.equal(missing.status, 404)
    assert.equal(missing.data.message, 'Transaction not found.')
  })

  it('returns 404 when updating a nonexistent transaction', async () => {
    const res = await request(state.base, 'PUT', '/transactions/999999', {
      description: 'x',
      amount: '1',
      type: 'EXPENSE',
      categoryId: 1,
      date: '2026-08-01',
    }, { userId: state.testUserId })
    assert.equal(res.status, 404)
  })
})

describe('Budgets API', () => {
  before(async () => {
    await resetDb(state.base, state.testUserId)
  })

  const { curM, curY } = currentKeys()

  it('creates a budget and returns 201', async () => {
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const res = await request(state.base, 'POST', '/budgets', {
      categoryId: food.id,
      month: curM,
      year: curY,
      amount: '100000',
    }, { userId: state.testUserId })
    assert.equal(res.status, 201)
    assert.equal(res.data.data.amount, '100000')
  })

  it('rejects a duplicate budget for the same category and period with 409', async () => {
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const res = await request(state.base, 'POST', '/budgets', {
      categoryId: food.id,
      month: curM,
      year: curY,
      amount: '100000',
    }, { userId: state.testUserId })
    assert.equal(res.status, 409)
    assert.match(res.data.message, /already exists/)
  })

  it('validates month, year, and amount', async () => {
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const cases = [
      [{ categoryId: food.id, month: 13, year: curY, amount: '100' }, 'month must be at most 12.'],
      [{ categoryId: food.id, month: 0, year: curY, amount: '100' }, 'month must be at least 1.'],
      [{ categoryId: food.id, month: curM, year: 1999, amount: '100' }, 'year must be at least 2000.'],
      [{ categoryId: food.id, month: curM, year: 2101, amount: '100' }, 'year must be at most 2100.'],
      [{ categoryId: food.id, month: curM, year: curY, amount: '-5' }, 'Amount must be a positive number.'],
      [{ categoryId: 999999, month: curM, year: curY, amount: '100' }, 'Category not found.'],
    ]
    for (const [payload, message] of cases) {
      const r = await request(state.base, 'POST', '/budgets', payload, { userId: state.testUserId })
      assert.equal(r.status, 400, JSON.stringify(payload))
      assert.equal(r.data.message, message, JSON.stringify(payload))
    }
  })

  it('computes On Track / Near Limit / Over Budget progress from real spending', async () => {
    const transport = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Transport')
    const created = await request(state.base, 'POST', '/budgets', {
      categoryId: transport.id,
      month: curM,
      year: curY,
      amount: '200000',
    }, { userId: state.testUserId })
    const budgetId = created.data.data.id

    const fresh = await request(state.base, 'GET', `/budgets/${budgetId}`, undefined, { userId: state.testUserId })
    assert.equal(Number(fresh.data.data.spent), 0)
    assert.equal(Number(fresh.data.data.progress), 0)
    assert.equal(fresh.data.data.status, 'On Track')

    await request(state.base, 'POST', '/transactions', {
      description: 'fuel',
      amount: '180000',
      type: 'EXPENSE',
      categoryId: transport.id,
      date: isoDate(curY, curM, 5),
    }, { userId: state.testUserId })
    const nearLimit = await request(state.base, 'GET', `/budgets/${budgetId}`, undefined, { userId: state.testUserId })
    assert.equal(Number(nearLimit.data.data.spent), 180000)
    assert.equal(Number(nearLimit.data.data.progress), 90)
    assert.equal(nearLimit.data.data.status, 'Near Limit')
    assert.equal(Number(nearLimit.data.data.remaining), 20000)

    await request(state.base, 'POST', '/transactions', {
      description: 'insurance',
      amount: '40000',
      type: 'EXPENSE',
      categoryId: transport.id,
      date: isoDate(curY, curM, 15),
    }, { userId: state.testUserId })
    const over = await request(state.base, 'GET', `/budgets/${budgetId}`, undefined, { userId: state.testUserId })
    assert.equal(Number(over.data.data.spent), 220000)
    assert.equal(over.data.data.status, 'Over Budget')
    assert.equal(Number(over.data.data.remaining), -20000)
  })

  it('filters budgets by month and year', async () => {
    const health = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Health')
    await request(state.base, 'POST', '/budgets', {
      categoryId: health.id,
      month: 3,
      year: 2025,
      amount: '30000',
    }, { userId: state.testUserId })
    const filtered = await request(state.base, 'GET', '/budgets?month=3&year=2025', undefined, { userId: state.testUserId })
    assert.equal(filtered.data.data.length, 1)
    assert.equal(filtered.data.data[0].category.name, 'Health')
  })

  it('updates a budget amount and recomputes status', async () => {
    const shopping = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Shopping')
    const created = await request(state.base, 'POST', '/budgets', {
      categoryId: shopping.id,
      month: curM,
      year: curY,
      amount: '50000',
    }, { userId: state.testUserId })
    const id = created.data.data.id
    const updated = await request(state.base, 'PUT', `/budgets/${id}`, {
      categoryId: shopping.id,
      month: curM,
      year: curY,
      amount: '300000',
    }, { userId: state.testUserId })
    assert.equal(updated.status, 200)
    const enriched = await request(state.base, 'GET', `/budgets/${id}`, undefined, { userId: state.testUserId })
    assert.equal(Number(enriched.data.data.amount), 300000)
    assert.equal(enriched.data.data.status, 'On Track')
  })

  it('deletes a budget and returns 404 for a nonexistent budget', async () => {
    const bills = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Bills')
    const created = await request(state.base, 'POST', '/budgets', {
      categoryId: bills.id,
      month: curM,
      year: curY,
      amount: '10000',
    }, { userId: state.testUserId })
    const id = created.data.data.id
    const deleted = await request(state.base, 'DELETE', `/budgets/${id}`, undefined, { userId: state.testUserId })
    assert.equal(deleted.status, 200)
    assert.equal(deleted.data.data.id, id)

    const missing = await request(state.base, 'GET', `/budgets/${id}`, undefined, { userId: state.testUserId })
    assert.equal(missing.status, 404)
    assert.equal(missing.data.message, 'Budget not found.')

    const missingUpdate = await request(state.base, 'PUT', '/budgets/999999', {
      categoryId: bills.id,
      month: curM,
      year: curY,
      amount: '1',
    }, { userId: state.testUserId })
    assert.equal(missingUpdate.status, 404)
  })
})

describe('Dashboard API', () => {
  before(async () => {
    await resetDb(state.base, state.testUserId)
  })

  it('returns zeroed summary for an empty database', async () => {
    const res = await request(state.base, 'GET', '/dashboard/summary', undefined, { userId: state.testUserId })
    assert.equal(res.status, 200)
    assert.equal(Number(res.data.data.summary.balance), 0)
    assert.equal(Number(res.data.data.summary.income), 0)
    assert.equal(Number(res.data.data.summary.expense), 0)
    assert.equal(res.data.data.recentTransactions.length, 0)
    assert.equal(res.data.data.monthlySeries.length, 6)
    assert.equal(res.data.data.expenseByCategory.length, 0)
    assert.ok(Array.isArray(res.data.data.insights))
  })

  it('computes income, expense, and balance from stored transactions', async () => {
    const { curY, curM } = currentKeys()
    const salary = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Salary')
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const transport = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Transport')

    await request(state.base, 'POST', '/transactions', {
      description: 'salary',
      amount: '8000000',
      type: 'INCOME',
      categoryId: salary.id,
      date: isoDate(curY, curM, 1),
    }, { userId: state.testUserId })
    await request(state.base, 'POST', '/transactions', {
      description: 'groceries',
      amount: '500000',
      type: 'EXPENSE',
      categoryId: food.id,
      date: isoDate(curY, curM, 3),
    }, { userId: state.testUserId })
    await request(state.base, 'POST', '/transactions', {
      description: 'bus',
      amount: '200000',
      type: 'EXPENSE',
      categoryId: transport.id,
      date: isoDate(curY, curM, 2),
    }, { userId: state.testUserId })

    const res = await request(state.base, 'GET', '/dashboard/summary', undefined, { userId: state.testUserId })
    assert.equal(Number(res.data.data.summary.income), 8000000)
    assert.equal(Number(res.data.data.summary.expense), 700000)
    assert.equal(Number(res.data.data.summary.balance), 7300000)

    const recent = res.data.data.recentTransactions
    assert.equal(recent.length, 3)
    assert.equal(recent[0].description, 'groceries')
    assert.ok(recent.every((t) => t.category && t.category.name))

    const series = res.data.data.monthlySeries
    assert.equal(series.length, 6)
    assert.equal(Number(series[series.length - 1].income), 8000000)
    assert.equal(Number(series[series.length - 1].expense), 700000)

    const byCategory = res.data.data.expenseByCategory
    assert.equal(byCategory.length, 2)
    assert.equal(byCategory[0].name, 'Food')
    assert.ok(
      res.data.data.insights.some((text) => text.includes('Food is your highest spending category')),
    )
  })
})

describe('Reports API', () => {
  before(async () => {
    await resetDb(state.base, state.testUserId)
  })

  it('aggregates 12 months with deltas and null delta for the first month', async () => {
    const { curY, curM, prevY, prevM, ppY, ppM } = currentKeys()
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const salary = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Salary')

    await request(state.base, 'POST', '/transactions', {
      description: 'groceries current',
      amount: '380000',
      type: 'EXPENSE',
      categoryId: food.id,
      date: isoDate(curY, curM, 10),
    }, { userId: state.testUserId })
    await request(state.base, 'POST', '/transactions', {
      description: 'groceries prev',
      amount: '150000',
      type: 'EXPENSE',
      categoryId: food.id,
      date: isoDate(prevY, prevM, 10),
    }, { userId: state.testUserId })
    await request(state.base, 'POST', '/transactions', {
      description: 'salary 2 months ago',
      amount: '8000000',
      type: 'INCOME',
      categoryId: salary.id,
      date: isoDate(ppY, ppM, 5),
    }, { userId: state.testUserId })

    const res = await request(state.base, 'GET', '/reports/monthly', undefined, { userId: state.testUserId })
    assert.equal(res.status, 200)
    assert.equal(res.data.data.months.length, 12)

    const months = res.data.data.months
    assert.equal(months[0].incomeDelta, null)
    assert.equal(months[0].expenseDelta, null)

    const last = months[11]
    const prev = months[10]
    const prevPrev = months[9]

    assert.equal(last.month, `${curY}-${String(curM).padStart(2, '0')}`)
    assert.equal(Number(last.expense), 380000)
    assert.equal(Number(prev.expense), 150000)
    assert.equal(Number(last.expenseDelta), 230000)
    assert.equal(Number(prevPrev.income), 8000000)
    assert.equal(Number(prev.incomeDelta), -8000000)
  })

  it('ranks expense categories by total and reports the highest', async () => {
    const { curY, curM } = currentKeys()
    const food = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Food')
    const transport = (await getCategories(state.base, state.testUserId)).find((c) => c.name === 'Transport')
    await request(state.base, 'POST', '/transactions', {
      description: 'fuel',
      amount: '150000',
      type: 'EXPENSE',
      categoryId: transport.id,
      date: isoDate(curY, curM, 20),
    }, { userId: state.testUserId })

    const res = await request(state.base, 'GET', '/reports/categories', undefined, { userId: state.testUserId })
    assert.equal(res.status, 200)
    const categories = res.data.data.categories
    assert.equal(categories.length, 2)
    assert.equal(categories[0].name, 'Food')
    assert.equal(Number(categories[0].total), 530000)
    assert.equal(Number(categories[1].total), 150000)
    assert.equal(res.data.data.highest.name, 'Food')
    assert.equal(Number(res.data.data.highest.total), 530000)
  })
})

function SEED_PAYLOAD(name) {
  return { name, icon: '🧪', color: '#111111' }
}
