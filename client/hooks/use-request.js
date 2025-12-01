'use client'
import axios from 'axios'
import { useState } from 'react'
import { useLoading } from '../context/loading-context'

const UseRequest = ({ url, method, body, onSuccess }) => {
  const [errors, setErrors] = useState(null)
  const [localLoading, setLocalLoading] = useState(false)
  const { startLoading, stopLoading, loading: globalLoading } = useLoading()

  const doRequest = async (extraBody = {}) => {
    try {
      setErrors(null)
      setLocalLoading(true)
      startLoading()

      const response = await axios.request({
        url,
        method,
        data: method.toLowerCase() === 'get' ? undefined : { ...(body || {}), ...(extraBody || {}) },
        params: method.toLowerCase() === 'get' ? { ...(body || {}), ...(extraBody || {}) } : undefined,
        withCredentials: true
      })

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
    } finally {
      setLocalLoading(false)
      stopLoading()
    }
  }

  return { doRequest, errors, loading: localLoading || globalLoading }
}

export default UseRequest
