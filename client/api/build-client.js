import axios from "axios"

export default ({ req }) => {
    if (typeof window === 'undefined') {
        // We are on the server
        return axios.create({
            baseURL: 'http://auth-svc:3000',
            headers: {
                Cookie: req.headers.cookie || ''
            }
        })
    } else {
        // We are on the browserß
        return axios.create({
            baseURL: '/'
        })
    }
}