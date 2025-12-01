import { redirect } from 'next/navigation'

import { fetchCurrentUser } from '../../../lib/server-auth'
import { getCookieHeader } from '../../../lib/get-cookie-header'
import SignupClient from './signup-client'

export const metadata = {
  title: 'Sign Up'
}

export default async function SignupPage() {
  const cookieHeader = await getCookieHeader()
  const data = await fetchCurrentUser(cookieHeader)
  const currentUser = data?.currentUser || null

  if (currentUser) {
    redirect('/')
  }

  return <SignupClient />
}
