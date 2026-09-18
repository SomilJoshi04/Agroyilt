import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ecommerceCartService } from '../services/ecommerceCartService';

const EcommerceCartContext = createContext(null);

export const EcommerceCartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch e-commerce cart from server
  const fetchCart = useCallback(async () => {
    try {
      const path = window.location.pathname;
      if (path.startsWith('/vendor') || path.startsWith('/admin') || path.startsWith('/worker')) {
        return;
      }

      const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
      if (!token) {
        setCartItems([]);
        setCartCount(0);
        setIsInitialized(true);
        return;
      }

      setIsLoading(true);
      const response = await ecommerceCartService.getCart();
      if (response.success) {
        const items = response.data || [];
        setCartItems(items);
        // Sum total quantities for e-commerce cart count
        const totalCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        setCartCount(totalCount);
      }
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        setCartItems([]);
        setCartCount(0);
      }
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, []);

  // Initialize cart on mount
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Add item to cart
  const addToCart = useCallback(async (productId, quantity = 1) => {
    try {
      const response = await ecommerceCartService.addToCart(productId, quantity);
      if (response.success) {
        await fetchCart(); // Re-fetch to get fully populated product info
      }
      return response;
    } catch (error) {
      console.error('Failed to add to e-commerce cart:', error);
      throw error;
    }
  }, [fetchCart]);

  // Update item quantity
  const updateItem = useCallback(async (itemId, quantity) => {
    try {
      const response = await ecommerceCartService.updateItem(itemId, quantity);
      if (response.success) {
        await fetchCart();
      }
      return response;
    } catch (error) {
      console.error('Failed to update e-commerce cart item:', error);
      throw error;
    }
  }, [fetchCart]);

  // Remove item from cart
  const removeItem = useCallback(async (itemId) => {
    try {
      const response = await ecommerceCartService.removeItem(itemId);
      if (response.success) {
        await fetchCart();
      }
      return response;
    } catch (error) {
      console.error('Failed to remove from e-commerce cart:', error);
      throw error;
    }
  }, [fetchCart]);

  // Clear entire cart
  const clearCart = useCallback(async () => {
    try {
      const response = await ecommerceCartService.clearCart();
      if (response.success) {
        setCartItems([]);
        setCartCount(0);
      }
      return response;
    } catch (error) {
      console.error('Failed to clear e-commerce cart:', error);
      throw error;
    }
  }, []);

  // Reset cart (on logout)
  const resetCart = useCallback(() => {
    setCartItems([]);
    setCartCount(0);
    setIsInitialized(false);
  }, []);

  const value = {
    cartItems,
    cartCount,
    isLoading,
    isInitialized,
    fetchCart,
    addToCart,
    updateItem,
    removeItem,
    clearCart,
    resetCart
  };

  return (
    <EcommerceCartContext.Provider value={value}>
      {children}
    </EcommerceCartContext.Provider>
  );
};

export const useEcommerceCart = () => {
  const context = useContext(EcommerceCartContext);
  if (!context) {
    throw new Error('useEcommerceCart must be used within an EcommerceCartProvider');
  }
  return context;
};

export default EcommerceCartContext;
