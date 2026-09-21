'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

type CartItem = { quantity: number; price: number };

interface CartState {
  items: Record<string, CartItem>;
  tipAmount: number;
  walletAmount: number;
  selectedAddress: string;
}

interface CartContextType extends CartState {
  totalItems: number;
  totalPrice: number;
  updateQuantity: (id: string, price: number, quantity: number) => void;
  setTipAmount: (amount: number) => void;
  setWalletAmount: (amount: number) => void;
  setSelectedAddress: (address: string) => void;
  clearCart: () => void;
}

const DummyCartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'sb_cart_state_v1';

const defaultState: CartState = {
  items: {},
  tipAmount: 0,
  walletAmount: 0,
  selectedAddress: 'المنزل - جمصة (الحالي)',
};

export const DummyCartProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<CartState>(defaultState);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setState(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading cart state from localStorage', e);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, isInitialized]);

  const totalItems = useMemo(() => {
    return Object.values(state.items).reduce((acc, item) => acc + item.quantity, 0);
  }, [state.items]);

  const totalPrice = useMemo(() => {
    return Object.values(state.items).reduce((acc, item) => {
      const q = Number(item.quantity) || 0;
      const p = Number(item.price) || 0;
      return acc + (q * p);
    }, 0);
  }, [state.items]);

  const updateQuantity = (id: string, price: number, quantity: number) => {
    setState(prev => {
      const newItems = { ...prev.items };
      if (quantity <= 0) {
        delete newItems[id];
      } else {
        newItems[id] = { quantity, price };
      }
      return { ...prev, items: newItems };
    });
  };

  const setTipAmount = (amount: number) => setState(prev => ({ ...prev, tipAmount: amount }));
  const setWalletAmount = (amount: number) => setState(prev => ({ ...prev, walletAmount: amount }));
  const setSelectedAddress = (address: string) => setState(prev => ({ ...prev, selectedAddress: address }));

  const clearCart = () => {
    setState(prev => ({ ...prev, items: {}, tipAmount: 0, walletAmount: 0 }));
  };

  return (
    <DummyCartContext.Provider value={{ 
      ...state, 
      totalItems, 
      totalPrice, 
      updateQuantity, 
      setTipAmount, 
      setWalletAmount, 
      setSelectedAddress, 
      clearCart 
    }}>
      {children}
    </DummyCartContext.Provider>
  );
};

export const useDummyCart = () => {
  const context = useContext(DummyCartContext);
  if (!context) {
    throw new Error('useDummyCart must be used within a DummyCartProvider');
  }
  return context;
};
