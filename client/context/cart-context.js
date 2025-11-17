import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const CartContext = createContext()

export const useCart = () => {
    const context = useContext(CartContext)
    if (!context) {
        // Return default values when context is not available (e.g., not logged in)
        return { cart: null, cartCount: 0, refreshCart: () => {}, addToCart: () => {}, removeFromCart: () => {} }
    }
    return context
}

export const CartProvider = ({ children, currentUser }) => {
    const [cart, setCart] = useState(null)
    const [cartCount, setCartCount] = useState(0)

    const refreshCart = async () => {
        if (!currentUser) {
            setCart(null)
            setCartCount(0)
            return
        }

        try {
            const { data } = await axios.get('/api/cart')
            setCart(data)
            setCartCount(data?.items?.length || 0)
        } catch (err) {
            // Cart might be empty or user not logged in
            setCart(null)
            setCartCount(0)
        }
    }

    const addToCart = async (productId, quantity) => {
        try {
            const { data } = await axios.post('/api/cart', { productId, quantity })
            setCart(data)
            setCartCount(data?.items?.length || 0)
            return { success: true }
        } catch (err) {
            return { 
                success: false, 
                error: err.response?.data?.errors?.[0]?.message || 'Failed to add to cart' 
            }
        }
    }

    const removeFromCart = async (productId) => {
        try {
            await axios.delete(`/api/cart/${productId}`)
            await refreshCart()
            return { success: true }
        } catch (err) {
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
