import type { IconName, ShoppingCategory, ShoppingItem } from '@/features/types';
import type { AccentKey } from '@/theme/tokens';

export const shoppingCategoryMeta: Record<ShoppingCategory, { label: string; icon: IconName; color: AccentKey }> = {
  produce: { label: 'Fruit & veg', icon: 'leaf-outline', color: 'mint' },
  dairy: { label: 'Dairy & eggs', icon: 'egg-outline', color: 'sunshine' },
  bakery: { label: 'Bakery', icon: 'pizza-outline', color: 'sunshine' },
  meat: { label: 'Meat & fish', icon: 'fish-outline', color: 'coral' },
  pantry: { label: 'Pantry', icon: 'file-tray-stacked-outline', color: 'coral' },
  frozen: { label: 'Frozen', icon: 'snow-outline', color: 'sky' },
  drinks: { label: 'Drinks', icon: 'cafe-outline', color: 'sky' },
  household: { label: 'Household', icon: 'home-outline', color: 'lavender' },
  personal: { label: 'Personal care', icon: 'sparkles-outline', color: 'lavender' },
  other: { label: 'Other', icon: 'pricetag-outline', color: 'lavender' },
};

export const shoppingCategoryOrder: ShoppingCategory[] = [
  'produce',
  'bakery',
  'dairy',
  'meat',
  'pantry',
  'frozen',
  'drinks',
  'household',
  'personal',
  'other',
];

const keywords: [ShoppingCategory, string[]][] = [
  [
    'produce',
    [
      'apple',
      'banana',
      'berries',
      'strawberr',
      'blueberr',
      'grape',
      'orange',
      'lemon',
      'lime',
      'avocado',
      'tomato',
      'potato',
      'onion',
      'garlic',
      'carrot',
      'lettuce',
      'salad',
      'spinach',
      'broccoli',
      'cucumber',
      'pepper',
      'mushroom',
      'fruit',
      'veg',
      'herb',
      'basil',
      'zucchini',
      'courgette',
      'celery',
      'pear',
      'melon',
    ],
  ],
  ['dairy', ['milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'egg', 'cheddar', 'mozzarella']],
  ['bakery', ['bread', 'bagel', 'roll', 'bun', 'croissant', 'muffin', 'tortilla', 'wrap', 'baguette', 'cake', 'loaf']],
  [
    'meat',
    ['chicken', 'beef', 'pork', 'mince', 'sausage', 'bacon', 'ham', 'turkey', 'salmon', 'fish', 'tuna', 'shrimp', 'prawn', 'steak', 'lamb'],
  ],
  ['frozen', ['frozen', 'ice cream', 'ice', 'peas']],
  ['drinks', ['juice', 'coffee', 'tea', 'water', 'soda', 'wine', 'beer', 'lemonade', 'oat milk']],
  [
    'household',
    [
      'paper towel',
      'toilet',
      'detergent',
      'dish',
      'soap',
      'bin bag',
      'trash bag',
      'foil',
      'cling',
      'sponge',
      'bleach',
      'battery',
      'batteries',
      'light bulb',
      'cleaner',
      'laundry',
      'tissues',
    ],
  ],
  [
    'personal',
    [
      'shampoo',
      'conditioner',
      'toothpaste',
      'toothbrush',
      'deodorant',
      'razor',
      'sunscreen',
      'lotion',
      'plaster',
      'band-aid',
      'vitamin',
      'nappies',
      'diapers',
      'wipes',
    ],
  ],
  [
    'pantry',
    [
      'rice',
      'pasta',
      'flour',
      'sugar',
      'salt',
      'oil',
      'cereal',
      'oats',
      'beans',
      'sauce',
      'spice',
      'honey',
      'jam',
      'peanut butter',
      'crackers',
      'snack',
      'chips',
      'crisps',
      'nuts',
      'soup',
      'stock',
      'vinegar',
      'chocolate',
      'biscuit',
      'cookie',
      'granola',
      'lentil',
      'noodle',
    ],
  ],
];

/** Best-effort category guess from an item name. Users can always change it. */
export function guessCategory(name: string): ShoppingCategory {
  const n = name.toLowerCase();
  // Longer phrases win ("oat milk" → drinks, "ice cream" → frozen).
  let best: { cat: ShoppingCategory; len: number } | null = null;
  for (const [cat, words] of keywords) {
    for (const w of words) {
      if (n.includes(w) && (!best || w.length > best.len)) best = { cat, len: w.length };
    }
  }
  return best?.cat ?? 'other';
}

const quantityPrefix = /^(\d+(?:[.,]\d+)?\s*(?:x|kg|g|lb|lbs|l|ml|oz|pack|packs|bottles?|cans?|bags?|boxes?|dozen)?)\s+(.+)$/i;
const quantitySuffix = /^(.+?)\s+(?:x\s*(\d+)|(\d+)\s*x|\((\d+)\))$/i;

/** "2 milk" / "milk x2" / "500g mince" → { name, quantity }. */
export function parseItemInput(input: string): { name: string; quantity?: string } {
  const text = input.trim().replace(/\s+/g, ' ');
  const pre = text.match(quantityPrefix);
  if (pre) return { name: capitalise(pre[2]), quantity: pre[1].replace(/\s*x$/i, '').trim() };
  const suf = text.match(quantitySuffix);
  if (suf) return { name: capitalise(suf[1]), quantity: suf[2] ?? suf[3] ?? suf[4] };
  return { name: capitalise(text) };
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function groupItems(items: ShoppingItem[]): { category: ShoppingCategory; items: ShoppingItem[] }[] {
  return shoppingCategoryOrder
    .map((category) => ({
      category,
      items: items.filter((i) => i.category === category).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }))
    .filter((g) => g.items.length > 0);
}
