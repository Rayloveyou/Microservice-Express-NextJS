import { useState } from 'react'
import UseRequest from '../../hooks/use-request'
import Router from 'next/router'

const Signup = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const { doRequest, errors } = UseRequest({
        url: '/api/users/signup',
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
            <h1>Signup</h1>
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
            <button className="btn btn-primary" type="submit">Signup</button>
        </form>
    );
}

export default Signup