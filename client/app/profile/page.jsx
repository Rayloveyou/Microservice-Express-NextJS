import { fetchCurrentUser } from '../../lib/server-auth'
import { getCookieHeader } from '../../lib/get-cookie-header'
import ProfilePageClient from './profile-page-client'

export const metadata = {
  title: 'Profile | E-Commerce'
}

export default async function ProfilePage() {
  const cookieHeader = await getCookieHeader()
  const userData = await fetchCurrentUser(cookieHeader)
  const currentUser = userData?.currentUser || null

  return <ProfilePageClient currentUser={currentUser} />
}
