import { useEffect } from 'react'
import UseRequest from '../../hooks/use-request'
import Router from 'next/router'

export default () => {
    const { doRequest } = UseRequest({
        url: '/api/users/signout',
        method: 'post',
        body: {},
        onSuccess: () => Router.push('/') // Redirect to home page
    })

    useEffect(() => {
        doRequest()
    }, [])

    return <div>Signing you out...</div>
}