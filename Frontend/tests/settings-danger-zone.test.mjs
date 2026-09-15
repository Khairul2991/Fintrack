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

describe('Settings danger zone - static wiring', () => {
  const page = read('pages/SettingsPage.jsx')
  const userApi = read('services/userApi.js')
  const reauth = read('utils/googleReauth.js')

  it('renders a danger zone that opens a two-step confirmation', async () => {
    assert.match(page, /set\.dangerTitle/)
    assert.match(page, /set\.deleteAllDataTitle/)
    assert.match(page, /set\.deleteAllDataConfirmTitle/)
    assert.match(page, /resetMyData/)
  })

  it('verifies the email/password user with Supabase before resetting', async () => {
    assert.match(page, /signInWithPassword/)
    assert.match(page, /set\.wrongPassword/)
  })

  it('keeps the password flow intact (no refactor to the email/password path)', async () => {
    assert.match(page, /set\.deleteAllDataPasswordLabel/)
    assert.match(page, /handlePasswordResetConfirm/)
    assert.match(page, /resetSecret\.trim\(\) === ''/)
    assert.doesNotMatch(page, /resetTfWithPassword/)
  })

  it('uses Google re-authentication for Google users, never email as a secret', async () => {
    assert.match(page, /isGoogleUser/)
    assert.match(page, /confirmGoogleIdentity/)
    assert.match(page, /set\.googleConfirmButton/)
    assert.match(page, /set\.googleConfirmDesc/)
    assert.doesNotMatch(page, /reset-email/)
    assert.doesNotMatch(page, /set\.deleteAllDataEmailLabel/)
    assert.doesNotMatch(page, /set\.emailMismatch/)
    assert.doesNotMatch(page, /set\.oauthNoPassword/)
    assert.doesNotMatch(page, /signInWithOtp/)
  })

  it('only calls the reset endpoint after Google re-authentication succeeds', async () => {
    const googleStart = page.indexOf('async function handleGoogleResetConfirm')
    assert.ok(googleStart !== -1)
    const boundary = page.indexOf('async function handleChangePassword', googleStart)
    const googleBlock = page.slice(googleStart, boundary !== -1 ? boundary : googleStart + 1000)
    const gate = googleBlock.indexOf("result !== 'confirmed'")
    const resetCall = googleBlock.indexOf('resetMyData()')
    assert.ok(gate !== -1, 'gate missing')
    assert.ok(resetCall !== -1, 'reset call missing')
    assert.ok(gate < resetCall, 'reset must run after the confirmation gate')
  })

  it('re-authenticates through Supabase OAuth and verifies the returned identity', async () => {
    assert.match(reauth, /signInWithOAuth/)
    assert.match(reauth, /skipBrowserRedirect: true/)
    assert.match(reauth, /prompt: 'select_account'/)
    assert.match(reauth, /matchesCurrentIdentity/)
    assert.match(reauth, /setSession/)
    assert.match(reauth, /provider: 'google'/)
  })

  it('detects Google users from real Supabase identity metadata only', async () => {
    assert.match(reauth, /app_metadata\?\.provider === 'google'/)
    assert.match(reauth, /identities\.some/)
  })

  it('does not store credentials anywhere new', async () => {
    assert.doesNotMatch(reauth, /localStorage/)
    assert.doesNotMatch(reauth, /sessionStorage/)
    assert.doesNotMatch(page, /localStorage/)
    assert.doesNotMatch(page, /sessionStorage/)
  })

  it('calls the current-user reset endpoint and refreshes state afterwards', async () => {
    assert.match(userApi, /\/users\/me\/data/)
    assert.match(page, /window\.location\.reload\(\)/)
  })

  it('is localized in English and Indonesian', async () => {
    assert.equal(messages.en['set.deleteAllDataButton'], 'Delete All Data Permanently')
    assert.equal(messages.id['set.deleteAllDataButton'], 'Hapus Semua Data Secara Permanen')
    assert.equal(messages.en['set.wrongPassword'], 'Incorrect password. No data was deleted.')
    assert.equal(messages.id['set.wrongPassword'], 'Password salah. Tidak ada data yang dihapus.')
    assert.equal(messages.en['set.googleConfirmButton'], 'Continue with Google')
    assert.equal(messages.id['set.googleConfirmButton'], 'Lanjutkan dengan Google')
    assert.equal(messages.en['set.googleReauthMismatch'].includes('No data was deleted'), true)
    assert.equal(messages.id['set.googleReauthMismatch'].includes('Tidak ada data yang dihapus'), true)
    assert.equal(messages.en['set.resetDoneTitle'], 'All data deleted')
    assert.equal(messages.id['set.resetDoneTitle'], 'Semua data dihapus')
  })

  it('removes the old email-as-secret confirmation keys from both languages', async () => {
    assert.equal(messages.en['set.deleteAllDataEmailLabel'], undefined)
    assert.equal(messages.id['set.deleteAllDataEmailLabel'], undefined)
    assert.equal(messages.en['set.emailMismatch'], undefined)
    assert.equal(messages.id['set.emailMismatch'], undefined)
    assert.equal(messages.en['set.oauthNoPassword'], undefined)
    assert.equal(messages.id['set.oauthNoPassword'], undefined)
  })
})