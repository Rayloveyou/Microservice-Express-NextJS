import { useState } from "react"
import axios from "axios"
import Router from "next/router"
import Link from "next/link"

const NewProduct = () => {
    const [title, setTitle] = useState('')
    const [price, setPrice] = useState(0)
    const [quantity, setQuantity] = useState(1)
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState('')
    const [errors, setErrors] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const onSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)
        setErrors(null)

        try {
            const formData = new FormData()
            formData.append('title', title)
            formData.append('price', price)
            formData.append('quantity', quantity)
            if (imageFile) {
                formData.append('image', imageFile)
            }

            await axios.post('/api/products', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })

            Router.push('/')
        } catch (err) {
            setErrors(
                <div className="alert alert-danger">
                    <h4>Oops...</h4>
                    <ul className="my-0">
                        {err.response?.data?.errors?.map((error, index) => (
                            <li key={index}>{error.message}</li>
                        )) || <li>Something went wrong</li>}
                    </ul>
                </div>
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setImageFile(file)
            // Create preview URL
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result)
            }
            reader.readAsDataURL(file)
        } else {
            setImageFile(null)
            setImagePreview('')
        }
    }
    
    const onBlur = () => {
        // Convert price after fill
        const value = parseFloat(price)
        if (isNaN(value)) {
            return
        }
        // Round to 2 decimal places
        setPrice(value.toFixed(2))
    }

    return (
        <div className="mt-4">
            {/* Hero */}
            <div className="hero brand-gradient mb-4">
                <div>
                    <span className="badge rounded-pill badge-brand mb-2">Sell Product</span>
                    <h1 className="display-6 mb-2">Create a Product</h1>
                    <p className="mb-0">List your product for sale</p>
                </div>
            </div>

            {/* Form */}
            <div className="card card-product">
                <div className="card-body">
                    <form onSubmit={onSubmit}>
                        <div className="mb-3">
                            <label className="form-label">Title</label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
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
                                onChange={(e) => setPrice(e.target.value)}
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
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                className="form-control"
                                type="number"
                                min="1"
                                placeholder="1"
                                required
                            />
                            <div className="form-text">How many units do you have in stock?</div>
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
                        {errors}
                        <div className="d-flex gap-2">
                            <button className="btn btn-brand" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Creating...' : 'Create Product'}
                            </button>
                            <Link href="/" className="btn btn-outline-secondary">Cancel</Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default NewProduct