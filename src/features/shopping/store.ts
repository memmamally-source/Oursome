import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ShoppingItem, ShoppingList } from '@/features/types';
import { recordActivity } from '@/features/activity/store';
import { withFamily } from '@/features/space/store';
import { createId } from '@/lib/id';
import { persistStorage, STORE_VERSION } from '@/lib/storage';

import { guessCategory, moveInOrder, parseItemInput, recordBought, type BoughtHistory } from './logic';

type ShoppingState = {
  lists: ShoppingList[];
  items: ShoppingItem[];
  /** Item names starred for quick re-adding. */
  favourites: string[];
  /** How often each item has been bought, for "often bought" suggestions. */
  bought: BoughtHistory;
  addList: (list: Omit<ShoppingList, 'id' | 'createdAt'>) => ShoppingList;
  updateList: (id: string, patch: Partial<ShoppingList>) => void;
  removeList: (id: string) => void;
  addItem: (listId: string, input: string, addedBy?: string) => ShoppingItem | null;
  updateItem: (id: string, patch: Partial<ShoppingItem>) => void;
  togglePurchased: (id: string) => void;
  removeItem: (id: string) => void;
  /** Move an item up or down within `ordered` (the open items as currently shown). */
  moveItem: (ordered: ShoppingItem[], id: string, dir: -1 | 1) => void;
  clearPurchased: (listId: string) => void;
  /** Put items back exactly as they were (undo for delete and clear). */
  restoreItems: (items: ShoppingItem[]) => void;
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
      bought: {},
      addList: (draft) => {
        const list: ShoppingList = withFamily({ ...draft, id: createId('l_'), createdAt: new Date().toISOString() });
        set((s) => ({ lists: [...s.lists, list] }));
        return list;
      },
      updateList: (id, patch) => set((s) => ({ lists: s.lists.map((l) => (l.id === id ? withFamily({ ...l, ...patch }) : l)) })),
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
        const list = get().lists.find((l) => l.id === listId);
        recordActivity('shopping', `added ${name} to ${list?.name ?? 'the list'}`);
        return item;
      },
      updateItem: (id, patch) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      togglePurchased: (id) =>
        set((s) => {
          const item = s.items.find((i) => i.id === id);
          const now = new Date().toISOString();
          return {
            items: s.items.map((i) => (i.id === id ? { ...i, purchased: !i.purchased, purchasedAt: i.purchased ? undefined : now } : i)),
            bought: item && !item.purchased ? recordBought(s.bought, item.name, now) : s.bought,
          };
        }),
      moveItem: (ordered, id, dir) => {
        const positions = moveInOrder(ordered, id, dir);
        set((s) => ({ items: s.items.map((i) => (i.id in positions ? { ...i, order: positions[i.id] } : i)) }));
      },
      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clearPurchased: (listId) => set((s) => ({ items: s.items.filter((i) => !(i.listId === listId && i.purchased)) })),
      restoreItems: (restored) =>
        set((s) => {
          const ids = new Set(s.items.map((i) => i.id));
          return { items: [...s.items, ...restored.filter((i) => !ids.has(i.id))] };
        }),
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
      reset: () => set({ lists: [], items: [], favourites: [], bought: {} }),
    }),
    { name: 'oursome.shopping', version: STORE_VERSION, storage: persistStorage },
  ),
);
