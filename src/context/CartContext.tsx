"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface Product {
  id: string; 
  name: string;
  price: number;
  category?: string;
  desc?: string;
  imageUrl?: string;
  image?: React.ReactNode;
  rating?: number;
  reviews?: number;
  sellerName?: string;
  sellerId?: string;
  manufacturerId?: string;
  moq?: number;
  tiers?: { minQty: number; price: number }[];
}

interface CartItem extends Product {
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
}

const defaultCartContext: CartContextType = {
  cartItems: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  cartCount: 0,
  cartTotal: 0,
  isCartOpen: false,
  setIsCartOpen: () => {},
};

const CartContext = createContext<CartContextType>(defaultCartContext);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Helper: Get product price based on quantity tiers
  const getTieredPrice = (product: Product, quantity: number) => {
    if (!product.tiers || product.tiers.length === 0) return product.price;
    const qualifiedTier = [...product.tiers]
      .sort((a, b) => b.minQty - a.minQty)
      .find(t => quantity >= t.minQty);
    return qualifiedTier ? qualifiedTier.price : product.price;
  };

  // Load cart from local storage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error("Failed to parse cart", error);
      }
    }
    setIsHydrated(true);
  }, []);

  // Save cart to local storage on change
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product: Product, qty = 1) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + qty } : item
        );
      }
      return [...prevItems, { ...product, quantity: qty }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = isHydrated ? cartItems.reduce((total, item) => total + item.quantity, 0) : 0;
  
  // Calculate total with dynamic tiered pricing
  const cartTotal = isHydrated ? cartItems.reduce((total, item) => {
    const unitPrice = getTieredPrice(item, item.quantity);
    return total + (unitPrice * item.quantity);
  }, 0) : 0;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
