import { create } from 'zustand';

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  isVeg: boolean;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem(item) {
    const existing = get().items.find(i => i.menuItemId === item.menuItemId);
    if (existing) {
      set({ items: get().items.map(i => i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i) });
    } else {
      set({ items: [...get().items, { ...item, quantity: 1 }] });
    }
  },
  removeItem(menuItemId) {
    set({ items: get().items.filter(i => i.menuItemId !== menuItemId) });
  },
  updateQuantity(menuItemId, quantity) {
    if (quantity <= 0) {
      get().removeItem(menuItemId);
    } else {
      set({ items: get().items.map(i => i.menuItemId === menuItemId ? { ...i, quantity } : i) });
    }
  },
  clearCart: () => set({ items: [] }),
  total: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
}));
