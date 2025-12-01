import axios from 'axios'

export default ({ req, headers } = {}) => {
  if (typeof window === 'undefined') {
    const gatewayUrl = process.env.API_GATEWAY_URL
    const cookieHeader = headers?.cookie || req?.headers?.cookie || ''
    return axios.create({
      baseURL: gatewayUrl,
      headers: {
        Cookie: cookieHeader
      }
    })
  }

  return axios.create({ baseURL: '/' })
}
