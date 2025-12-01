'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export default function BlockedRedirect({ blocked }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!blocked) return
    if (pathname === '/blocked') return
    router.replace('/blocked')
  }, [blocked, pathname, router])

  return null
}
