'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const categories = [
  { id: 'all', label: 'All Products', icon: '🛍️' },
  { id: 'electronics', label: 'Electronics', icon: '⚡' },
  { id: 'computers', label: 'Computers', icon: '💻' },
  { id: 'audio', label: 'Audio', icon: '🎧' },
  { id: 'accessories', label: 'Accessories', icon: '🔌' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
  { id: 'mobile', label: 'Mobile', icon: '📱' },
  { id: 'smart-home', label: 'Smart Home', icon: '🏠' },
  { id: 'wearables', label: 'Wearables', icon: '⌚' },
  { id: 'storage', label: 'Storage', icon: '💾' }
]

export default function CategoryNav() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get('category') || 'all'

  const handleCategoryClick = (categoryId) => {
    const params = new URLSearchParams(searchParams.toString())

    if (categoryId === 'all') {
      params.delete('category')
    } else {
      params.set('category', categoryId)
    }

    // Reset to page 1 when changing category
    params.delete('page')

    const queryString = params.toString()
    router.push(queryString ? `/?${queryString}` : '/')
  }

  return (
    <div className="category-nav">
      <div className="category-nav-container">
        <div className="category-nav-scroll">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={`category-btn ${
                currentCategory === category.id ? 'active' : ''
              }`}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-label">{category.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}