import axios from "axios"

export default ({ req }) => {
    if (typeof window === 'undefined') {
        // We are on the server
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-svc:3000'
        return axios.create({
            baseURL: authServiceUrl,
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