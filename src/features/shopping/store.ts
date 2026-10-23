import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ShoppingItem, ShoppingList } from '@/features/types';
import { createId } from '@/lib/id';
import { persistStorage, STORE_VERSION } from '@/lib/storage';

import { guessCategory, parseItemInput } from './logic';

type ShoppingState = {
  lists: ShoppingList[];
  items: ShoppingItem[];
  /** Item names starred for quick re-adding. */
  favourites: string[];
  addList: (list: Omit<ShoppingList, 'id' | 'createdAt'>) => ShoppingList;
  updateList: (id: string, patch: Partial<ShoppingList>) => void;
  removeList: (id: string) => void;
  addItem: (listId: string, input: string, addedBy?: string) => ShoppingItem | null;
  updateItem: (id: string, patch: Partial<ShoppingItem>) => void;
  togglePurchased: (id: string) => void;
  removeItem: (id: string) => void;
  clearPurchased: (listId: string) => void;
  toggleFavourite: (name: string) => void;
  replaceAll: (lists: ShoppingList[], items: ShoppingItem[]) => void;
  clearDemo: () => void;
  reset: () => void;
};

export const useShopping = create<ShoppingState>()(
  persist(
    (set, get) => ({
      lists: [],
      items: [],
      favourites: [],
      addList: (draft) => {
        const list: ShoppingList = { ...draft, id: createId('l_'), createdAt: new Date().toISOString() };
        set((s) => ({ lists: [...s.lists, list] }));
        return list;
      },
      updateList: (id, patch) => set((s) => ({ lists: s.lists.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      removeList: (id) => set((s) => ({ lists: s.lists.filter((l) => l.id !== id), items: s.items.filter((i) => i.listId !== id) })),
      addItem: (listId, input, addedBy) => {
        const { name, quantity } = parseItemInput(input);
        if (!name) return null;
        // Re-adding something already in the basket brings it back instead of duplicating.
        const existing = get().items.find((i) => i.listId === listId && i.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          set((s) => ({
            items: s.items.map((i) =>
              i.id === existing.id ? { ...i, purchased: false, purchasedAt: undefined, quantity: quantity ?? i.quantity } : i,
            ),
          }));
          return existing;
        }
        const item: ShoppingItem = {
          id: createId('i_'),
          listId,
          name,
          quantity,
          category: guessCategory(name),
          purchased: false,
          addedBy,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ items: [...s.items, item] }));
        return item;
      },
      updateItem: (id, patch) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      togglePurchased: (id) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, purchased: !i.purchased, purchasedAt: i.purchased ? undefined : new Date().toISOString() } : i,
          ),
        })),
      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clearPurchased: (listId) => set((s) => ({ items: s.items.filter((i) => !(i.listId === listId && i.purchased)) })),
      toggleFavourite: (name) =>
        set((s) => ({
          favourites: s.favourites.includes(name) ? s.favourites.filter((f) => f !== name) : [...s.favourites, name],
        })),
      replaceAll: (lists, items) => set({ lists, items }),
      clearDemo: () =>
        set((s) => {
          const demoIds = new Set(s.lists.filter((l) => l.isDemo).map((l) => l.id));
          return { lists: s.lists.filter((l) => !l.isDemo), items: s.items.filter((i) => !demoIds.has(i.listId)) };
        }),
      reset: () => set({ lists: [], items: [], favourites: [] }),
    }),
    { name: 'oursome.shopping', version: STORE_VERSION, storage: persistStorage },
  ),
);
