import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { messages } from '../src/l10n/messages.js'
import { formatTime } from '../src/utils/format.js'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(DIR, '../src')

function read(rel) {
  return readFileSync(path.join(SRC, rel), 'utf8')
}

describe('Transaction detail popup - message catalogs', () => {
  const DETAIL_KEYS = [
    'tx.detailTitle',
    'tx.detailDialogAria',
    'tx.detailBlockedTitle',
    'tx.detailTime',
    'tx.detailSource',
    'tx.detailDestination',
    'tx.detailNote',
    'tx.archivedBadge',
  ]
  const REUSED_KEYS = [
    'tx.colDate',
    'tx.colType',
    'tx.colAmount',
    'tx.colCategory',
    'tx.colAccount',
    'tx.colGoal',
    'tx.infoTransfer',
    'tx.infoRecurring',
    'tx.infoArchivedAccount',
    'tx.infoArchivedDest',
    'tx.infoClose',
    'tx.infoAria',
  ]

  for (const lang of ['en', 'id']) {
    it(`provides every detail key in ${lang}`, () => {
      const keys = Object.keys(messages[lang])
      for (const key of [...DETAIL_KEYS, ...REUSED_KEYS]) {
        assert.ok(keys.includes(key), `${key} missing in ${lang}`)
      }
    })

    it(`drops the obsolete edit-blocked-only dialog keys in ${lang}`, () => {
      assert.equal(messages[lang]['tx.infoTitle'], undefined)
      assert.equal(messages[lang]['tx.infoDialogAria'], undefined)
    })
  }

  it('translates the detail popup copy', () => {
    assert.equal(messages.en['tx.detailTitle'], 'Transaction Details')
    assert.equal(messages.id['tx.detailTitle'], 'Detail Transaksi')
    assert.equal(messages.en['tx.archivedBadge'], 'Archived')
    assert.equal(messages.id['tx.archivedBadge'], 'Diarsipkan')
    assert.equal(messages.en['tx.infoAria'], 'View details for {name}')
    assert.equal(messages.id['tx.infoAria'], 'Lihat detail {name}')
  })
})

describe('Transaction detail popup - static wiring', () => {
  const table = read('components/transactions/TransactionTable.jsx')

  it('opens from the info button in the row actions', () => {
    assert.match(table, /t\('tx\.infoAria'/)
    assert.match(table, /onClick=\{\(\) => setDetailTransaction\(transaction\)\}/)
  })

  it('only offers an info button to transactions that cannot be edited', () => {
    assert.match(table, /isTransfer \|\| isRecurring \|\| account\?\.deletedAt \|\| dest\?\.deletedAt/)
    assert.match(table, /tx\.editAria/)
    assert.match(table, /tx\.deleteAria/)
  })

  it('renders a details dialog with grouped rows and the reason section', () => {
    assert.match(table, /t\('tx\.detailTitle'\)/)
    assert.match(table, /t\('tx\.detailDialogAria'/)
    assert.match(table, /t\('tx\.detailBlockedTitle'\)/)
    assert.match(table, /t\('tx\.detailTime'\)/)
    assert.match(table, /t\('tx\.detailSource'\)/)
    assert.match(table, /t\('tx\.detailDestination'\)/)
    assert.match(table, /t\('tx\.detailNote'\)/)
    assert.match(table, /t\('tx\.colDate'\)/)
    assert.match(table, /formatDate\(detailTransaction\.date, lang\)/)
    assert.match(table, /formatTime\(detailTransaction\.date, lang\)/)
    assert.match(table, /formatCurrency\(detailTransaction\.amount\)/)
    assert.match(table, /localizeCategory\(detailTransaction\.category\)/)
    assert.match(table, /accountDisplayName\(name, t\)/)
  })

  it('shows a source and destination only for a transfer', () => {
    assert.match(table, /detailTransaction\.type === 'TRANSFER'/)
    assert.match(table, /tx\.detailSource/)
    assert.match(table, /tx\.detailDestination/)
    assert.match(table, /resolveDest\(detailTransaction\)/)
  })

  it('keeps every edit-blocked reason visible in the popup', () => {
    assert.match(table, /editBlockedReasons\(transaction\)/)
    assert.match(table, /editBlockedReasons\(detailTransaction\)/)
    for (const key of ['tx.infoTransfer', 'tx.infoRecurring', 'tx.infoArchivedAccount', 'tx.infoArchivedDest']) {
      assert.match(table, new RegExp(`'${key}'`))
    }
  })

  it('shows an archived marker on historical accounts', () => {
    assert.match(table, /name\.deletedAt/)
    assert.match(table, /t\('tx\.archivedBadge'\)/)
  })

  it('closes from Escape, the backdrop, and the close button', () => {
    assert.match(table, /event\.key === 'Escape'/)
    assert.match(table, /modal-backdrop/)
    assert.match(table, /t\('common\.closeDialog'\)/)
    assert.match(table, /t\('tx\.infoClose'\)/)
    assert.match(table, /setDetailTransaction\(null\)/)
    assert.doesNotMatch(table, /tx\.infoTitle/)
    assert.doesNotMatch(table, /tx\.infoDialogAria/)
  })
})

describe('formatTime', () => {
  it('returns a two-digit hour and minute for a date-time timestamp', () => {
    assert.match(formatTime('2026-09-14T14:20:00.000Z'), /^\d{2}:\d{2}$/)
  })

  it('returns an em dash for a date-only value', () => {
    assert.equal(formatTime('2026-09-14'), '—')
  })

  it('returns an em dash for an invalid value', () => {
    assert.equal(formatTime('not-a-date'), '—')
  })
})