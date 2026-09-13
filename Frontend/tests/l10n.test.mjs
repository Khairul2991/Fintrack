import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { messages, DEFAULT_LANG, LANGUAGES } from '../src/l10n/messages.js'
import { translateError } from '../src/l10n/serverMessages.js'
import { translateInsight } from '../src/l10n/insights.js'
import { formatDate, formatDateTime, formatMonth, toLocalInputValue, toUtcInputValue } from '../src/utils/format.js'

describe('l10n - message catalog parity', () => {
  const enKeys = Object.keys(messages.en).sort()
  const idKeys = Object.keys(messages.id).sort()

  it('has the same keys in English and Indonesian', () => {
    assert.deepEqual(idKeys, enKeys)
  })

  it('exposes the supported languages and default', () => {
    assert.equal(DEFAULT_LANG, 'en')
    assert.deepEqual(
      LANGUAGES.map((l) => l.value),
      ['en', 'id'],
    )
  })

  it('translates a nav label', () => {
    assert.equal(messages.en['nav.dashboard'], 'Dashboard')
    assert.equal(messages.id['nav.dashboard'], 'Dasbor')
  })

  it('uses en values as the source when an interpolated key is present', () => {
    assert.match(messages.en['tx.showing'], /\{from\}/)
  })
})

describe('l10n - translateError', () => {
  it('returns the message unchanged for English', () => {
    assert.equal(translateError('Category not found.', 'en'), 'Category not found.')
  })

  it('translates known backend messages to Indonesian', () => {
    assert.equal(translateError('Category not found.', 'id'), 'Kategori tidak ditemukan.')
    assert.equal(
      translateError('This category cannot be deleted because it is currently in use.', 'id'),
      'Kategori ini tidak dapat dihapus karena sedang digunakan.',
    )
  })

  it('falls back to the original message for unknown strings', () => {
    assert.equal(translateError('Some unexpected error', 'id'), 'Some unexpected error')
  })
})

describe('l10n - translateInsight', () => {
  it('returns the text unchanged for English', () => {
    const text = 'Your expenses increased compared to last month.'
    assert.equal(translateInsight(text, 'en'), text)
  })

  it('translates the increased insight', () => {
    assert.equal(
      translateInsight('Your expenses increased compared to last month.', 'id'),
      'Pengeluaran Anda meningkat dibanding bulan lalu.',
    )
  })

  it('translates the decreased insight', () => {
    assert.equal(
      translateInsight('Your expenses decreased compared to last month.', 'id'),
      'Pengeluaran Anda menurun dibanding bulan lalu.',
    )
  })

  it('translates the highest-category insight and keeps the category name', () => {
    assert.equal(
      translateInsight('Food is your highest spending category this month.', 'id'),
      'Food adalah kategori pengeluaran tertinggi bulan ini.',
    )
  })

  it('translates the exceeded-budget insight and keeps the category name', () => {
    assert.equal(
      translateInsight('You have exceeded your Food budget.', 'id'),
      'Anda telah melebihi anggaran Food.',
    )
  })

  it('falls back to the original text for unknown insights', () => {
    const text = 'Some other insight text'
    assert.equal(translateInsight(text, 'id'), text)
  })
})

describe('l10n - language-aware dates', () => {
  it('formats a date in English and Indonesian', () => {
    const en = formatDate('2026-08-10', 'en')
    const id = formatDate('2026-08-10', 'id')
    assert.match(en, /August/i)
    assert.match(id, /Agustus/i)
  })

  it('formats a month label in English and Indonesian', () => {
    const en = formatMonth('2026-08', 'en')
    const id = formatMonth('2026-08', 'id')
    assert.match(en, /Aug/i)
    assert.match(id, /Agu/i)
  })

it('formats a full date-time with minute precision and no seconds', () => {
    const iso = '2026-09-10T14:35:27.000Z'
    const options = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      hour12: false,
      minute: '2-digit',
    }
    const expectedEn = new Intl.DateTimeFormat('en-GB', options).format(new Date(iso))
    const expectedId = new Intl.DateTimeFormat('id-ID', options).format(new Date(iso))
    assert.equal(formatDateTime(iso, 'en'), expectedEn)
    assert.equal(formatDateTime(iso, 'id'), expectedId)
    assert.doesNotMatch(formatDateTime(iso, 'en'), /AM|PM/i)
    assert.doesNotMatch(formatDateTime(iso, 'en'), /\d{2}:\d{2}:\d{2}/)
    assert.match(formatDateTime(iso, 'en'), /Sep/)
    assert.match(formatDateTime(iso, 'en'), /2026/)
  })

  it('falls back to date-only formatting for date-only values', () => {
    const en = formatDateTime('2026-08-10', 'en')
    assert.equal(en, formatDate('2026-08-10', 'en'))
    assert.match(en, /August/i)
  })
})

describe('l10n - datetime input conversion', () => {
  it('converts a local datetime input to a UTC-naive string for the backend', () => {
    const utc = toUtcInputValue('2026-09-10T14:35')
    assert.match(utc, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
    const roundTrip = toLocalInputValue(`${utc}Z`)
    assert.equal(roundTrip.slice(0, 16), '2026-09-10T14:35')
  })

  it('preserves seconds when converting a datetime input', () => {
    const input = '2026-01-05T08:09:10'
    const utc = toUtcInputValue(input)
    const back = toLocalInputValue(`${utc}Z`)
    assert.equal(back.slice(0, 19), input)
  })

  it('round-trips a stored instant through local input without shifting time', () => {
    const iso = '2026-09-10T07:35:27.000Z'
    const value = toLocalInputValue(iso)
    assert.equal(toUtcInputValue(value), '2026-09-10T07:35:27')
  })

  it('passes through invalid datetime input values unchanged', () => {
    assert.equal(toUtcInputValue('2026-13-40T00:00'), '2026-13-40T00:00')
    assert.equal(toUtcInputValue(''), '')
  })
})