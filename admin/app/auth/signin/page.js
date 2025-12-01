import { redirect } from 'next/navigation'

import { fetchCurrentUser } from '../../../lib/server-auth'
import { getCookieHeader } from '../../../lib/get-cookie-header'
import AdminSigninForm from './signin-client'

export const metadata = {
  title: 'Admin Sign In'
}

export default async function AdminSigninPage() {
  const cookieHeader = await getCookieHeader()
  const currentUser = await fetchCurrentUser(cookieHeader)

  if (currentUser && currentUser.role === 'admin') {
    redirect('/dashboard')
  }

  return <AdminSigninForm />
}
