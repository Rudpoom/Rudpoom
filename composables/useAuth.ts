export function useAuth() {
  const token = useState<string>('auth_token', () => (process.client ? (localStorage.getItem('token') || '') : ''))
  const isAuthenticated = computed(() => Boolean(token.value))
  const creditCents = useState<number>('credit_cents', () => 0)
  function decodeJwtPayload(t: string): any | null {
    const part = (t || '').split('.')[1]
    if (!part) return null
    try {
      // Convert base64url -> base64 and add padding
      let base = part.replace(/-/g, '+').replace(/_/g, '/')
      const pad = base.length % 4
      if (pad) base += '='.repeat(4 - pad)

      const json = (typeof atob !== 'undefined')
        ? atob(base)
        : Buffer.from(base, 'base64').toString('utf8')
      return JSON.parse(json)
    } catch {
      return null
    }
  }

  const isAdmin = computed(() => {
    if (!token.value) return false
    const payload = decodeJwtPayload(token.value)
    return Boolean(payload?.admin)
  })

  const isRider = computed(() => {
    if (!token.value) return false
    const payload = decodeJwtPayload(token.value)
    return Boolean(payload?.rider)
  })

  function setToken(t: string) {
    token.value = t
    if (process.client) {
      localStorage.setItem('token', t)
    }
    // refresh profile credit on token change
    refreshProfile()
  }

  function clearToken() {
    token.value = ''
    if (process.client) {
      localStorage.removeItem('token')
    }
  }

  if (process.client) {
    // Ensure token initializes from localStorage on first client mount
    if (!token.value) {
      const existing = localStorage.getItem('token') || ''
      if (existing) token.value = existing
    }
    window.addEventListener('storage', (e) => {
      if (e.key === 'token') token.value = e.newValue || ''
    })
    // initial profile load
    refreshProfile()
    // refresh on tab focus
    window.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshProfile()
    })
    // periodic refresh while authenticated (more responsive)
    setInterval(() => { if (token.value) refreshProfile() }, 5000)
  }

  async function refreshProfile() {
    if (!token.value) { creditCents.value = 0; return }
    try {
      const me: any = await $fetch('/api/me', { headers: { authorization: token.value } })
      creditCents.value = Number(me?.credit_cents || 0)
    } catch {
      // ignore
    }
  }

  return { token, isAuthenticated, isAdmin, isRider, creditCents, setToken, clearToken, refreshProfile }
}
