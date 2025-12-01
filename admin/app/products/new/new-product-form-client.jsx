'use client'
import { useState } from 'react'
import axios from 'axios'

const PRODUCT_CATEGORIES = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'computers', label: 'Computers' },
  { value: 'audio', label: 'Audio' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'smart-home', label: 'Smart Home' },
  { value: 'wearables', label: 'Wearables' },
  { value: 'storage', label: 'Storage' },
  { value: 'other', label: 'Other' }
]

export default function NewProductFormClient() {
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [category, setCategory] = useState('other')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      setImagePreview('')
    }
  }

  const onSubmit = async e => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('price', price)
      formData.append('quantity', quantity)
      formData.append('category', category)
      if (imageFile) {
        formData.append('image', imageFile)
      }

      await axios.post('/api/products', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true
      })

      window.location.href = '/products'
    } catch (err) {
      const message =
        err?.response?.data?.errors?.[0]?.message || 'Failed to create product'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="card">
      <div className="card-body">
        <form onSubmit={onSubmit}>
          <div className="mb-3">
            <label className="form-label">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="form-control"
              type="text"
              placeholder="Product name"
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Price</label>
            <input
              value={price}
              onBlur={onBlur}
              onChange={e => setPrice(e.target.value)}
              className="form-control"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Quantity</label>
            <input
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value, 10) || 1)}
              className="form-control"
              type="number"
              min="1"
              placeholder="1"
              required
            />
            <div className="form-text">How many units do you have in stock?</div>
          </div>
          <div className="mb-3">
            <label className="form-label">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="form-select"
              required
            >
              {PRODUCT_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <div className="form-text">Select the product category</div>
          </div>
          <div className="mb-3">
            <label className="form-label">Product Image (Optional)</label>
            <input
              onChange={handleImageChange}
              className="form-control"
              type="file"
              accept="image/*"
            />
            <div className="form-text">Upload a photo of your product (max 5MB)</div>
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover' }}
                  className="rounded"
                />
              </div>
            )}
          </div>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <div className="d-flex gap-2">
            <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
