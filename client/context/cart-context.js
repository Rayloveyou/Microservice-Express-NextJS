'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const CartContext = createContext()

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    // Return default values when context is not available (e.g., not logged in)
    return {
      cart: null,
      cartCount: 0,
      refreshCart: () => {},
      addToCart: () => {},
      removeFromCart: () => {}
    }
  }
  return context
}

export const CartProvider = ({ children, currentUser, cookiesFromServer }) => {
  const [cart, setCart] = useState(null)
  const [cartCount, setCartCount] = useState(0)

  const attemptRefresh = async () => {
    try {
      await axios.post('/api/users/refresh', {}, { withCredentials: true })
    } catch (_err) {
      // ignore; if refresh fails, user is effectively signed out
    }
  }

  const refreshCart = async () => {
    if (!currentUser?.id) {
      setCart(null)
      setCartCount(0)
      return null
    }

    try {
      const { data } = await axios.get('/api/cart', { withCredentials: true })
      setCart(data)
      setCartCount(data?.items?.length || 0)
      return data
    } catch (err) {
      if (err?.response?.status === 401) {
        await attemptRefresh()
        try {
          const { data } = await axios.get('/api/cart', { withCredentials: true })
          setCart(data)
          setCartCount(data?.items?.length || 0)
          return data
        } catch (_err) {}
      }
      // keep existing cart state on non-auth errors to avoid flashing empty
      return null
    }
  }

  const addToCart = async (productId, quantity) => {
    try {
      await axios.post('/api/cart', { productId, quantity }, { withCredentials: true })
      await refreshCart()
      return { success: true }
    } catch (err) {
      if (err?.response?.status === 401) {
        await attemptRefresh()
        try {
          await axios.post('/api/cart', { productId, quantity }, { withCredentials: true })
          await refreshCart()
          return { success: true }
        } catch (_err) {}
      }
      return {
        success: false,
        error: err.response?.data?.errors?.[0]?.message || 'Failed to add to cart'
      }
    }
  }

  const removeFromCart = async productId => {
    try {
      await axios.delete(`/api/cart/${productId}`, { withCredentials: true })
      await refreshCart()
      return { success: true }
    } catch (err) {
      if (err?.response?.status === 401) {
        await attemptRefresh()
        try {
          await axios.delete(`/api/cart/${productId}`, { withCredentials: true })
          await refreshCart()
          return { success: true }
        } catch (_err) {}
      }
      return {
        success: false,
        error: err.response?.data?.errors?.[0]?.message || 'Failed to remove from cart'
      }
    }
  }

  // Load cart on mount
  useEffect(() => {
    refreshCart()
  }, [currentUser])

  return (
    <CartContext.Provider value={{ cart, cartCount, refreshCart, addToCart, removeFromCart }}>
      {children}
    </CartContext.Provider>
  )
}
