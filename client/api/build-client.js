import axios from 'axios'

export default ({ req }) => {
  if (typeof window === 'undefined') {
    // We are on the server
    const gatewayUrl = process.env.API_GATEWAY_URL
    return axios.create({
      baseURL: gatewayUrl,
      headers: {
        Cookie: req.headers.cookie || ''
      }
    })
  } else {
    // We are on the browser
    return axios.create({
      baseURL: '/'
    })
  }
}
