import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { startApp, stopApp, request, disconnectPrisma } from './helpers.mjs'

const require = createRequire(import.meta.url)
const { getPrisma, getDecimal } = require('../src/lib/prisma')

let state
let accountA
let accountB
let transferId
const today = new Date().toISOString().slice(0, 10)

async function createTransfer(overrides = {}) {
  return request(state.base, 'POST', '/transactions', {
    description: 'Parkir ke tabungan',
    amount: '10000',
    type: 'TRANSFER',
    accountId: accountA.id,
    transferAccountId: accountB.id,
    date: today,
    ...overrides,
  }, { userId: state.testUserId })
}

async function getDashboard() {
  const res = await request(state.base, 'GET', '/dashboard/summary', undefined, { userId: state.testUserId })
  return res.data.data
}

async function getAccounts() {
  const res = await request(state.base, 'GET', '/accounts', undefined, { userId: state.testUserId })
  return res.data.data
}

async function getAccountById(id) {
  const res = await request(state.base, 'GET', `/accounts/${id}`, undefined, { userId: state.testUserId })
  return res.data.data
}

async function listAccountTransactions(accountId) {
  const res = await request(state.base, 'GET', `/transactions?accountId=${accountId}&page=1&limit=20`, undefined, { userId: state.testUserId })
  return res.data.data
}

before(async () => {
  state = await startApp()
  const createdA = await request(state.base, 'POST', '/accounts', {
    name: 'Trans Source',
    type: 'BANK',
    initialBalance: '100000',
  }, { userId: state.testUserId })
  accountA = createdA.data.data
  const createdB = await request(state.base, 'POST', '/accounts', {
    name: 'Trans Dest',
    type: 'BANK',
    initialBalance: '50000',
  }, { userId: state.testUserId })
  accountB = createdB.data.data
})

after(async () => {
  await disconnectPrisma()
  await stopApp(state.server)
})

describe('Transfer antar akun', () => {
  describe('validation', () => {
    it('rejects a transfer without a destination account', async () => {
      const res = await createTransfer({ transferAccountId: undefined })
      assert.equal(res.status, 400)
      assert.equal(res.data.message, 'Transfer destination account is required.')
    })

    it('rejects a transfer where source and destination are the same', async () => {
      const res = await createTransfer({ transferAccountId: accountA.id })
      assert.equal(res.status, 400)
      assert.equal(res.data.message, 'Transfer source and destination must be different.')
    })

    it('rejects a transfer that has a category', async () => {
      const cat = (await request(state.base, 'GET', '/categories', undefined, { userId: state.testUserId })).data.data[0]
      const res = await createTransfer({ categoryId: cat.id })
      assert.equal(res.status, 400)
      assert.equal(res.data.message, 'Transfer cannot have a category.')
    })

    it('rejects a transfer linked to a nonexistent goal', async () => {
      const res = await createTransfer({ goalId: 99999 })
      assert.equal(res.status, 404)
      assert.equal(res.data.message, 'Goal not found.')
    })

    it('rejects a transfer linked to a goal on the source (not destination) account', async () => {
      const goal = await request(state.base, 'POST', '/goals', {
        name: 'Wrong account goal',
        targetAmount: '50000',
        accountId: accountA.id,
      }, { userId: state.testUserId })
      assert.equal(goal.status, 201)
      const res = await createTransfer({ goalId: goal.data.data.id })
      assert.equal(res.status, 400)
      assert.equal(res.data.message, 'Goal account must match the transaction account.')
    })

    it('rejects a transfer to a nonexistent account', async () => {
      const res = await createTransfer({ transferAccountId: 999999 })
      assert.equal(res.status, 400)
      assert.equal(res.data.message, 'Destination account not found.')
    })

    it('rejects transferAccountId on non-transfer types', async () => {
      const cat = (await request(state.base, 'GET', '/categories', undefined, { userId: state.testUserId })).data.data.find((c) => c.name === 'Food')
      const res = await request(state.base, 'POST', '/transactions', {
        description: 'x',
        amount: '10',
        type: 'INCOME',
        categoryId: cat.id,
        accountId: accountA.id,
        transferAccountId: accountB.id,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(res.status, 400)
      assert.equal(res.data.message, 'Transfer destination is only allowed for TRANSFER transactions.')
    })

    it('rejects an unknown type with an inclusive error message', async () => {
      const res = await request(state.base, 'POST', '/transactions', {
        description: 'x',
        amount: '10',
        type: 'BOGUS',
        categoryId: null,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(res.status, 400)
      assert.equal(res.data.message, 'Type must be INCOME, EXPENSE, or TRANSFER.')
    })

    it('rejects non-positive transfer amounts', async () => {
      const zero = await createTransfer({ amount: '0' })
      assert.equal(zero.status, 400)
      assert.equal(zero.data.message, 'Amount must be greater than 0.')
      for (const amount of ['-5', 'abc']) {
        const bad = await createTransfer({ amount })
        assert.equal(bad.status, 400)
        assert.equal(bad.data.message, 'Amount must be a positive number.')
      }
    })

    it('rejects invalid calendar dates on transfers', async () => {
      const res = await createTransfer({ date: '2026-13-40' })
      assert.equal(res.status, 400)
      assert.equal(res.data.message, 'Invalid date. Use YYYY-MM-DD.')
    })
  })

  describe('balance effects', () => {
    it('creates a single transfer row and moves the balance between accounts', async () => {
      const res = await createTransfer()
      assert.equal(res.status, 201)
      transferId = res.data.data.id

      const afterA = await getAccountById(accountA.id)
      const afterB = await getAccountById(accountB.id)
      assert.equal(Number(afterA.balance), 90000)
      assert.equal(Number(afterB.balance), 60000)
      assert.equal(Number(afterA.income), 0)
      assert.equal(Number(afterA.expense), 0)
      assert.equal(Number(afterB.income), 0)
      assert.equal(Number(afterB.expense), 0)
    })

    it('lists the transfer once for the source account and once for the destination', async () => {
      const fromSource = await listAccountTransactions(accountA.id)
      const fromDest = await listAccountTransactions(accountB.id)
      assert.equal(fromSource.length, 1)
      assert.equal(fromDest.length, 1)
      assert.equal(fromSource[0].id, transferId)
      assert.equal(fromDest[0].id, transferId)
      assert.equal(fromSource[0].type, 'TRANSFER')
      assert.equal(fromSource[0].transferAccount.id, accountB.id)
      assert.equal(fromSource[0].categoryId, null)
    })

    it('keeps total balance, income, and expense unchanged', async () => {
      const dash = await getDashboard()
      assert.equal(Number(dash.summary.balance), 150000)
      assert.equal(Number(dash.summary.income), 0)
      assert.equal(Number(dash.summary.expense), 0)
      const a = dash.accounts.find((acc) => acc.id === accountA.id)
      const b = dash.accounts.find((acc) => acc.id === accountB.id)
      assert.equal(Number(a.balance), 90000)
      assert.equal(Number(b.balance), 60000)
    })
  })

  describe('reports, analytics, and insights', () => {
    it('excludes transfers from monthly expense and category reports', async () => {
      const report = await request(state.base, 'GET', '/reports/monthly', undefined, { userId: state.testUserId })
      const current = report.data.data.months[report.data.data.months.length - 1]
      assert.equal(Number(current.income), 0)
      assert.equal(Number(current.expense), 0)

      const catReport = await request(state.base, 'GET', '/reports/categories', undefined, { userId: state.testUserId })
      assert.equal(catReport.data.data.categories.length, 0)
    })

    it('excludes transfers from analytics aggregates but still counts them as transactions', async () => {
      const res = await request(state.base, 'GET', '/analytics/summary', undefined, { userId: state.testUserId })
      const data = res.data.data
      assert.equal(Number(data.totalIncome), 0)
      assert.equal(Number(data.totalExpense), 0)
      assert.equal(Number(data.netCashFlow), 0)
      assert.equal(Number(data.avgTransactionAmount), 0)
      assert.equal(data.transactionCount, 1)
      assert.equal(data.expenseTransactionCount, 0)
      assert.equal(data.largestTransaction, null)
    })

    it('excludes transfers from AI insights metrics', async () => {
      const now = new Date()
      const res = await request(state.base, 'GET', `/ai-insights?month=${now.getUTCMonth() + 1}&year=${now.getUTCFullYear()}`, undefined, { userId: state.testUserId })
      assert.equal(res.status, 200)
      assert.equal(Number(res.data.data.metrics.income), 0)
      assert.equal(Number(res.data.data.metrics.expense), 0)
      assert.equal(res.data.data.metrics.transactionCount, 1)
    })

    it('exports a transfer with a From → To account label and an empty category', async () => {
      const res = await request(state.base, 'GET', '/export/transactions', undefined, { userId: state.testUserId })
      const row = res.data.data.find((entry) => entry.id === transferId)
      assert.ok(row)
      assert.equal(row.type, 'TRANSFER')
      assert.equal(row.category, '')
      assert.equal(row.account, 'Trans Source → Trans Dest')
      assert.equal(Number(row.amount), 10000)
    })
  })

  describe('lifecycle', () => {
    it('blocks editing an existing transfer and keeps balances unchanged', async () => {
      const res = await request(state.base, 'PUT', `/transactions/${transferId}`, {
        description: 'Tarik balik',
        amount: '10000',
        type: 'TRANSFER',
        accountId: accountB.id,
        transferAccountId: accountA.id,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(res.status, 400)
      assert.equal(res.data.message, 'Transfer transactions cannot be edited.')
      const dash = await getDashboard()
      const a = dash.accounts.find((acc) => acc.id === accountA.id)
      const b = dash.accounts.find((acc) => acc.id === accountB.id)
      assert.equal(Number(a.balance), 90000)
      assert.equal(Number(b.balance), 60000)
    })

    it('blocks converting a normal transaction into a transfer', async () => {
      const cat = (await request(state.base, 'GET', '/categories', undefined, { userId: state.testUserId })).data.data.find((c) => c.name === 'Food')
      const created = await request(state.base, 'POST', '/transactions', {
        description: 'Beli kopi',
        amount: '5000',
        type: 'EXPENSE',
        categoryId: cat.id,
        accountId: accountA.id,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(created.status, 201)
      const res = await request(state.base, 'PUT', `/transactions/${created.data.data.id}`, {
        description: 'Beli kopi',
        amount: '5000',
        type: 'TRANSFER',
        accountId: accountA.id,
        transferAccountId: accountB.id,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(res.status, 400)
      assert.equal(res.data.message, 'A transaction cannot be changed to a transfer.')
      await request(state.base, 'DELETE', `/transactions/${created.data.data.id}`, undefined, { userId: state.testUserId })
    })

    it('deletes a transfer and reverts both balances', async () => {
      const res = await request(state.base, 'DELETE', `/transactions/${transferId}`, undefined, { userId: state.testUserId })
      assert.equal(res.status, 200)
      assert.equal(res.data.data.id, transferId)
      const dash = await getDashboard()
      const a = dash.accounts.find((acc) => acc.id === accountA.id)
      const b = dash.accounts.find((acc) => acc.id === accountB.id)
      assert.equal(Number(a.balance), 100000)
      assert.equal(Number(b.balance), 50000)
      const fromSource = await listAccountTransactions(accountA.id)
      assert.equal(fromSource.length, 0)
    })

    it('creates no goal activity for a transfer without a goal', async () => {
      const transfer = await createTransfer()
      assert.equal(transfer.status, 201)
      const prisma = await getPrisma()
      const count = await prisma.goalActivity.count({})
      assert.equal(count, 0)
    })

    it('archives an account that is used as a transfer destination', async () => {
      const src = await request(state.base, 'POST', '/accounts', {
        name: 'Archive Src',
        type: 'BANK',
        initialBalance: '100000',
      }, { userId: state.testUserId })
      const dst = await request(state.base, 'POST', '/accounts', {
        name: 'Archive Dst',
        type: 'BANK',
        initialBalance: '0',
      }, { userId: state.testUserId })
      const transfer = await createTransfer({ accountId: src.data.data.id, transferAccountId: dst.data.data.id })
      assert.equal(transfer.status, 201)
      const res = await request(state.base, 'DELETE', `/accounts/${dst.data.data.id}`, undefined, { userId: state.testUserId })
      assert.equal(res.status, 200)
      assert.equal(res.data.data.archived, true)
      const accounts = await getAccounts()
      assert.ok(!accounts.some((account) => account.id === dst.data.data.id))
      const txs = await listAccountTransactions(dst.data.data.id)
      assert.equal(txs.length, 1)
      assert.equal(txs[0].id, transfer.data.data.id)
    })
  })

  describe('guid integration and recurring', () => {
    it('still rejects TRANSFER for recurring transactions', async () => {
      const res = await request(state.base, 'POST', '/recurring-transactions', {
        description: 'x',
        amount: '10',
        type: 'TRANSFER',
        frequency: 'MONTHLY',
        accountId: accountA.id,
        startDate: today,
      }, { userId: state.testUserId })
      assert.equal(res.status, 400)
      assert.equal(res.data.message, 'Type must be INCOME or EXPENSE.')
    })
  })

  describe('transfer balance guard', () => {
    async function createAccount(name, initialBalance) {
      const res = await request(state.base, 'POST', '/accounts', {
        name,
        type: 'BANK',
        initialBalance,
      }, { userId: state.testUserId })
      assert.equal(res.status, 201)
      return res.data.data
    }

    it('rejects a transfer larger than the source balance', async () => {
      const src = await createAccount('Guard Src', '50000')
      const dst = await createAccount('Guard Dst', '0')
      const res = await request(state.base, 'POST', '/transactions', {
        description: 'Overdraft',
        amount: '50001',
        type: 'TRANSFER',
        accountId: src.id,
        transferAccountId: dst.id,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(res.status, 400)
      assert.equal(res.data.message, "Transfer amount must not exceed the source account's current balance.")
      const afterSrc = await getAccountById(src.id)
      const afterDst = await getAccountById(dst.id)
      assert.equal(Number(afterSrc.balance), 50000)
      assert.equal(Number(afterDst.balance), 0)
    })

    it('allows a transfer exactly matching the source balance', async () => {
      const src = await createAccount('Guard Exact Src', '50000')
      const dst = await createAccount('Guard Exact Dst', '0')
      const created = await request(state.base, 'POST', '/transactions', {
        description: 'Maksimal',
        amount: '50000',
        type: 'TRANSFER',
        accountId: src.id,
        transferAccountId: dst.id,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(created.status, 201)
      const afterSrc = await getAccountById(src.id)
      const afterDst = await getAccountById(dst.id)
      assert.equal(Number(afterSrc.balance), 0)
      assert.equal(Number(afterDst.balance), 50000)
      const deleted = await request(state.base, 'DELETE', `/transactions/${created.data.data.id}`, undefined, { userId: state.testUserId })
      assert.equal(deleted.status, 200)
      const revertedSrc = await getAccountById(src.id)
      const revertedDst = await getAccountById(dst.id)
      assert.equal(Number(revertedSrc.balance), 50000)
      assert.equal(Number(revertedDst.balance), 0)
    })
  })

  describe('delete integrity', () => {
    it('blocks deleting an income that funds an existing transfer', async () => {
      const src = await request(state.base, 'POST', '/accounts', {
        name: 'Fund Source',
        type: 'BANK',
        initialBalance: '0',
      }, { userId: state.testUserId })
      const dst = await request(state.base, 'POST', '/accounts', {
        name: 'Fund Destination',
        type: 'BANK',
        initialBalance: '25000',
      }, { userId: state.testUserId })
      assert.equal(src.status, 201)
      assert.equal(dst.status, 201)
      const salary = (await request(state.base, 'GET', '/categories', undefined, { userId: state.testUserId })).data.data.find((c) => c.name === 'Salary')
      const income = await request(state.base, 'POST', '/transactions', {
        description: 'Gaji',
        amount: '10000',
        type: 'INCOME',
        categoryId: salary.id,
        accountId: src.data.data.id,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(income.status, 201)
      const transferRes = await request(state.base, 'POST', '/transactions', {
        description: 'Kirim',
        amount: '10000',
        type: 'TRANSFER',
        accountId: src.data.data.id,
        transferAccountId: dst.data.data.id,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(transferRes.status, 201)

      const deleted = await request(state.base, 'DELETE', `/transactions/${income.data.data.id}`, undefined, { userId: state.testUserId })
      assert.equal(deleted.status, 400)
      assert.equal(deleted.data.message, 'Transaction cannot be deleted because it would make an account balance negative.')

      const srcAfter = await getAccountById(src.data.data.id)
      const dstAfter = await getAccountById(dst.data.data.id)
      assert.equal(Number(srcAfter.balance), 0)
      assert.equal(Number(dstAfter.balance), 35000)
    })
  })

  describe('goal and transfer', () => {
    async function createAccountWithBalance(name) {
      const res = await request(state.base, 'POST', '/accounts', {
        name,
        type: 'SAVINGS',
        initialBalance: '0',
      }, { userId: state.testUserId })
      assert.equal(res.status, 201)
      return res.data.data
    }

    async function salaryIncome(amount, accountId, goalId, description) {
      const salary = (await request(state.base, 'GET', '/categories', undefined, { userId: state.testUserId })).data.data.find((c) => c.name === 'Salary')
      const res = await request(state.base, 'POST', '/transactions', {
        description,
        amount: String(amount),
        type: 'INCOME',
        categoryId: salary.id,
        accountId,
        goalId,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(res.status, 201)
    }

    async function transferBetween(srcId, dstId, amount, overrides = {}) {
      const res = await request(state.base, 'POST', '/transactions', {
        description: 'Pindah',
        amount: String(amount),
        type: 'TRANSFER',
        accountId: srcId,
        transferAccountId: dstId,
        date: today,
        ...overrides,
      }, { userId: state.testUserId })
      assert.equal(res.status, 201)
      return res.data.data
    }

    it('drains the only funded goal when a transfer without a source goal spends the full balance', async () => {
      const src = await createAccountWithBalance('Goal Src')
      const dst = await createAccountWithBalance('Goal Dst')
      const goal = await request(state.base, 'POST', '/goals', {
        name: 'Trip fund',
        targetAmount: '100000',
        accountId: src.id,
      }, { userId: state.testUserId })
      assert.equal(goal.status, 201)

      await salaryIncome(10000, src.id, goal.data.data.id, 'Deposit trip')
      const before = await request(state.base, 'GET', `/goals/${goal.data.data.id}`, undefined, { userId: state.testUserId })
      assert.equal(Number(before.data.data.currentAmount), 10000)

      const transfer = await transferBetween(src.id, dst.id, 10000)

      assert.equal(Number(transfer.sourceGoalId), goal.data.data.id)
      const afterGoal = await request(state.base, 'GET', `/goals/${goal.data.data.id}`, undefined, { userId: state.testUserId })
      assert.equal(Number(afterGoal.data.data.currentAmount), 0)
      assert.equal(Number((await getAccountById(src.id)).balance), 0)
      assert.equal(Number((await getAccountById(dst.id)).balance), 10000)
      const prisma = await getPrisma()
      const activity = await prisma.goalActivity.findFirst({
        where: { transactionId: transfer.id },
      })
      assert.ok(activity)
      assert.equal(activity.type, 'WITHDRAWAL')
      assert.equal(Number(activity.amount), 10000)
    })

    it('links a transfer to a goal on the destination account as a contribution', async () => {
      const src = await createAccountWithBalance('DestGoal Src')
      const dst = await createAccountWithBalance('DestGoal Dst')
      const goal = await request(state.base, 'POST', '/goals', {
        name: 'Destination fund',
        targetAmount: '100000',
        accountId: dst.id,
      }, { userId: state.testUserId })
      assert.equal(goal.status, 201)

      await salaryIncome(10000, src.id, null, 'Fund source')
      const res = await request(state.base, 'POST', '/transactions', {
        description: 'Pindah ke tujuan',
        amount: '10000',
        type: 'TRANSFER',
        accountId: src.id,
        transferAccountId: dst.id,
        goalId: goal.data.data.id,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(res.status, 201)

      const goalAfter = await request(state.base, 'GET', `/goals/${goal.data.data.id}`, undefined, { userId: state.testUserId })
      assert.equal(Number(goalAfter.data.data.currentAmount), 10000)
      const prisma = await getPrisma()
      const activity = await prisma.goalActivity.findFirst({
        where: { transactionId: res.data.data.id },
      })
      assert.ok(activity)
      assert.equal(activity.type, 'CONTRIBUTION')
      assert.equal(Number(activity.accountId), dst.id)
    })

    it('rejects a transfer without a source goal when multiple goals hold the allocated funds', async () => {
      const src = await createAccountWithBalance('Multi Src')
      const dst = await createAccountWithBalance('Multi Dst')
      const first = await request(state.base, 'POST', '/goals', {
        name: 'First goal',
        targetAmount: '200000',
        accountId: src.id,
      }, { userId: state.testUserId })
      const second = await request(state.base, 'POST', '/goals', {
        name: 'Second goal',
        targetAmount: '300000',
        accountId: src.id,
      }, { userId: state.testUserId })
      assert.equal(first.status, 201)
      assert.equal(second.status, 201)

      await salaryIncome(5000, src.id, first.data.data.id, 'Deposit first')
      await salaryIncome(7000, src.id, second.data.data.id, 'Deposit second')

      const res = await request(state.base, 'POST', '/transactions', {
        description: 'Pindah',
        amount: '12000',
        type: 'TRANSFER',
        accountId: src.id,
        transferAccountId: dst.id,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(res.status, 400)
      assert.match(res.data.message, /source goal/i)

      const firstAfter = await request(state.base, 'GET', `/goals/${first.data.data.id}`, undefined, { userId: state.testUserId })
      const secondAfter = await request(state.base, 'GET', `/goals/${second.data.data.id}`, undefined, { userId: state.testUserId })
      assert.equal(Number(firstAfter.data.data.currentAmount), 5000)
      assert.equal(Number(secondAfter.data.data.currentAmount), 7000)
      assert.equal(Number((await getAccountById(src.id)).balance), 12000)
      assert.equal(Number((await getAccountById(dst.id)).balance), 0)
    })
  })

  describe('transfer source goal', () => {
    async function createAccountWithBalance(name, initialBalance = '0') {
      const res = await request(state.base, 'POST', '/accounts', {
        name,
        type: 'SAVINGS',
        initialBalance,
      }, { userId: state.testUserId })
      assert.equal(res.status, 201)
      return res.data.data
    }

    async function createGoal(name, accountId) {
      const res = await request(state.base, 'POST', '/goals', {
        name,
        targetAmount: '100000',
        accountId,
      }, { userId: state.testUserId })
      assert.equal(res.status, 201)
      return res.data.data
    }

    async function salaryIncome(amount, accountId, goalId) {
      const salary = (await request(state.base, 'GET', '/categories', undefined, { userId: state.testUserId })).data.data.find((c) => c.name === 'Salary')
      const res = await request(state.base, 'POST', '/transactions', {
        description: 'Deposit',
        amount: String(amount),
        type: 'INCOME',
        categoryId: salary.id,
        accountId,
        goalId,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(res.status, 201)
    }

    async function getTransfer(id) {
      const res = await request(state.base, 'GET', `/transactions/${id}`, undefined, { userId: state.testUserId })
      return res.data.data
    }

    async function getGoalAmount(id) {
      const res = await request(state.base, 'GET', `/goals/${id}`, undefined, { userId: state.testUserId })
      return res.data.data
    }

    async function transferBetween(srcId, dstId, amount, overrides = {}) {
      const res = await request(state.base, 'POST', '/transactions', {
        description: 'Pindah',
        amount: String(amount),
        type: 'TRANSFER',
        accountId: srcId,
        transferAccountId: dstId,
        date: today,
        ...overrides,
      }, { userId: state.testUserId })
      assert.equal(res.status, 201)
      return res.data.data
    }

    it('reduces the selected source goal when money leaves via a transfer', async () => {
      const src = await createAccountWithBalance('SrcGoalOnly')
      const dst = await createAccountWithBalance('DstGoalOnly')
      const goal = await createGoal('Laptop', src.id)
      await salaryIncome(15000, src.id, goal.id)
      assert.equal(Number((await getGoalAmount(goal.id)).currentAmount), 15000)

      const transfer = await transferBetween(src.id, dst.id, 15000, { sourceGoalId: goal.id })

      assert.equal(Number((await getAccountById(src.id)).balance), 0)
      assert.equal(Number((await getAccountById(dst.id)).balance), 15000)
      assert.equal(Number((await getGoalAmount(goal.id)).currentAmount), 0)

      const row = await getTransfer(transfer.id)
      assert.equal(row.goal, null)
      assert.equal(row.sourceGoal.id, goal.id)

      const prisma = await getPrisma()
      const activity = await prisma.goalActivity.findFirst({ where: { transactionId: transfer.id } })
      assert.ok(activity)
      assert.equal(activity.type, 'WITHDRAWAL')
      assert.equal(Number(activity.accountId), src.id)
      assert.equal(Number(activity.amount), 15000)
    })

    it('supports a source goal and a destination goal on the same transfer', async () => {
      const src = await createAccountWithBalance('CombinedSrc')
      const dst = await createAccountWithBalance('CombinedDst')
      const srcGoal = await createGoal('Laptop', src.id)
      const dstGoal = await createGoal('Dana', dst.id)
      await salaryIncome(15000, src.id, srcGoal.id)
      await salaryIncome(15000, dst.id, dstGoal.id)
      assert.equal(Number((await getGoalAmount(dstGoal.id)).currentAmount), 15000)

      const transfer = await transferBetween(src.id, dst.id, 15000, {
        sourceGoalId: srcGoal.id,
        goalId: dstGoal.id,
      })

      assert.equal(Number((await getAccountById(src.id)).balance), 0)
      assert.equal(Number((await getAccountById(dst.id)).balance), 30000)
      assert.equal(Number((await getGoalAmount(srcGoal.id)).currentAmount), 0)
      assert.equal(Number((await getGoalAmount(dstGoal.id)).currentAmount), 30000)

      const prisma = await getPrisma()
      const activities = await prisma.goalActivity.findMany({ where: { transactionId: transfer.id } })
      assert.equal(activities.length, 2)
      const withdrawal = activities.find((activity) => activity.type === 'WITHDRAWAL')
      const contribution = activities.find((activity) => activity.type === 'CONTRIBUTION')
      assert.ok(withdrawal)
      assert.ok(contribution)
      assert.equal(Number(withdrawal.accountId), src.id)
      assert.equal(Number(contribution.accountId), dst.id)
      assert.equal(Number(withdrawal.goalId), srcGoal.id)
      assert.equal(Number(contribution.goalId), dstGoal.id)
    })

    it('rejects a transfer that exceeds the selected source goal allocation', async () => {
      const src = await createAccountWithBalance('OverAllocSrc', '20000')
      const dst = await createAccountWithBalance('OverAllocDst')
      const goal = await createGoal('Tight', src.id)
      await salaryIncome(10000, src.id, goal.id)

      const res = await request(state.base, 'POST', '/transactions', {
        description: 'Pindah',
        amount: '15000',
        type: 'TRANSFER',
        accountId: src.id,
        transferAccountId: dst.id,
        sourceGoalId: goal.id,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(res.status, 400)
      assert.equal(res.data.message, 'The transfer amount exceeds the selected source goal balance.')

      assert.equal(Number((await getAccountById(src.id)).balance), 30000)
      assert.equal(Number((await getGoalAmount(goal.id)).currentAmount), 10000)
    })

    it('reduces only the explicitly selected source goal when multiple are funded', async () => {
      const src = await createAccountWithBalance('MultiExplicitSrc')
      const dst = await createAccountWithBalance('MultiExplicitDst')
      const first = await createGoal('First', src.id)
      const second = await createGoal('Second', src.id)
      await salaryIncome(5000, src.id, first.id)
      await salaryIncome(7000, src.id, second.id)

      await transferBetween(src.id, dst.id, 5000, { sourceGoalId: first.id })

      assert.equal(Number((await getGoalAmount(first.id)).currentAmount), 0)
      assert.equal(Number((await getGoalAmount(second.id)).currentAmount), 7000)
    })

    it('rejects sourceGoalId on non-transfer types', async () => {
      const account = await createAccountWithBalance('NonTransferSrc')
      const goal = await createGoal('NonTransferGoal', account.id)
      const cat = (await request(state.base, 'GET', '/categories', undefined, { userId: state.testUserId })).data.data.find((c) => c.name === 'Salary')
      const res = await request(state.base, 'POST', '/transactions', {
        description: 'Gaji',
        amount: '5000',
        type: 'INCOME',
        categoryId: cat.id,
        accountId: account.id,
        sourceGoalId: goal.id,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(res.status, 400)
      assert.equal(res.data.message, 'Source goal is only allowed for TRANSFER transactions.')
    })
  })

  describe('transfer source goal auto-resolution', () => {
    async function createAccountWithBalance(name, initialBalance = '0') {
      const res = await request(state.base, 'POST', '/accounts', {
        name,
        type: 'SAVINGS',
        initialBalance,
      }, { userId: state.testUserId })
      assert.equal(res.status, 201)
      return res.data.data
    }

    async function createGoal(name, accountId, targetAmount = '100000') {
      const res = await request(state.base, 'POST', '/goals', {
        name,
        targetAmount,
        accountId,
      }, { userId: state.testUserId })
      assert.equal(res.status, 201)
      return res.data.data
    }

    async function salaryIncome(amount, accountId, goalId) {
      const salary = (await request(state.base, 'GET', '/categories', undefined, { userId: state.testUserId })).data.data.find((c) => c.name === 'Salary')
      const res = await request(state.base, 'POST', '/transactions', {
        description: 'Deposit',
        amount: String(amount),
        type: 'INCOME',
        categoryId: salary.id,
        accountId,
        goalId,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(res.status, 201)
    }

    async function transferBetween(srcId, dstId, amount, overrides = {}) {
      const res = await request(state.base, 'POST', '/transactions', {
        description: 'Pindah',
        amount: String(amount),
        type: 'TRANSFER',
        accountId: srcId,
        transferAccountId: dstId,
        date: today,
        ...overrides,
      }, { userId: state.testUserId })
      return res
    }

    async function getGoalAmount(id) {
      const res = await request(state.base, 'GET', `/goals/${id}`, undefined, { userId: state.testUserId })
      return res.data.data
    }

    it('auto-withdraws the only funded goal when the full balance is transferred without a source goal', async () => {
      const src = await createAccountWithBalance('Sasa Src')
      const dst = await createAccountWithBalance('Sasa Dst')
      const goal = await createGoal('Laptop Baru', src.id, '15000')
      await salaryIncome(15000, src.id, goal.id)

      const res = await transferBetween(src.id, dst.id, 15000)
      assert.equal(res.status, 201)
      assert.equal(Number(res.data.data.sourceGoalId), goal.id)

      assert.equal(Number((await getGoalAmount(goal.id)).currentAmount), 0)
      assert.equal(Number((await getAccountById(src.id)).balance), 0)
      const prisma = await getPrisma()
      const activities = await prisma.goalActivity.findMany({
        where: { transactionId: res.data.data.id },
      })
      assert.equal(activities.length, 1)
      assert.equal(activities[0].type, 'WITHDRAWAL')
      assert.equal(Number(activities[0].amount), 15000)
    })

    it('partially drains the only funded goal when the transfer is smaller than the goal', async () => {
      const src = await createAccountWithBalance('Partial Src')
      const dst = await createAccountWithBalance('Partial Dst')
      const goal = await createGoal('Partial Goal', src.id, '15000')
      await salaryIncome(15000, src.id, goal.id)

      const res = await transferBetween(src.id, dst.id, 5000)
      assert.equal(res.status, 201)
      assert.equal(Number(res.data.data.sourceGoalId), goal.id)
      assert.equal(Number((await getGoalAmount(goal.id)).currentAmount), 10000)
    })

    it('keeps the funded goal untouched when the transfer is covered by unallocated balance', async () => {
      const src = await createAccountWithBalance('Unallocated Src', '100000')
      const dst = await createAccountWithBalance('Unallocated Dst')
      const goal = await createGoal('Unallocated Goal', src.id, '30000')
      await salaryIncome(30000, src.id, goal.id)

      const res = await transferBetween(src.id, dst.id, 50000)
      assert.equal(res.status, 201)
      assert.equal(res.data.data.sourceGoalId, null)
      assert.equal(Number((await getGoalAmount(goal.id)).currentAmount), 30000)
      const prisma = await getPrisma()
      const activities = await prisma.goalActivity.findMany({
        where: { transactionId: res.data.data.id },
      })
      assert.equal(activities.length, 0)
    })

    it('creates a source withdrawal and a destination contribution together in auto mode', async () => {
      const src = await createAccountWithBalance('Combined Src')
      const dst = await createAccountWithBalance('Combined Dst')
      const srcGoal = await createGoal('Combined Source', src.id, '20000')
      const dstGoal = await createGoal('Combined Dest', dst.id, '20000')
      await salaryIncome(20000, src.id, srcGoal.id)

      const res = await transferBetween(src.id, dst.id, 20000, { goalId: dstGoal.id })
      assert.equal(res.status, 201)
      assert.equal(Number(res.data.data.sourceGoalId), srcGoal.id)
      assert.equal(Number((await getGoalAmount(srcGoal.id)).currentAmount), 0)
      assert.equal(Number((await getGoalAmount(dstGoal.id)).currentAmount), 20000)
      const prisma = await getPrisma()
      const activities = await prisma.goalActivity.findMany({
        where: { transactionId: res.data.data.id },
      })
      assert.equal(activities.length, 2)
      const source = activities.find((a) => a.type === 'WITHDRAWAL')
      const dest = activities.find((a) => a.type === 'CONTRIBUTION')
      assert.ok(source)
      assert.ok(dest)
      assert.equal(Number(activities.filter((a) => a.type === 'WITHDRAWAL').length), 1)
    })

    it('rejects a transfer without a source goal when multiple goals hold the allocated funds', async () => {
      const src = await createAccountWithBalance('Ambiguous Src')
      const dst = await createAccountWithBalance('Ambiguous Dst')
      const first = await createGoal('Ambiguous A', src.id, '40000')
      const second = await createGoal('Ambiguous B', src.id, '30000')
      await salaryIncome(40000, src.id, first.id)
      await salaryIncome(30000, src.id, second.id)

      const res = await transferBetween(src.id, dst.id, 50000)
      assert.equal(res.status, 400)
      assert.match(res.data.message, /select the source goal/i)

      assert.equal(Number((await getGoalAmount(first.id)).currentAmount), 40000)
      assert.equal(Number((await getGoalAmount(second.id)).currentAmount), 30000)
      assert.equal(Number((await getAccountById(src.id)).balance), 70000)
      assert.equal(Number((await getAccountById(dst.id)).balance), 0)
      const prisma = await getPrisma()
      const activityCount = await prisma.goalActivity.count({
        where: { goalId: { in: [first.id, second.id] } },
      })
      assert.equal(activityCount, 2)
    })

    it('rejects an ambiguous multi-goal transfer even when a destination goal is set', async () => {
      const src = await createAccountWithBalance('AmbiguousDest Src')
      const dst = await createAccountWithBalance('AmbiguousDest Dst')
      const first = await createGoal('AmbiguousDest A', src.id, '40000')
      const second = await createGoal('AmbiguousDest B', src.id, '30000')
      const dstGoal = await createGoal('AmbiguousDest Goal', dst.id, '50000')
      await salaryIncome(40000, src.id, first.id)
      await salaryIncome(30000, src.id, second.id)

      const res = await transferBetween(src.id, dst.id, 50000, { goalId: dstGoal.id })
      assert.equal(res.status, 400)
      assert.equal(Number((await getGoalAmount(dstGoal.id)).currentAmount), 0)
    })

    it('still accepts an explicit source goal when several goals are funded', async () => {
      const src = await createAccountWithBalance('ExplicitMulti Src')
      const dst = await createAccountWithBalance('ExplicitMulti Dst')
      const first = await createGoal('ExplicitMulti A', src.id, '40000')
      const second = await createGoal('ExplicitMulti B', src.id, '30000')
      await salaryIncome(40000, src.id, first.id)
      await salaryIncome(30000, src.id, second.id)

      const res = await transferBetween(src.id, dst.id, 25000, { sourceGoalId: first.id })
      assert.equal(res.status, 201)
      assert.equal(Number((await getGoalAmount(first.id)).currentAmount), 15000)
      assert.equal(Number((await getGoalAmount(second.id)).currentAmount), 30000)
    })

    it('keeps the goal untouched when the transfer matches the free balance exactly', async () => {
      const src = await createAccountWithBalance('FreeBoundary Src')
      const dst = await createAccountWithBalance('FreeBoundary Dst')
      const goal = await createGoal('FreeBoundary Goal', src.id, '50000')
      await salaryIncome(25000, src.id, goal.id)
      await salaryIncome(15000, src.id, undefined)

      const res = await transferBetween(src.id, dst.id, 15000)
      assert.equal(res.status, 201)
      assert.equal(res.data.data.sourceGoalId, null)
      assert.equal(Number((await getGoalAmount(goal.id)).currentAmount), 25000)
      const prisma = await getPrisma()
      const activities = await prisma.goalActivity.findMany({
        where: { transactionId: res.data.data.id },
      })
      assert.equal(activities.length, 0)
    })

    it('takes only the shortfall from the goal when the transfer exceeds the free balance', async () => {
      const src = await createAccountWithBalance('Shortfall Src')
      const dst = await createAccountWithBalance('Shortfall Dst')
      const goal = await createGoal('Shortfall Goal', src.id, '50000')
      await salaryIncome(25000, src.id, goal.id)
      await salaryIncome(15000, src.id, undefined)

      const res = await transferBetween(src.id, dst.id, 20000)
      assert.equal(res.status, 201)
      assert.equal(Number(res.data.data.sourceGoalId), goal.id)
      assert.equal(Number((await getGoalAmount(goal.id)).currentAmount), 20000)
      assert.equal(Number((await getAccountById(src.id)).balance), 20000)
      const prisma = await getPrisma()
      const activities = await prisma.goalActivity.findMany({
        where: { transactionId: res.data.data.id },
      })
      assert.equal(activities.length, 1)
      assert.equal(activities[0].type, 'WITHDRAWAL')
      assert.equal(Number(activities[0].amount), 5000)
    })

    it('drains the goal fully when the full balance is transferred from an account with free balance', async () => {
      const src = await createAccountWithBalance('FullDrain Src')
      const dst = await createAccountWithBalance('FullDrain Dst')
      const goal = await createGoal('FullDrain Goal', src.id, '50000')
      await salaryIncome(25000, src.id, goal.id)
      await salaryIncome(15000, src.id, undefined)

      const res = await transferBetween(src.id, dst.id, 40000)
      assert.equal(res.status, 201)
      assert.equal(Number(res.data.data.sourceGoalId), goal.id)
      assert.equal(Number((await getGoalAmount(goal.id)).currentAmount), 0)
      const prisma = await getPrisma()
      const activities = await prisma.goalActivity.findMany({
        where: { transactionId: res.data.data.id },
      })
      assert.equal(activities.length, 1)
      assert.equal(Number(activities[0].amount), 25000)
    })

    it('rejects a partially ambiguous transfer when the shortfall spans multiple funded goals', async () => {
      const src = await createAccountWithBalance('PartialAmbiguous Src')
      const dst = await createAccountWithBalance('PartialAmbiguous Dst')
      const first = await createGoal('PartialAmbiguous A', src.id, '30000')
      const second = await createGoal('PartialAmbiguous B', src.id, '30000')
      await salaryIncome(15000, src.id, first.id)
      await salaryIncome(10000, src.id, second.id)
      await salaryIncome(15000, src.id, undefined)

      const res = await transferBetween(src.id, dst.id, 20000)
      assert.equal(res.status, 400)
      assert.match(res.data.message, /select the source goal/i)
      assert.equal(Number((await getGoalAmount(first.id)).currentAmount), 15000)
      assert.equal(Number((await getGoalAmount(second.id)).currentAmount), 10000)
      assert.equal(Number((await getAccountById(src.id)).balance), 40000)
    })
  })

  describe('account delete history protection', () => {
    it('archives an account with history and preserves its transactions', async () => {
      const bank = await request(state.base, 'POST', '/accounts', {
        name: 'History Bank',
        type: 'BANK',
        initialBalance: '0',
      }, { userId: state.testUserId })
      assert.equal(bank.status, 201)
      const cat = (await request(state.base, 'GET', '/categories', undefined, { userId: state.testUserId })).data.data.find((c) => c.name === 'Salary')
      const income = await request(state.base, 'POST', '/transactions', {
        description: 'Gaji',
        amount: '5000',
        type: 'INCOME',
        categoryId: cat.id,
        accountId: bank.data.data.id,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(income.status, 201)

      const res = await request(state.base, 'DELETE', `/accounts/${bank.data.data.id}`, undefined, { userId: state.testUserId })
      assert.equal(res.status, 200)
      assert.equal(res.data.data.archived, true)

      const txs = await listAccountTransactions(bank.data.data.id)
      assert.equal(txs.length, 1)
      assert.equal(txs[0].description, 'Gaji')

      const accounts = await getAccounts()
      assert.ok(!accounts.some((account) => account.id === bank.data.data.id))
    })

    it('hard-deletes an unused account', async () => {
      const fresh = await request(state.base, 'POST', '/accounts', {
        name: 'Unused Acct',
        type: 'BANK',
        initialBalance: '0',
      }, { userId: state.testUserId })
      assert.equal(fresh.status, 201)
      const res = await request(state.base, 'DELETE', `/accounts/${fresh.data.data.id}`, undefined, { userId: state.testUserId })
      assert.equal(res.status, 200)
      assert.equal(res.data.data.archived, false)
      const gone = await request(state.base, 'GET', `/accounts/${fresh.data.data.id}`, undefined, { userId: state.testUserId })
      assert.equal(gone.status, 404)
    })

    it('handles repeated deletion of an archived account idempotently', async () => {
      const bank = await request(state.base, 'POST', '/accounts', {
        name: 'Archive Idemp',
        type: 'BANK',
        initialBalance: '0',
      }, { userId: state.testUserId })
      assert.equal(bank.status, 201)
      const cat = (await request(state.base, 'GET', '/categories', undefined, { userId: state.testUserId })).data.data.find((c) => c.name === 'Salary')
      await request(state.base, 'POST', '/transactions', {
        description: 'Gaji',
        amount: '2000',
        type: 'INCOME',
        categoryId: cat.id,
        accountId: bank.data.data.id,
        date: today,
      }, { userId: state.testUserId })

      const first = await request(state.base, 'DELETE', `/accounts/${bank.data.data.id}`, undefined, { userId: state.testUserId })
      assert.equal(first.status, 200)
      assert.equal(first.data.data.archived, true)

      const second = await request(state.base, 'DELETE', `/accounts/${bank.data.data.id}`, undefined, { userId: state.testUserId })
      assert.equal(second.status, 200)
      assert.equal(second.data.data.archived, true)

      const txs = await listAccountTransactions(bank.data.data.id)
      assert.equal(txs.length, 1)
    })

    it('deactivates recurring transactions linked to an archived account', async () => {
      const bank = await request(state.base, 'POST', '/accounts', {
        name: 'Recur Archive Bank',
        type: 'BANK',
        initialBalance: '100000',
      }, { userId: state.testUserId })
      assert.equal(bank.status, 201)
      const cat = (await request(state.base, 'GET', '/categories', undefined, { userId: state.testUserId })).data.data.find((c) => c.name === 'Food')
      const rec = await request(state.base, 'POST', '/recurring-transactions', {
        description: 'Gym fee',
        amount: '10000',
        type: 'EXPENSE',
        categoryId: cat.id,
        accountId: bank.data.data.id,
        frequency: 'MONTHLY',
        startDate: today,
      }, { userId: state.testUserId })
      assert.equal(rec.status, 201)

      await request(state.base, 'DELETE', `/accounts/${bank.data.data.id}`, undefined, { userId: state.testUserId })

      const list = await request(state.base, 'GET', '/recurring-transactions', undefined, { userId: state.testUserId })
      const item = list.data.data.items.find((r) => r.id === rec.data.data.id)
      assert.equal(item.active, false)
    })

    it('rejects new transactions to an archived account', async () => {
      const bank = await request(state.base, 'POST', '/accounts', {
        name: 'Archived Reject Bank',
        type: 'BANK',
        initialBalance: '0',
      }, { userId: state.testUserId })
      assert.equal(bank.status, 201)
      const cat = (await request(state.base, 'GET', '/categories', undefined, { userId: state.testUserId })).data.data.find((c) => c.name === 'Food')
      await request(state.base, 'POST', '/transactions', {
        description: 'Seed',
        amount: '1000',
        type: 'EXPENSE',
        categoryId: cat.id,
        accountId: bank.data.data.id,
        date: today,
      }, { userId: state.testUserId })

      await request(state.base, 'DELETE', `/accounts/${bank.data.data.id}`, undefined, { userId: state.testUserId })

      const res = await request(state.base, 'POST', '/transactions', {
        description: 'Rejected',
        amount: '500',
        type: 'EXPENSE',
        categoryId: cat.id,
        accountId: bank.data.data.id,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(res.status, 400)
      assert.equal(res.data.message, 'This account has been deleted.')
    })
  })

  describe('transfer delete with goals', () => {
    async function createAccountWithBalance(name, initialBalance = '0') {
      const res = await request(state.base, 'POST', '/accounts', {
        name, type: 'SAVINGS', initialBalance,
      }, { userId: state.testUserId })
      assert.equal(res.status, 201)
      return res.data.data
    }

    async function createGoal(name, accountId) {
      const res = await request(state.base, 'POST', '/goals', {
        name, targetAmount: '100000', accountId,
      }, { userId: state.testUserId })
      assert.equal(res.status, 201)
      return res.data.data
    }

    async function salaryIncome(amount, accountId, goalId) {
      const salary = (await request(state.base, 'GET', '/categories', undefined, { userId: state.testUserId })).data.data.find((c) => c.name === 'Salary')
      const res = await request(state.base, 'POST', '/transactions', {
        description: 'Deposit',
        amount: String(amount),
        type: 'INCOME',
        categoryId: salary.id,
        accountId,
        goalId,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(res.status, 201)
    }

    async function transferBetween(srcId, dstId, amount, overrides = {}) {
      const res = await request(state.base, 'POST', '/transactions', {
        description: 'Move',
        amount: String(amount),
        type: 'TRANSFER',
        accountId: srcId,
        transferAccountId: dstId,
        date: today,
        ...overrides,
      }, { userId: state.testUserId })
      assert.equal(res.status, 201)
      return res.data.data
    }

    async function getGoalAmount(id) {
      const res = await request(state.base, 'GET', `/goals/${id}`, undefined, { userId: state.testUserId })
      return res.data.data
    }

    it('restores the source goal when the transfer is deleted', async () => {
      const src = await createAccountWithBalance('DelSrcGoal Src')
      const dst = await createAccountWithBalance('DelSrcGoal Dst')
      const goal = await createGoal('DelSrcGoal Goal', src.id)
      await salaryIncome(15000, src.id, goal.id)
      assert.equal(Number((await getGoalAmount(goal.id)).currentAmount), 15000)

      const transfer = await transferBetween(src.id, dst.id, 15000, { sourceGoalId: goal.id })
      assert.equal(Number((await getGoalAmount(goal.id)).currentAmount), 0)

      const res = await request(state.base, 'DELETE', `/transactions/${transfer.id}`, undefined, { userId: state.testUserId })
      assert.equal(res.status, 200)
      assert.equal(Number((await getGoalAmount(goal.id)).currentAmount), 15000)
      assert.equal(Number((await getAccountById(src.id)).balance), 15000)
      assert.equal(Number((await getAccountById(dst.id)).balance), 0)
    })

    it('restores the destination goal when the transfer is deleted', async () => {
      const src = await createAccountWithBalance('DelDstGoal Src')
      const dst = await createAccountWithBalance('DelDstGoal Dst')
      const goal = await createGoal('DelDstGoal Goal', dst.id)
      await salaryIncome(15000, src.id, null)
      const transfer = await transferBetween(src.id, dst.id, 15000, { goalId: goal.id })
      assert.equal(Number((await getGoalAmount(goal.id)).currentAmount), 15000)

      await request(state.base, 'DELETE', `/transactions/${transfer.id}`, undefined, { userId: state.testUserId })
      assert.equal(Number((await getGoalAmount(goal.id)).currentAmount), 0)
      assert.equal(Number((await getAccountById(src.id)).balance), 15000)
      assert.equal(Number((await getAccountById(dst.id)).balance), 0)
    })

    it('reverts both source and destination goals when a dual-goal transfer is deleted', async () => {
      const src = await createAccountWithBalance('DelDualGoal Src')
      const dst = await createAccountWithBalance('DelDualGoal Dst')
      const srcGoal = await createGoal('DelDualGoal SrcGoal', src.id)
      const dstGoal = await createGoal('DelDualGoal DstGoal', dst.id)
      await salaryIncome(10000, src.id, srcGoal.id)
      await salaryIncome(10000, dst.id, dstGoal.id)

      const transfer = await transferBetween(src.id, dst.id, 10000, {
        sourceGoalId: srcGoal.id,
        goalId: dstGoal.id,
      })
      assert.equal(Number((await getGoalAmount(srcGoal.id)).currentAmount), 0)
      assert.equal(Number((await getGoalAmount(dstGoal.id)).currentAmount), 20000)

      await request(state.base, 'DELETE', `/transactions/${transfer.id}`, undefined, { userId: state.testUserId })
      assert.equal(Number((await getGoalAmount(srcGoal.id)).currentAmount), 10000)
      assert.equal(Number((await getGoalAmount(dstGoal.id)).currentAmount), 10000)
      assert.equal(Number((await getAccountById(src.id)).balance), 10000)
      assert.equal(Number((await getAccountById(dst.id)).balance), 10000)
    })

    it('removes exactly one transfer when several link the same accounts', async () => {
      const src = await createAccountWithBalance('DelSeries Src', '30000')
      const dst = await createAccountWithBalance('DelSeries Dst', '0')
      const first = await transferBetween(src.id, dst.id, 10000)
      const second = await transferBetween(src.id, dst.id, 5000)
      assert.equal(Number((await getAccountById(src.id)).balance), 15000)
      assert.equal(Number((await getAccountById(dst.id)).balance), 15000)

      await request(state.base, 'DELETE', `/transactions/${first.id}`, undefined, { userId: state.testUserId })

      const list = await listAccountTransactions(src.id)
      assert.equal(list.length, 1)
      assert.equal(list[0].id, second.id)
      assert.equal(Number((await getAccountById(src.id)).balance), 25000)
      assert.equal(Number((await getAccountById(dst.id)).balance), 5000)
    })
  })

  describe('transfer delete regression (Sasa/Dana report)', () => {
    async function createAccount(name, type = 'SAVINGS', initialBalance = '0') {
      const res = await request(state.base, 'POST', '/accounts', { name, type, initialBalance }, { userId: state.testUserId })
      assert.equal(res.status, 201)
      return res.data.data
    }

    async function createGoal(name, accountId, targetAmount = '500000') {
      const res = await request(state.base, 'POST', '/goals', { name, targetAmount, accountId }, { userId: state.testUserId })
      assert.equal(res.status, 201)
      return res.data.data
    }

    async function categoryByName(name) {
      const res = await request(state.base, 'GET', '/categories', undefined, { userId: state.testUserId })
      return res.data.data.find((c) => c.name === name)
    }

    async function income(amount, accountId, goalId, description) {
      const salary = await categoryByName('Salary')
      const res = await request(state.base, 'POST', '/transactions', {
        description,
        amount: String(amount),
        type: 'INCOME',
        categoryId: salary.id,
        accountId,
        goalId,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(res.status, 201)
    }

    async function expense(amount, accountId, description) {
      const food = await categoryByName('Food')
      const res = await request(state.base, 'POST', '/transactions', {
        description,
        amount: String(amount),
        type: 'EXPENSE',
        categoryId: food.id,
        accountId,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(res.status, 201)
    }

    async function transferBetween(srcId, dstId, amount, overrides = {}) {
      const res = await request(state.base, 'POST', '/transactions', {
        description: 'Reg Pindah',
        amount: String(amount),
        type: 'TRANSFER',
        accountId: srcId,
        transferAccountId: dstId,
        date: today,
        ...overrides,
      }, { userId: state.testUserId })
      assert.equal(res.status, 201)
      return res.data.data
    }

    async function getGoalAmount(id) {
      const res = await request(state.base, 'GET', `/goals/${id}`, undefined, { userId: state.testUserId })
      return res.data.data
    }

    async function recomputeAccountBalance(accountId) {
      const prisma = await getPrisma()
      const Decimal = await getDecimal()
      const account = await prisma.account.findUnique({ where: { id: accountId } })
      const rows = await prisma.transaction.findMany({
        where: { userId: state.testUserId, OR: [{ accountId }, { transferAccountId: accountId }] },
        select: { type: true, amount: true, accountId: true, transferAccountId: true },
      })
      let balance = new Decimal(Number(account.initialBalance))
      for (const row of rows) {
        const isSource = Number(row.accountId) === accountId
        const isDest = Number(row.transferAccountId) === accountId
        if (isSource) {
          if (row.type === 'INCOME') balance = balance.plus(row.amount)
          else if (row.type === 'EXPENSE') balance = balance.minus(row.amount)
          else balance = balance.minus(row.amount)
        } else if (isDest && row.type === 'TRANSFER') {
          balance = balance.plus(row.amount)
        }
      }
      return Number(balance)
    }

    async function recomputeGoalAmount(goalId) {
      const prisma = await getPrisma()
      const Decimal = await getDecimal()
      const rows = await prisma.goalActivity.findMany({
        where: { goalId },
        select: { type: true, amount: true },
      })
      let current = new Decimal(0)
      for (const row of rows) {
        current = row.type === 'CONTRIBUTION' ? current.plus(row.amount) : current.minus(row.amount)
      }
      return current.isNegative() ? 0 : Number(current)
    }

    it('reproduces the reported Sasa/Dana case and reverts correctly even when Sasa was already negative', async () => {
      const dana = await createAccount('Reg Dana', 'SAVINGS', '435000')
      const sasa = await createAccount('Reg Sasa', 'SAVINGS', '0')
      const nasi = await createGoal('Reg Nasi Tumpeng', dana.id)
      const laptop = await createGoal('Reg Laptop Baru', sasa.id)

      await income(365000, dana.id, nasi.id, 'Deposit nasi')
      await expense(15000, sasa.id, 'Belanja sasa')
      assert.equal(Number((await getAccountById(dana.id)).balance), 800000)
      assert.equal(Number((await getAccountById(sasa.id)).balance), -15000)
      assert.equal(Number((await getGoalAmount(nasi.id)).currentAmount), 365000)
      assert.equal(Number((await getGoalAmount(laptop.id)).currentAmount), 0)

      const transfer = await transferBetween(dana.id, sasa.id, 15000, {
        sourceGoalId: nasi.id,
        goalId: laptop.id,
      })
      assert.equal(Number((await getAccountById(dana.id)).balance), 785000)
      assert.equal(Number((await getAccountById(sasa.id)).balance), 0)
      assert.equal(Number((await getGoalAmount(nasi.id)).currentAmount), 350000)
      assert.equal(Number((await getGoalAmount(laptop.id)).currentAmount), 15000)

      const res = await request(state.base, 'DELETE', `/transactions/${transfer.id}`, undefined, { userId: state.testUserId })
      assert.equal(res.status, 200)
      assert.equal(Number((await getAccountById(dana.id)).balance), 800000)
      assert.equal(Number((await getAccountById(sasa.id)).balance), -15000)
      assert.equal(Number((await getGoalAmount(nasi.id)).currentAmount), 365000)
      assert.equal(Number((await getGoalAmount(laptop.id)).currentAmount), 0)

      assert.equal(await recomputeAccountBalance(dana.id), 800000)
      assert.equal(await recomputeAccountBalance(sasa.id), -15000)
      assert.equal(await recomputeGoalAmount(nasi.id), 365000)
      assert.equal(await recomputeGoalAmount(laptop.id), 0)
    })

    it('restores Sasa to exactly 0 when the true pre-transfer balance is 0', async () => {
      const dana = await createAccount('Reg Src', 'SAVINGS', '100000')
      const sasa = await createAccount('Reg Dst', 'SAVINGS', '0')
      const srcGoal = await createGoal('Reg Src Goal', dana.id)
      const dstGoal = await createGoal('Reg Dst Goal', sasa.id)

      await income(15000, dana.id, srcGoal.id, 'Deposit src')
      const transfer = await transferBetween(dana.id, sasa.id, 15000, {
        sourceGoalId: srcGoal.id,
        goalId: dstGoal.id,
      })
      assert.equal(Number((await getAccountById(dana.id)).balance), 100000)
      assert.equal(Number((await getAccountById(sasa.id)).balance), 15000)

      await request(state.base, 'DELETE', `/transactions/${transfer.id}`, undefined, { userId: state.testUserId })
      assert.equal(Number((await getAccountById(dana.id)).balance), 115000)
      assert.equal(Number((await getAccountById(sasa.id)).balance), 0)
      assert.equal(Number((await getGoalAmount(srcGoal.id)).currentAmount), 15000)
      assert.equal(Number((await getGoalAmount(dstGoal.id)).currentAmount), 0)
      assert.equal(await recomputeAccountBalance(sasa.id), 0)
    })

    it('returns 404 on a second delete and does not reverse again', async () => {
      const src = await createAccount('Reg Idem Src', 'SAVINGS', '10000')
      const dst = await createAccount('Reg Idem Dst', 'SAVINGS', '0')
      const transfer = await transferBetween(src.id, dst.id, 5000)

      const first = await request(state.base, 'DELETE', `/transactions/${transfer.id}`, undefined, { userId: state.testUserId })
      assert.equal(first.status, 200)
      const second = await request(state.base, 'DELETE', `/transactions/${transfer.id}`, undefined, { userId: state.testUserId })
      assert.equal(second.status, 404)
      assert.equal(second.data.message, 'Transaction not found.')
      assert.equal(Number((await getAccountById(src.id)).balance), 10000)
      assert.equal(Number((await getAccountById(dst.id)).balance), 0)
      assert.equal(await recomputeAccountBalance(src.id), 10000)
      assert.equal(await recomputeAccountBalance(dst.id), 0)
    })

    it('deleting the first of three sequential transfers leaves the later two intact', async () => {
      const src = await createAccount('Reg Seq Src', 'SAVINGS', '50000')
      const dst = await createAccount('Reg Seq Dst', 'SAVINGS', '0')
      const first = await transferBetween(src.id, dst.id, 10000)
      const second = await transferBetween(src.id, dst.id, 5000)
      const third = await transferBetween(src.id, dst.id, 2000)
      assert.equal(Number((await getAccountById(src.id)).balance), 33000)
      assert.equal(Number((await getAccountById(dst.id)).balance), 17000)

      await request(state.base, 'DELETE', `/transactions/${first.id}`, undefined, { userId: state.testUserId })
      assert.equal(Number((await getAccountById(src.id)).balance), 43000)
      assert.equal(Number((await getAccountById(dst.id)).balance), 7000)

      const list = await listAccountTransactions(src.id)
      assert.equal(list.length, 2)
      const ids = list.map((t) => t.id).sort()
      assert.deepEqual(ids, [second.id, third.id].sort())
      const gone = await request(state.base, 'GET', `/transactions/${first.id}`, undefined, { userId: state.testUserId })
      assert.equal(gone.status, 404)
      assert.equal(await recomputeAccountBalance(src.id), 43000)
      assert.equal(await recomputeAccountBalance(dst.id), 7000)
    })

    it('deleting the middle transfer of three does not affect the other two', async () => {
      const src = await createAccount('Reg Mid Src', 'SAVINGS', '50000')
      const dst = await createAccount('Reg Mid Dst', 'SAVINGS', '0')
      const first = await transferBetween(src.id, dst.id, 10000)
      const middle = await transferBetween(src.id, dst.id, 5000)
      const third = await transferBetween(src.id, dst.id, 2000)

      await request(state.base, 'DELETE', `/transactions/${middle.id}`, undefined, { userId: state.testUserId })
      assert.equal(Number((await getAccountById(src.id)).balance), 38000)
      assert.equal(Number((await getAccountById(dst.id)).balance), 12000)

      const list = await listAccountTransactions(src.id)
      assert.equal(list.length, 2)
      const ids = list.map((t) => t.id).sort()
      assert.deepEqual(ids, [first.id, third.id].sort())
      assert.equal(Number((await getAccountById(src.id)).balance), await recomputeAccountBalance(src.id))
      assert.equal(Number((await getAccountById(dst.id)).balance), await recomputeAccountBalance(dst.id))
    })

    it('leaves unrelated accounts and their transactions untouched', async () => {
      const src = await createAccount('Reg Iso Src', 'SAVINGS', '10000')
      const dst = await createAccount('Reg Iso Dst', 'SAVINGS', '0')
      const unrelated = await createAccount('Reg Unrelated', 'SAVINGS', '5000')
      const food = await categoryByName('Food')
      const unrelatedTx = await request(state.base, 'POST', '/transactions', {
        description: 'Unrelated expense',
        amount: '2000',
        type: 'EXPENSE',
        categoryId: food.id,
        accountId: unrelated.id,
        date: today,
      }, { userId: state.testUserId })
      assert.equal(unrelatedTx.status, 201)

      const transfer = await transferBetween(src.id, dst.id, 3000)
      await request(state.base, 'DELETE', `/transactions/${transfer.id}`, undefined, { userId: state.testUserId })

      assert.equal(Number((await getAccountById(src.id)).balance), 10000)
      assert.equal(Number((await getAccountById(dst.id)).balance), 0)
      assert.equal(Number((await getAccountById(unrelated.id)).balance), 3000)
      assert.equal(await recomputeAccountBalance(unrelated.id), 3000)
      const list = await listAccountTransactions(unrelated.id)
      assert.equal(list.length, 1)
      assert.equal(list[0].id, unrelatedTx.data.data.id)
      assert.equal(Number(list[0].amount), 2000)
    })
  })
})