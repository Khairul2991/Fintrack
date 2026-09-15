import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isGoogleUser,
  googleIdentityId,
  matchesCurrentIdentity,
  confirmGoogleIdentity,
} from '../src/utils/googleReauth.js'

const GOOGLE_USER = {
  email: 'galih@example.com',
  app_metadata: { provider: 'google' },
  identities: [{ provider: 'google', id: 'google-sub-1' }],
}

function emailPasswordUser() {
  return {
    email: 'email@example.com',
    app_metadata: { provider: 'email' },
    identities: [{ provider: 'email' }],
  }
}

function createFakeSupabase({ session, oauthError } = {}) {
  let listener = null
  const calls = {
    oauthOptions: null,
    setSession: [],
  }
  return {
    calls,
    trigger(event, payload) {
      listener?.(event, payload)
    },
    auth: {
      async getSession() {
        return { data: { session: session ?? null } }
      },
      async signInWithOAuth(credentials) {
        calls.oauthOptions = credentials
        return {
          data: { url: 'https://accounts.google.com/o/oauth2/v2/auth?code_challenge=xx', provider: 'google' },
          error: oauthError ?? null,
        }
      },
      onAuthStateChange(callback) {
        listener = callback
        return { data: { subscription: { unsubscribe() {} } } }
      },
      async setSession(credentials) {
        calls.setSession.push(credentials)
        return { data: { session: null }, error: null }
      },
    },
  }
}

const BASE_SESSION = {
  access_token: 'old-access-token',
  refresh_token: 'old-refresh-token',
  expires_at: 1893456000,
  user: GOOGLE_USER,
}

function openPopup() {
  return { closed: false, close() { this.closed = true } }
}

describe('googleReauth - provider/identity helpers', () => {
  it('detects Google users from Supabase identity metadata only', () => {
    assert.equal(isGoogleUser(GOOGLE_USER), true)
    assert.equal(isGoogleUser({ email: 'x@y.com', app_metadata: { provider: 'google' }, identities: [] }), true)
    assert.equal(isGoogleUser({ email: 'x@y.com', app_metadata: {}, identities: [{ provider: 'google', id: 'sub' }] }), true)
    assert.equal(isGoogleUser(emailPasswordUser()), false)
    assert.equal(isGoogleUser(null), false)
    assert.equal(isGoogleUser({ email: 'x@y.com' }), false)
  })

  it('extracts the stable Google identity id', () => {
    assert.equal(googleIdentityId(GOOGLE_USER), 'google-sub-1')
    assert.equal(googleIdentityId(emailPasswordUser()), null)
    assert.equal(googleIdentityId(null), null)
  })

  it('matches identity via the Google sub first, then email as identity info', () => {
    assert.equal(matchesCurrentIdentity(GOOGLE_USER, GOOGLE_USER), true)
    assert.equal(
      matchesCurrentIdentity({ email: 'galih@example.com', identities: [{ provider: 'google', id: 'other-sub' }] }, GOOGLE_USER),
      false,
    )
    assert.equal(
      matchesCurrentIdentity({ email: 'OTHER@example.com', identities: [{ provider: 'google', id: 'google-sub-1' }] }, GOOGLE_USER),
      true,
    )
    assert.equal(
      matchesCurrentIdentity({ email: 'someone-else@example.com', identities: [{ provider: 'google', id: 'google-sub-9' }] }, GOOGLE_USER),
      false,
    )
  })
})

describe('googleReauth - confirmGoogleIdentity flow', () => {
  it('requests a forced Google account confirmation without redirecting the current tab', async () => {
    const supabase = createFakeSupabase({ session: BASE_SESSION })
    const popup = openPopup()
    const promise = confirmGoogleIdentity(supabase, GOOGLE_USER, {
      openWindow: () => popup,
      timeoutMs: 1000,
      pollMs: 1000,
    })
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(supabase.calls.oauthOptions.provider, 'google')
    const options = supabase.calls.oauthOptions.options
    assert.equal(options.skipBrowserRedirect, true)
    assert.equal(options.queryParams.prompt, 'select_account')
    assert.match(options.redirectTo, /reauth=google/)
    supabase.trigger('SIGNED_IN', { user: GOOGLE_USER })
    assert.equal(await promise, 'confirmed')
    assert.equal(popup.closed, true)
    assert.equal(supabase.calls.setSession.length, 0)
  })

  it('restores the original session and refuses deletion when identity differs', async () => {
    const supabase = createFakeSupabase({ session: BASE_SESSION })
    const promise = confirmGoogleIdentity(supabase, GOOGLE_USER, {
      openWindow: openPopup,
      timeoutMs: 1000,
      pollMs: 1000,
    })
    await new Promise((resolve) => setImmediate(resolve))
    supabase.trigger('SIGNED_IN', {
      user: { email: 'other@example.com', identities: [{ provider: 'google', id: 'other-sub' }] },
    })
    assert.equal(await promise, 'mismatch')
    assert.deepEqual(supabase.calls.setSession[0], {
      access_token: 'old-access-token',
      refresh_token: 'old-refresh-token',
      expires_at: 1893456000,
    })
  })

  it('treats a closed popup as a cancellation without deleting', async () => {
    const supabase = createFakeSupabase({ session: BASE_SESSION })
    const popup = { closed: true, close() {} }
    const promise = confirmGoogleIdentity(supabase, GOOGLE_USER, {
      openWindow: () => popup,
      timeoutMs: 1000,
      pollMs: 5,
    })
    assert.equal(await promise, 'cancelled')
    assert.deepEqual(supabase.calls.setSession[0], {
      access_token: 'old-access-token',
      refresh_token: 'old-refresh-token',
      expires_at: 1893456000,
    })
  })

  it('treats a sign-in timeout as a refusal to delete', async () => {
    const supabase = createFakeSupabase({ session: BASE_SESSION })
    const popup = openPopup()
    const promise = confirmGoogleIdentity(supabase, GOOGLE_USER, {
      openWindow: () => popup,
      timeoutMs: 10,
      pollMs: 1000,
    })
    assert.equal(await promise, 'timeout')
    assert.equal(popup.closed, true)
    assert.equal(supabase.calls.setSession.length, 1)
  })

  it('rejects when the popup is blocked', async () => {
    const supabase = createFakeSupabase({ session: BASE_SESSION })
    await assert.rejects(
      confirmGoogleIdentity(supabase, GOOGLE_USER, { openWindow: () => null, timeoutMs: 1000 }),
      /resetPopupBlocked/,
    )
  })

  it('rejects when an OAuth error occurs before anything is deleted', async () => {
    const supabase = createFakeSupabase({ session: BASE_SESSION, oauthError: new Error('invalid state') })
    await assert.rejects(
      confirmGoogleIdentity(supabase, GOOGLE_USER, { openWindow: openPopup, timeoutMs: 1000 }),
      /invalid state/,
    )
  })

  it('rejects when there is no current session to protect', async () => {
    const supabase = createFakeSupabase({ session: null })
    await assert.rejects(
      confirmGoogleIdentity(supabase, GOOGLE_USER, { openWindow: openPopup, timeoutMs: 1000 }),
      /resetNoSession/,
    )
  })

  it('rejects when the current user is not a Google user', async () => {
    const supabase = createFakeSupabase({ session: BASE_SESSION })
    await assert.rejects(
      confirmGoogleIdentity(supabase, emailPasswordUser(), { openWindow: openPopup, timeoutMs: 1000 }),
      /resetRequiresGoogleUser/,
    )
  })

  it('never calls signInWithOtp', async () => {
    const reauth = await import('../src/utils/googleReauth.js')
    assert.equal(Object.prototype.hasOwnProperty.call(reauth, 'signInWithOtp'), false)
  })
})