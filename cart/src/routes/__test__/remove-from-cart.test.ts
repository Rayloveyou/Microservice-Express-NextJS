import request from 'supertest'
import { app } from '../../app'
import { getCookie, createProductId } from '../../test/helpers'
import { Product } from '../../models/product'
import { Cart } from '../../models/cart'
import mongoose from 'mongoose'

describe('DELETE /api/cart/:productId - Remove from Cart', () => {
  describe('Authentication', () => {
    it('returns 401 if user is not authenticated', async () => {
      const productId = createProductId()

      await request(app)
        .delete(`/api/cart/${productId}`)
        .send()
        .expect(401)
    })

    it('returns 204 if user is authenticated and cart exists', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      // Create product
      const product = Product.build({
        id: productId,
        title: 'Test Product',
        price: 99,
        quantity: 10
      })
      await product.save()

      // Create cart with item
      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 1 }]
      })
      await cart.save()

      await request(app)
        .delete(`/api/cart/${productId}`)
        .set('Cookie', getCookie(userId))
        .send()
        .expect(204)
    })
  })

  describe('Cart Existence', () => {
    it('returns 404 if user does not have a cart', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      await request(app)
        .delete(`/api/cart/${productId}`)
        .set('Cookie', getCookie(userId))
        .send()
        .expect(404)
    })

    it('successfully removes item if cart exists', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      // Create cart with item
      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 2 }]
      })
      await cart.save()

      await request(app)
        .delete(`/api/cart/${productId}`)
        .set('Cookie', getCookie(userId))
        .send()
        .expect(204)
    })
  })

  describe('Item Removal', () => {
    it('removes item from cart successfully', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      // Create cart with item
      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 3 }]
      })
      await cart.save()

      await request(app)
        .delete(`/api/cart/${productId}`)
        .set('Cookie', getCookie(userId))
        .send()
        .expect(204)

      // Verify item was removed
      const updatedCart = await Cart.findOne({ userId })
      expect(updatedCart!.items).toHaveLength(0)
    })

    it('removes only the specified item from cart with multiple items', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId1 = createProductId()
      const productId2 = createProductId()
      const productId3 = createProductId()

      // Create cart with multiple items
      const cart = Cart.build({
        userId,
        items: [
          { productId: productId1, quantity: 1 },
          { productId: productId2, quantity: 2 },
          { productId: productId3, quantity: 3 }
        ]
      })
      await cart.save()

      // Remove the second item
      await request(app)
        .delete(`/api/cart/${productId2}`)
        .set('Cookie', getCookie(userId))
        .send()
        .expect(204)

      // Verify only productId2 was removed
      const updatedCart = await Cart.findOne({ userId })
      expect(updatedCart!.items).toHaveLength(2)
      expect(updatedCart!.items.find(item => item.productId === productId1)).toBeDefined()
      expect(updatedCart!.items.find(item => item.productId === productId2)).toBeUndefined()
      expect(updatedCart!.items.find(item => item.productId === productId3)).toBeDefined()
    })

    it('does not throw error if item is not in cart', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId1 = createProductId()
      const productId2 = createProductId()

      // Create cart with one item
      const cart = Cart.build({
        userId,
        items: [{ productId: productId1, quantity: 1 }]
      })
      await cart.save()

      // Try to remove item that is not in cart
      await request(app)
        .delete(`/api/cart/${productId2}`)
        .set('Cookie', getCookie(userId))
        .send()
        .expect(204)

      // Verify original item still exists
      const updatedCart = await Cart.findOne({ userId })
      expect(updatedCart!.items).toHaveLength(1)
      expect(updatedCart!.items[0].productId).toEqual(productId1)
    })

    it('leaves cart empty after removing last item', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      // Create cart with one item
      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 1 }]
      })
      await cart.save()

      await request(app)
        .delete(`/api/cart/${productId}`)
        .set('Cookie', getCookie(userId))
        .send()
        .expect(204)

      // Verify cart exists but is empty
      const updatedCart = await Cart.findOne({ userId })
      expect(updatedCart).toBeDefined()
      expect(updatedCart!.items).toHaveLength(0)
    })
  })

  describe('Version Control', () => {
    it('increments cart version after removal', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      // Create cart with item
      const cart = Cart.build({
        userId,
        items: [{ productId, quantity: 1 }]
      })
      await cart.save()

      const originalVersion = cart.version

      await request(app)
        .delete(`/api/cart/${productId}`)
        .set('Cookie', getCookie(userId))
        .send()
        .expect(204)

      // Verify version was incremented
      const updatedCart = await Cart.findOne({ userId })
      expect(updatedCart!.version).toEqual(originalVersion + 1)
    })
  })

  describe('User Isolation', () => {
    it('does not remove items from other users carts', async () => {
      const user1Id = new mongoose.Types.ObjectId().toHexString()
      const user2Id = new mongoose.Types.ObjectId().toHexString()
      const productId = createProductId()

      // Create cart for user 1
      const cart1 = Cart.build({
        userId: user1Id,
        items: [{ productId, quantity: 1 }]
      })
      await cart1.save()

      // Create cart for user 2
      const cart2 = Cart.build({
        userId: user2Id,
        items: [{ productId, quantity: 2 }]
      })
      await cart2.save()

      // User 1 removes item from their cart
      await request(app)
        .delete(`/api/cart/${productId}`)
        .set('Cookie', getCookie(user1Id))
        .send()
        .expect(204)

      // Verify user 1's cart is empty
      const updatedCart1 = await Cart.findOne({ userId: user1Id })
      expect(updatedCart1!.items).toHaveLength(0)

      // Verify user 2's cart is unchanged
      const updatedCart2 = await Cart.findOne({ userId: user2Id })
      expect(updatedCart2!.items).toHaveLength(1)
      expect(updatedCart2!.items[0].productId).toEqual(productId)
      expect(updatedCart2!.items[0].quantity).toEqual(2)
    })
  })

  describe('Edge Cases', () => {
    it('handles removal with invalid product ID format gracefully', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()

      // Create empty cart
      const cart = Cart.build({
        userId,
        items: []
      })
      await cart.save()

      await request(app)
        .delete('/api/cart/invalid-id')
        .set('Cookie', getCookie(userId))
        .send()
        .expect(204)
    })

    it('handles concurrent removals correctly', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const productId1 = createProductId()
      const productId2 = createProductId()

      // Create cart with multiple items
      const cart = Cart.build({
        userId,
        items: [
          { productId: productId1, quantity: 1 },
          { productId: productId2, quantity: 2 }
        ]
      })
      await cart.save()

      // Remove both items concurrently
      await Promise.all([
        request(app)
          .delete(`/api/cart/${productId1}`)
          .set('Cookie', getCookie(userId))
          .send(),
        request(app)
          .delete(`/api/cart/${productId2}`)
          .set('Cookie', getCookie(userId))
          .send()
      ])

      // One should succeed and one might fail due to version conflict
      // But eventually cart should be consistent
      const finalCart = await Cart.findOne({ userId })
      expect(finalCart).toBeDefined()
      // Cart should have at most 1 item or be empty
      expect(finalCart!.items.length).toBeLessThanOrEqual(1)
    })
  })
})
