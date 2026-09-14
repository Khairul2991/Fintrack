import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { messages } from '../src/l10n/messages.js'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(DIR, '../src')

function read(rel) {
  return readFileSync(path.join(SRC, rel), 'utf8')
}

describe('Recurring edit - amount warning', () => {
  const form = read('components/recurring/RecurringTransactionForm.jsx')

  it('renders an informational hint below the amount input when editing', async () => {
    const amountIndex = form.indexOf('id="rect-amount"')
    const hintIndex = form.indexOf("t('recTf.editAmountHint')")
    assert.ok(amountIndex !== -1, 'amount input exists')
    assert.ok(hintIndex !== -1, 'edit hint exists')
    assert.ok(hintIndex > amountIndex, 'hint is placed below the amount input')
  })

  it('shows the hint only in edit mode and not as a validation error', async () => {
    assert.match(form, /\{recurring \? \(/)
    const hintBlock = form.slice(form.indexOf("t('recTf.editAmountHint')") - 200, form.indexOf("t('recTf.editAmountHint')"))
    assert.match(hintBlock, /border-info\/20/)
    assert.doesNotMatch(hintBlock, /text-error/)
  })

  it('is localized in English and Indonesian', async () => {
    assert.equal(
      messages.en['recTf.editAmountHint'],
      'Changing the amount will also update the amount on transactions already generated from this recurring transaction.',
    )
    assert.equal(
      messages.id['recTf.editAmountHint'],
      'Mengubah nominal juga akan memperbarui nominal pada transaksi yang sudah dibuat dari transaksi berulang ini.',
    )
  })
})
