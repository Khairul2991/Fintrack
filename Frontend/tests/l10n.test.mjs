import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { messages, DEFAULT_LANG, LANGUAGES } from '../src/l10n/messages.js'
import { translateError } from '../src/l10n/serverMessages.js'
import { translateInsight } from '../src/l10n/insights.js'
import { formatDate, formatMonth } from '../src/utils/format.js'

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
})