'use client'
import { useState } from 'react'
import axios from 'axios'

export default function ProductEditFormClient({ product }) {
  const [title, setTitle] = useState(product?.title || '')
  const [price, setPrice] = useState(product?.price || 0)
  const [quantity, setQuantity] = useState(product?.quantity || 1)
  const [imagePreview, setImagePreview] = useState(product?.imageUrl || '')
  const [imageFile, setImageFile] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const onBlur = () => {
    const value = parseFloat(price)
    if (!Number.isNaN(value)) {
      setPrice(value.toFixed(2))
    }
  }

  const handleImageChange = e => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result)
      reader.readAsDataURL(file)
    } else {
      setImageFile(null)
      setImagePreview(product?.imageUrl || '')
    }
  }

  const onSubmit = async e => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('price', price)
      formData.append('quantity', quantity)
      if (imageFile) {
        formData.append('image', imageFile)
      }

      await axios.put(`/api/products/${product.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      window.location.href = '/products'
    } catch (err) {
      const msg =
        err?.response?.data?.errors?.[0]?.message || 'Failed to update product'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <div className="card-body">
        <form onSubmit={onSubmit}>
          <div className="mb-3">
            <label className="form-label">Title</label>
            <input
              className="form-control"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Price</label>
            <input
              className="form-control"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onBlur={onBlur}
              onChange={e => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Quantity</label>
            <input
              className="form-control"
              type="number"
              min="1"
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value, 10) || 1)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Product Image (Optional)</label>
            <input
              className="form-control"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    objectFit: 'cover'
                  }}
                  className="rounded"
                />
              </div>
            )}
          </div>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
