import axios from 'axios'

import { requireEnv } from '../lib/require-env'

export default ({ req, headers } = {}) => {
  if (typeof window === 'undefined') {
    // Server-side: use API gateway URL
    const gatewayUrl = requireEnv('API_GATEWAY_URL')
    const cookieHeader = headers?.cookie || req?.headers?.cookie || ''

    return axios.create({
      baseURL: gatewayUrl,
      headers: {
        Cookie: cookieHeader
      },
      timeout: 10000
    })
  }

  // Client-side: use relative URL (browser handles cookies)
  return axios.create({
    baseURL: '/',
    withCredentials: true,
    timeout: 10000
  })
}
