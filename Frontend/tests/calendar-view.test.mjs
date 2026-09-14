import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGridCells,
  dayKeyOf,
  endDateOfMonth,
  formatMonthLong,
  groupTransactionsByDay,
  isToday,
  notableDayKeys,
  sameMonth,
  shiftMonth,
  startDateOfMonth,
  summarizeDay,
  summarizeMonth,
  summarizeTransactionList,
  todayKey,
  viewForDateKey,
  viewKey,
  weekdayLabels,
} from '../src/utils/calendarView.js'

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

describe('dayKeyOf', () => {
  it('extracts the day key from an ISO timestamp string', () => {
    assert.equal(dayKeyOf('2026-09-12T14:30:00.000Z'), '2026-09-12')
    assert.equal(dayKeyOf('2026-01-05'), '2026-01-05')
  })

  it('formats a Date as UTC day key', () => {
    assert.equal(dayKeyOf(new Date(Date.UTC(2026, 8, 12, 23, 59, 59))), '2026-09-12')
  })

  it('returns null for invalid input', () => {
    assert.equal(dayKeyOf(null), null)
    assert.equal(dayKeyOf(undefined), null)
    assert.equal(dayKeyOf('not-a-date'), null)
    assert.equal(dayKeyOf(new Date('invalid')), null)
  })

  it('pads single-digit months and days', () => {
    assert.equal(dayKeyOf('2026-03-07T00:00:00.000Z'), '2026-03-07')
  })
})

describe('date helpers', () => {
  it('todayKey matches the current local date', () => {
    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    assert.equal(todayKey(), expected)
  })

  it('viewKey formats a padded YYYY-MM', () => {
    assert.equal(viewKey({ year: 2026, month: 9 }), '2026-09')
    assert.equal(viewKey({ year: 2026, month: 12 }), '2026-12')
  })

  it('viewForDateKey parses a day key', () => {
    assert.deepEqual(viewForDateKey('2026-09-12'), { year: 2026, month: 9 })
    assert.deepEqual(viewForDateKey('2026-12-31'), { year: 2026, month: 12 })
    assert.equal(viewForDateKey('garbage'), null)
  })

  it('startDateOfMonth and endDateOfMonth bound the month', () => {
    assert.equal(startDateOfMonth({ year: 2026, month: 9 }), '2026-09-01')
    assert.equal(endDateOfMonth({ year: 2026, month: 9 }), '2026-09-30')
    assert.equal(endDateOfMonth({ year: 2026, month: 2 }), '2026-02-28')
    assert.equal(endDateOfMonth({ year: 2028, month: 2 }), '2028-02-29')
  })

  it('shiftMonth crosses year boundaries', () => {
    assert.deepEqual(shiftMonth({ year: 2026, month: 1 }, -1), { year: 2025, month: 12 })
    assert.deepEqual(shiftMonth({ year: 2026, month: 12 }, 1), { year: 2027, month: 1 })
    assert.deepEqual(shiftMonth({ year: 2026, month: 9 }, 1), { year: 2026, month: 10 })
  })

  it('sameMonth compares month and year only', () => {
    assert.equal(sameMonth({ year: 2026, month: 9 }, { year: 2026, month: 9 }), true)
    assert.equal(sameMonth({ year: 2026, month: 9 }, { year: 2026, month: 10 }), false)
    assert.equal(sameMonth(null, { year: 2026, month: 9 }), false)
  })

  it('isToday only matches the current day key', () => {
    assert.equal(isToday(todayKey()), true)
    assert.equal(isToday('1900-01-01'), false)
  })
})

describe('weekdayLabels', () => {
  it('returns seven Monday-first labels', () => {
    const labels = weekdayLabels('en')
    assert.equal(labels.length, 7)
    assert.equal(labels[0], 'Mon')
    assert.deepEqual(labels, weekdayLabels('en'))
  })

  it('localizes weekday labels', () => {
    assert.equal(weekdayLabels('id')[0], 'Sen')
  })
})

describe('formatMonthLong', () => {
  it('formats month and year in English', () => {
    assert.equal(formatMonthLong('2026-09', 'en'), 'September 2026')
  })

  it('falls back to the raw value for an invalid month key', () => {
    assert.equal(formatMonthLong('nope', 'en'), 'nope')
  })
})

describe('buildGridCells', () => {
  it('starts the grid on Monday and covers the whole month', () => {
    const cells = buildGridCells(2026, 9)
    assert.equal(cells[0].key, '2026-08-31')
    assert.equal(cells[0].inMonth, false)
    assert.equal(cells.filter((cell) => cell.inMonth).length, 30)
    assert.equal(cells.length % 7, 0)
    assert.equal(cells.length, 35)
  })

  it('returns contiguous day keys in order', () => {
    const cells = buildGridCells(2026, 9)
    for (let i = 1; i < cells.length; i += 1) {
      const prev = new Date(`${cells[i - 1].key}T00:00:00.000Z`)
      const next = new Date(`${cells[i].key}T00:00:00.000Z`)
      assert.equal(next.getTime() - prev.getTime(), 86400000)
    }
  })

  it('every cell key is a valid YYYY-MM-DD and every row has seven cells', () => {
    const cells = buildGridCells(2026, 9)
    assert.ok(cells.every((cell) => DAY_RE.test(cell.key)))
    assert.equal(cells.length % 7, 0)
  })

  it('handles a short February without an empty trailing week', () => {
    const cells = buildGridCells(2026, 2)
    assert.equal(cells.filter((cell) => cell.inMonth).length, 28)
    assert.equal(cells.length % 7, 0)
    assert.equal(cells[0].inMonth, false)
    const lastInMonth = [...cells].reverse().find((cell) => cell.inMonth)
    assert.equal(lastInMonth.key, '2026-02-28')
  })

  it('marks adjacent-month days and keeps the final row complete', () => {
    const cells = buildGridCells(2026, 9)
    const lastRow = cells.slice(-7)
    assert.ok(lastRow.some((cell) => cell.inMonth))
    assert.equal(lastRow[lastRow.length - 1].inMonth, false)
  })
})

describe('groupTransactionsByDay', () => {
  it('groups transactions by day key and skips invalid dates', () => {
    const txs = [
      { id: 1, date: '2026-09-02T08:00:00.000Z' },
      { id: 2, date: '2026-09-02T20:00:00.000Z' },
      { id: 3, date: '2026-09-05T12:00:00.000Z' },
      { id: 4, date: 'garbage' },
    ]
    const byDay = groupTransactionsByDay(txs)
    assert.equal(byDay.get('2026-09-02').length, 2)
    assert.equal(byDay.get('2026-09-05').length, 1)
    assert.equal(byDay.size, 2)
  })

  it('notableDayKeys lists the days with activity', () => {
    const byDay = groupTransactionsByDay([
      { id: 1, date: '2026-09-02T00:00:00.000Z' },
      { id: 2, date: '2026-09-05T00:00:00.000Z' },
    ])
    assert.deepEqual(notableDayKeys(byDay).sort(), ['2026-09-02', '2026-09-05'])
  })
})

describe('summarizeTransactionList / summarizeDay', () => {
  const fixture = [
    { type: 'INCOME', amount: '100000' },
    { type: 'INCOME', amount: 50000 },
    { type: 'EXPENSE', amount: '40000' },
    { type: 'EXPENSE', amount: '15000' },
    { type: 'TRANSFER', amount: '20000' },
    { type: 'UNKNOWN', amount: '99999' },
  ]

  it('computes income, expense, transfers, count and net', () => {
    const summary = summarizeTransactionList(fixture)
    assert.equal(summary.income, 150000)
    assert.equal(summary.expense, 55000)
    assert.equal(summary.transfers, 1)
    assert.equal(summary.count, 6)
    assert.equal(summary.net, 95000)
  })

  it('summarizeDay produces the per-day totals', () => {
    const summary = summarizeDay([
      { type: 'INCOME', amount: '100000' },
      { type: 'EXPENSE', amount: '40000' },
    ])
    assert.deepEqual(summary, { count: 2, income: 100000, expense: 40000, transfers: 0, net: 60000 })
  })

  it('coerces numeric string amounts', () => {
    assert.equal(summarizeTransactionList([{ type: 'EXPENSE', amount: '12.5' }]).expense, 12.5)
  })
})

describe('summarizeMonth', () => {
  const view = { year: 2026, month: 9 }

  it('aggregates totals and day counts for the view month only', () => {
    const txs = [
      { id: 1, type: 'INCOME', amount: '100000', date: '2026-09-02T00:00:00.000Z' },
      { id: 2, type: 'EXPENSE', amount: '40000', date: '2026-09-02T00:00:00.000Z' },
      { id: 3, type: 'EXPENSE', amount: '15000', date: '2026-09-05T00:00:00.000Z' },
      { id: 4, type: 'TRANSFER', amount: '20000', date: '2026-09-20T00:00:00.000Z' },
      { id: 5, type: 'INCOME', amount: '50000', date: '2026-10-01T00:00:00.000Z' },
    ]
    const summary = summarizeMonth(txs, view)
    assert.equal(summary.income, 100000)
    assert.equal(summary.expense, 55000)
    assert.equal(summary.transfers, 1)
    assert.equal(summary.net, 45000)
    assert.equal(summary.count, 4)
    assert.equal(summary.incomeDays, 1)
    assert.equal(summary.expenseDays, 2)
    assert.equal(summary.activeDays, 3)
  })

  it('returns zero totals for an empty month', () => {
    const summary = summarizeMonth([], view)
    assert.deepEqual(summary, {
      count: 0,
      income: 0,
      expense: 0,
      transfers: 0,
      net: 0,
      incomeDays: 0,
      expenseDays: 0,
      activeDays: 0,
    })
  })

  it('ignores transactions with invalid dates', () => {
    const summary = summarizeMonth([{ id: 1, type: 'INCOME', amount: '100', date: 'nope' }], view)
    assert.equal(summary.count, 0)
  })
})