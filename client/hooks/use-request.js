import axios from "axios"
import { useState } from "react"

const UseRequest = ({ url, method, body, onSuccess}) => {
    const [errors, setErrors] = useState(null)

    const doRequest = async (extraBody = {}) => {
        try {
            setErrors(null)
            const response = await axios[method](url, { ...(body || {}), ...(extraBody || {}) })

            if (onSuccess) {
               onSuccess(response.data)
            }
            return response.data
        } catch (err) {
            const errorMessages = err.response?.data?.errors || [
                { message: err.message || 'An unexpected error occurred' }
            ]
            setErrors(
                <div className="alert alert-danger">
                    <h4>Oops...</h4>
                    <ul className="my-0">
                        {errorMessages.map((error, index) => (
                            <li key={error.message || index}>{error.message}</li>
                        ))}
                    </ul>
                </div>
            )
        }
    }

    return { doRequest, errors }
}

export default UseRequest