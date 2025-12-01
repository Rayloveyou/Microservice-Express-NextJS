import { headers } from 'next/headers'

export async function getCookieHeader() {
  const h = await headers()
  return h.get('cookie') || ''
}
