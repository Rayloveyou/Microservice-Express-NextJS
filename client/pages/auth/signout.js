import { useEffect } from 'react'
import UseRequest from '../../hooks/use-request'
import Router from 'next/router'
import { withCurrentUser } from '../../lib/with-current-user'

const Signout = ({ currentUser }) => {
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

export const getServerSideProps = withCurrentUser()

export default Signout