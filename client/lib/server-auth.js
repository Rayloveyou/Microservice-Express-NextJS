import 'server-only'

const gatewayUrl = process.env.API_GATEWAY_URL

export async function fetchCurrentUser(cookieHeader = '') {
  try {
    const res = await fetch(`${gatewayUrl}/api/users/currentuser`, {
      headers: { Cookie: cookieHeader },
      cache: 'no-store'
    })
    if (!res.ok) return null
    const data = await res.json()
    return data
  } catch (err) {
    return null
  }
}
