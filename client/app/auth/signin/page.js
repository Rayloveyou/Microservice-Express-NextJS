import { redirect } from 'next/navigation'

import { fetchCurrentUser } from '../../../lib/server-auth'
import { getCookieHeader } from '../../../lib/get-cookie-header'
import SigninClient from './signin-client'

export const metadata = {
  title: 'Sign In'
}

export default async function SigninPage() {
  const cookieHeader = await getCookieHeader()
  const data = await fetchCurrentUser(cookieHeader)
  const currentUser = data?.currentUser || null

  if (currentUser) {
    redirect('/')
  }

  return <SigninClient />
}
