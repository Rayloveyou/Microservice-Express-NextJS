import { useState } from 'react'
import UseRequest from '../../hooks/use-request'
import Router from 'next/router'
import { withCurrentUser } from '../../lib/with-current-user'

const Signup = ({ currentUser }) => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const { doRequest, errors } = UseRequest({
        url: '/api/users/signin',
        method: 'post',
        body: { email, password },
        onSuccess: () => Router.push('/') // Redirect to home page
    })

    const onSubmit = async (e) => {
        e.preventDefault() // Prevent the browser from reloading the page

        //Call the doRequest function from the UseRequest hook
        await doRequest()
    }
    return (
        <form onSubmit={onSubmit}>
            <h1>Signin</h1>
            <div className="form-group">
                 <label htmlFor="email">Email Address</label>
                 <input
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                 />
            </div>
            <div className="form-group">
                 <label htmlFor="password">Password</label>
                 <input
                    className="form-control"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                 />
            </div>
            {/* Display errors if any  */}
            {errors}
            <button className="btn btn-primary" type="submit">Signin</button>
        </form>
    );
}

export const getServerSideProps = withCurrentUser()

export default Signup