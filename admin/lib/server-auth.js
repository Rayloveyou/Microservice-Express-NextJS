import 'server-only'

const gatewayUrl = process.env.API_GATEWAY_URL
const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com'

export async function fetchCurrentUser(cookieHeader = '') {
  // When browser calls from admin domain, include credentials; SSR path uses passed cookieHeader
  const fetchOptions = {
    headers: { Cookie: cookieHeader },
    cache: 'no-store',
    credentials: 'include'
  }

  const tryCurrent = async () => {
    const res = await fetch(`${gatewayUrl}/api/users/currentuser`, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()
    return data.currentUser || null
  }

  const tryRefresh = async () => {
    const res = await fetch(`${gatewayUrl}/api/users/refresh`, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()
    return data.currentUser || null
  }

  try {
    let user = await tryCurrent()
    if (!user) {
      user = await tryRefresh()
    }
    if (!user || user.email !== adminEmail) {
      return null
    }
    return user
  } catch {
    return null
  }
}
