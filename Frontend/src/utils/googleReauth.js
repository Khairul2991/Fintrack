export const GOOGLE_REAUTH_TIMEOUT_MS = 5 * 60 * 1000
export const GOOGLE_REAUTH_POLL_MS = 500
export const GOOGLE_REAUTH_WINDOW = 'popup=yes,width=520,height=640'

export function isGoogleUser(someUser) {
  if (!someUser) return false
  if (someUser.app_metadata?.provider === 'google') return true
  return Array.isArray(someUser.identities) && someUser.identities.some((identity) => identity?.provider === 'google')
}

export function googleIdentityId(someUser) {
  if (!Array.isArray(someUser?.identities)) return null
  const googleIdentity = someUser.identities.find((identity) => identity?.provider === 'google')
  return googleIdentity?.id ?? null
}

export function matchesCurrentIdentity(nextUser, currentUser) {
  const nextId = googleIdentityId(nextUser)
  const currentId = googleIdentityId(currentUser)
  if (nextId && currentId) return nextId === currentId
  return Boolean(nextUser?.email) && nextUser.email.toLowerCase() === String(currentUser?.email ?? '').toLowerCase()
}

function defaultOpenWindow(url) {
  if (typeof window === 'undefined') return null
  return window.open(url, 'fintrack-google-reauth', GOOGLE_REAUTH_WINDOW)
}

export function confirmGoogleIdentity(supabase, currentUser, options = {}) {
  const openWindow = options.openWindow || defaultOpenWindow
  const timeoutMs = options.timeoutMs ?? GOOGLE_REAUTH_TIMEOUT_MS
  const pollMs = options.pollMs ?? GOOGLE_REAUTH_POLL_MS

  return (async () => {
    if (!currentUser || !isGoogleUser(currentUser)) {
      throw new Error('resetRequiresGoogleUser')
    }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token || !session?.refresh_token) {
      throw new Error('resetNoSession')
    }
    const original = {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: typeof session.expires_at === 'number' ? session.expires_at : null,
    }
    const redirectTo = new URL(typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    redirectTo.searchParams.set('reauth', 'google')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo.toString(),
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) throw error
    const popup = openWindow(data.url)
    if (!popup) throw new Error('resetPopupBlocked')

    return new Promise((resolve) => {
      let settled = false
      let timer = null
      let interval = null

      const closePopup = () => {
        try {
          if (popup && !popup.closed) popup.close()
        } catch {
          // popup may already be gone
        }
      }

      const finish = (result) => {
        if (settled) return
        settled = true
        if (timer) clearTimeout(timer)
        if (interval) clearInterval(interval)
        subscription?.unsubscribe()
        resolve(result)
      }

      const restoreSessionAndFinish = (result) => {
        Promise.resolve(
          supabase.auth.setSession({
            access_token: original.accessToken,
            refresh_token: original.refreshToken,
            ...(original.expiresAt ? { expires_at: original.expiresAt } : {}),
          }),
        )
          .catch(() => {})
          .then(() => finish(result))
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (event !== 'SIGNED_IN' || settled) return
        const nextUser = nextSession?.user
        if (!nextUser) return
        closePopup()
        if (matchesCurrentIdentity(nextUser, currentUser)) {
          finish('confirmed')
        } else {
          restoreSessionAndFinish('mismatch')
        }
      })

      timer = setTimeout(() => {
        closePopup()
        restoreSessionAndFinish('timeout')
      }, timeoutMs)

      interval = setInterval(() => {
        if (popup && popup.closed && !settled) {
          restoreSessionAndFinish('cancelled')
        }
      }, pollMs)
    })
  })()
}